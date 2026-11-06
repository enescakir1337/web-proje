const userInfo = document.getElementById('userInfo');
const logoutBtn = document.getElementById('logoutBtn');
const vehicleForm = document.getElementById('vehicleForm');
const qrForm = document.getElementById('qrForm');
const vehicleSelect = document.getElementById('vehicleSelect');
const callNumberInput = document.getElementById('callNumberInput');
const submitQrBtn = document.getElementById('submitQrBtn');
const newQrResult = document.getElementById('newQrResult');
const vehicleList = document.getElementById('vehicleList');
const qrList = document.getElementById('qrList');
const purchasedQrList = document.getElementById('purchasedQrList');
const profileName = document.getElementById('profileName');
const profileEmail = document.getElementById('profileEmail');
const profilePlan = document.getElementById('profilePlan');
const profileVehicleList = document.getElementById('profileVehicleList');
const buyQrBtn = document.getElementById('buyQrBtn');

let globalVehicles = [];
let lanUrl = window.location.origin;

// Menü geçişleri
const menuButtons = document.querySelectorAll('.sidebar-menu button');
menuButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    switchSection(btn.dataset.section);
  });
});

function switchSection(sectionName) {
  menuButtons.forEach(b => {
    if (b.dataset.section === sectionName) {
      b.classList.add('active');
    } else {
      b.classList.remove('active');
    }
  });
  document.querySelectorAll('.dashboard-section').forEach(sec => sec.classList.remove('active'));
  const target = document.getElementById(`section-${sectionName}`);
  if (target) {
    target.classList.add('active');
  }
}

let user = JSON.parse(localStorage.getItem('user') || 'null');

if (!user || !user.id) {
  alert('Lütfen önce giriş yapın.');
  window.location.href = 'index.html';
}

function getUserPlan() {
  const u = JSON.parse(localStorage.getItem('user') || '{}');
  return u.planTier || u.plan_tier || user.planTier || user.plan_tier || 'free';
}

function setUserPlan(newPlan) {
  const u = JSON.parse(localStorage.getItem('user') || '{}');
  u.planTier = newPlan;
  u.plan_tier = newPlan;
  localStorage.setItem('user', JSON.stringify(u));
  user = u;
  if (profilePlan) profilePlan.textContent = newPlan;
}

if (userInfo) {
  userInfo.textContent = user.fullName || user.full_name || user.email || '';
}

if (profileName) profileName.textContent = user.fullName || user.full_name || '-';
if (profileEmail) profileEmail.textContent = user.email || '-';
if (profilePlan) profilePlan.textContent = getUserPlan();

if (logoutBtn) {
  logoutBtn.onclick = () => {
    localStorage.removeItem('user');
    window.location.href = 'index.html';
  };
}

// Araç seçilince telefon numarasını otomatik doldur
if (vehicleSelect && callNumberInput) {
  vehicleSelect.addEventListener('change', () => {
    const selectedId = vehicleSelect.value;
    const v = globalVehicles.find(item => String(item.id) === String(selectedId));
    if (v && v.contact_phone) {
      callNumberInput.value = v.contact_phone;
    }
  });
}

// Verileri getir
async function fetchDashboard() {
  try {
    const res = await fetch(`/api/dashboard?user_id=${user.id}`);
    const data = await res.json();
    if (data.success) {
      if (data.lanUrl) {
        lanUrl = data.lanUrl;
      }
      if (data.user) {
        if (profileName) profileName.textContent = data.user.full_name || data.user.fullName || '-';
        if (profileEmail) profileEmail.textContent = data.user.email || '-';
        if (data.user.plan_tier) {
          setUserPlan(data.user.plan_tier);
        }
        if (userInfo) userInfo.textContent = data.user.full_name || data.user.fullName || data.user.email || '';
      }
      globalVehicles = data.vehicles || [];
      renderVehicles(globalVehicles);
      renderProfileVehicles(globalVehicles);
      renderQrCodes(data.qrCodes || [], data.purchasedQrCodes || []);
    }
  } catch (e) {
    console.error('Dashboard yükleme hatası:', e);
  }
}

function renderVehicles(vehicles) {
  const currentVal = vehicleSelect.value;
  vehicleSelect.innerHTML = '<option value="">Araç seçiniz</option>';
  vehicleList.innerHTML = '';
  
  if (vehicles.length === 0) {
    vehicleSelect.innerHTML = '<option value="">Önce araç eklemelisiniz</option>';
    vehicleList.innerHTML = '<p style="color:var(--muted);">Henüz araç eklenmemiş. Lütfen yukarıdaki formdan araç ekleyin.</p>';
    return;
  }
  
  vehicles.forEach(v => {
    const opt = document.createElement('option');
    opt.value = v.id;
    opt.textContent = `${v.plate_number} ${v.brand_model ? '- ' + v.brand_model : ''}`;
    if (String(v.id) === String(currentVal)) {
      opt.selected = true;
    }
    vehicleSelect.appendChild(opt);
    
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <h4>${v.plate_number}</h4>
      <p><strong>Marka/Model:</strong> ${v.brand_model || '-'}</p>
      <p><strong>Renk:</strong> ${v.color || '-'}</p>
      <p><strong>İletişim:</strong> ${v.contact_phone || '-'}</p>
    `;
    vehicleList.appendChild(card);
  });

  // Eğer formda numara boşsa ve araç seçiliyse ilk aracın numarasını öner
  if (!callNumberInput.value && vehicles[0] && vehicles[0].contact_phone) {
    if (vehicleSelect.value) {
      const selected = vehicles.find(x => String(x.id) === String(vehicleSelect.value));
      if (selected && selected.contact_phone) {
        callNumberInput.value = selected.contact_phone;
      }
    }
  }
}

function renderProfileVehicles(vehicles) {
  if (!profileVehicleList) return;
  profileVehicleList.innerHTML = '';
  if (!vehicles || vehicles.length === 0) {
    profileVehicleList.innerHTML = '<p style="color:var(--muted);">Henüz araç eklenmemiş.</p>';
    return;
  }
  vehicles.forEach(v => {
    const card = document.createElement('div');
    card.className = 'card';
    card.style.textAlign = 'left';
    card.innerHTML = `
      <h4>${v.plate_number || '-'}</h4>
      <p><strong>Marka/Model:</strong> ${v.brand_model || '-'}</p>
      <p><strong>Renk:</strong> ${v.color || '-'}</p>
      <p><strong>İsim Soyisim:</strong> ${v.owner_name || '-'}</p>
      <p><strong>Telefon:</strong> ${v.contact_phone || '-'}</p>
      <div style="display:flex; gap:8px; margin-top:12px;">
        <button class="btn btn-outline" data-action="edit" data-id="${v.id}">Düzenle</button>
        <button class="btn btn-outline" data-action="delete" data-id="${v.id}">Sil</button>
      </div>
    `;
    profileVehicleList.appendChild(card);
  });

  profileVehicleList.querySelectorAll('button[data-action]').forEach(btn => {
    btn.onclick = async () => {
      const id = btn.getAttribute('data-id');
      if (btn.getAttribute('data-action') === 'delete') {
        if (!confirm('Aracı silmek istediğinize emin misiniz?')) return;
        try {
          const res = await fetch('/api/vehicles', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, user_id: user.id })
          });
          const result = await res.json();
          if (result.success) {
            alert('Araç silindi.');
            fetchDashboard();
          } else {
            alert('Hata: ' + result.message);
          }
        } catch (e) {
          alert('Sunucuya ulaşılamadı.');
        }
      } else if (btn.getAttribute('data-action') === 'edit') {
        const v = globalVehicles.find(x => String(x.id) === String(id));
        if (!v) return;
        const plate = prompt('Plaka', v.plate_number || '');
        if (plate === null) return;
        const brand = prompt('Marka/Model', v.brand_model || '');
        if (brand === null) return;
        const color = prompt('Renk', v.color || '');
        if (color === null) return;
        const owner = prompt('İsim Soyisim', v.owner_name || '');
        if (owner === null) return;
        const phone = prompt('Telefon', v.contact_phone || '');
        if (phone === null) return;
        try {
          const res = await fetch('/api/vehicles', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, user_id: user.id, plateNumber: plate, brandModel: brand, color, ownerName: owner, contactPhone: phone })
          });
          const result = await res.json();
          if (result.success) {
            alert('Araç bilgileri güncellendi.');
            fetchDashboard();
          } else {
            alert('Hata: ' + result.message);
          }
        } catch (e) {
          alert('Sunucuya ulaşılamadı.');
        }
      }
    };
  });
}

function getQrLinks(qrToken) {
  // Bilgisayar tarayıcısından açmak için geçerli URL
  const browserUrl = window.location.origin + '/qr.html?token=' + encodeURIComponent(qrToken || '');
  // Telefon kamerasından taranabilmesi için LAN URL (örn. 10.34.0.87:8000)
  let phoneUrl = browserUrl;
  if (lanUrl && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    phoneUrl = lanUrl + '/qr.html?token=' + encodeURIComponent(qrToken || '');
  }
  // QR kod içine gömülen veri
  const qrImgSrc = 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' + encodeURIComponent(phoneUrl);
  return { browserUrl, phoneUrl, qrImgSrc };
}

function buildQrCardHtml(qr, isSingleResult = false) {
  const token = qr.qr_token || qr.qrToken || '';
  const { browserUrl, phoneUrl, qrImgSrc } = getQrLinks(token);
  const plate = qr.plate_number || qr.plateNumber || 'Araç';
  const brand = qr.brand_model || qr.brandModel || '';
  const phone = qr.call_number || qr.callNumber || qr.contact_phone || '-';
  const scanCount = qr.scan_count || 0;

  return `
    <div class="qr-card-item ${isSingleResult ? 'printable-qr-card' : ''}" id="qr-card-${token}">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <span class="qr-badge qr-badge-active">● Aktif QR Vizite</span>
        <span style="font-size:12px; color:var(--muted);">${scanCount} kez tarandı</span>
      </div>
      <div style="text-align:center; margin:10px 0;">
        <a href="${browserUrl}" target="_blank" title="Vizite sayfasını önizlemek için tıklayın">
          <img src="${qrImgSrc}" alt="QR Kod" style="width:160px; height:160px; border-radius:12px; background:#fff; padding:10px; box-shadow:0 4px 14px rgba(0,0,0,0.2); cursor:pointer;" />
        </a>
        <p style="font-size:11px; color:var(--muted); margin-top:6px;">📱 Telefon ile okutabilirsiniz</p>
      </div>
      <h3 style="margin:0; font-size:18px;">${plate}</h3>
      ${brand ? `<p style="margin:2px 0; color:var(--muted); font-size:14px;">${brand}</p>` : ''}
      <p style="margin:4px 0; font-size:13px;"><strong>İletişim:</strong> ${phone}</p>
      <p style="margin:2px 0; font-size:11px; color:var(--muted); word-break:break-all;"><strong>Token:</strong> ${token.substring(0, 16)}...</p>

      <div class="qr-actions-grid no-print">
        <a href="${browserUrl}" target="_blank" class="btn btn-outline" style="text-align:center; font-size:13px; padding:8px 10px;">👁️ Sayfayı Aç</a>
        <button type="button" class="btn btn-outline" onclick="downloadQrImage('${qrImgSrc}', '${plate}')" style="font-size:13px; padding:8px 10px;">💾 İndir</button>
        <button type="button" class="btn btn-outline" onclick="copyQrLink('${phoneUrl}')" style="font-size:13px; padding:8px 10px;">📋 Kopyala</button>
        <button type="button" class="btn btn-primary" onclick="printQrCard('${token}')" style="font-size:13px; padding:8px 10px;">🖨️ Yazdır</button>
      </div>
    </div>
  `;
}

function renderQrCodes(qrCodes, purchasedQrCodes) {
  const allQr = purchasedQrCodes && purchasedQrCodes.length > 0 ? purchasedQrCodes : qrCodes;
  purchasedQrList.innerHTML = '';
  qrList.innerHTML = '';
  
  if (!allQr || allQr.length === 0) {
    const emptyHtml = '<p style="color:var(--muted);">Henüz QR vizit kartı oluşturulmamış. "QR Vizite Oluşturma" menüsünden aracınız için anında oluşturabilirsiniz.</p>';
    purchasedQrList.innerHTML = emptyHtml;
    qrList.innerHTML = emptyHtml;
    return;
  }
  
  allQr.forEach(qr => {
    purchasedQrList.innerHTML += buildQrCardHtml(qr);
  });
  
  (qrCodes || []).forEach(qr => {
    qrList.innerHTML += buildQrCardHtml(qr);
  });
}

// Yardımcı Aksiyon Fonksiyonları
window.copyQrLink = (url) => {
  navigator.clipboard.writeText(url).then(() => {
    alert('QR vizite linki panoya kopyalandı:\n' + url);
  }).catch(() => {
    prompt('QR linkini kopyalayabilirsiniz:', url);
  });
};

window.downloadQrImage = (imgUrl, plate) => {
  const link = document.createElement('a');
  link.href = imgUrl;
  link.download = `66Vizite-${plate || 'QR'}.png`;
  link.target = '_blank';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

window.printQrCard = (token) => {
  const card = document.getElementById(`qr-card-${token}`);
  if (!card) {
    window.print();
    return;
  }
  // Sadece bu kartı print alanına hazırla
  document.querySelectorAll('.printable-qr-card').forEach(el => el.classList.remove('printable-qr-card'));
  card.classList.add('printable-qr-card');
  window.print();
  card.classList.remove('printable-qr-card');
};

// Araç Ekleme Formu
vehicleForm.onsubmit = async (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(vehicleForm));
  data.user_id = user.id;
  try {
    const res = await fetch('/api/vehicles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const result = await res.json();
    if (result.success) {
      alert('Araç başarıyla eklendi.');
      vehicleForm.reset();
      await fetchDashboard();
      // Kullanıcıyı QR vizite oluşturmaya yönlendir
      if (confirm('Araç eklendi! Şimdi bu araç için QR Vizite Kartı oluşturmak ister misiniz?')) {
        switchSection('qr-create');
        if (result.vehicle && result.vehicle.id) {
          vehicleSelect.value = result.vehicle.id;
        }
      }
    } else {
      alert('Hata: ' + result.message);
    }
  } catch (err) {
    alert('Sunucuya ulaşılamadı.');
  }
};

// QR Vizite Oluşturma Formu
qrForm.onsubmit = async (e) => {
  e.preventDefault();
  
  if (globalVehicles.length === 0) {
    alert('QR kod oluşturabilmek için önce bir araç eklemeniz gerekmektedir.');
    switchSection('vehicles');
    return;
  }

  let plan = getUserPlan();
  if (plan === 'free') {
    const upgrade = confirm('QR vizite oluşturmak için paketinizin aktif olması gerekmektedir.\n\nŞimdi Pro paketinizi ücretsiz aktifleştirmek ister misiniz?');
    if (!upgrade) {
      return;
    }
    // Pro paketi otomatik aktifleştir
    try {
      await fetch('/api/user/update-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id, plan: 'pro' })
      });
      setUserPlan('pro');
    } catch (err) {
      console.warn('Plan güncelleme hatası:', err);
    }
  }

  const data = Object.fromEntries(new FormData(qrForm));
  if (!data.vehicleId) {
    alert('Lütfen bir araç seçiniz.');
    return;
  }

  if (submitQrBtn) {
    submitQrBtn.disabled = true;
    submitQrBtn.textContent = 'QR Vizite Kartı Oluşturuluyor...';
  }

  try {
    const res = await fetch('/api/qr-codes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        vehicle_id: data.vehicleId,
        callNumber: data.callNumber,
        autoMessage: data.autoMessage
      })
    });
    const result = await res.json();

    if (result.success && result.qrCode) {
      const newQr = result.qrCode;
      
      // Formun altına başarı kutusu ve anlık önizleme göster
      if (newQrResult) {
        newQrResult.style.display = 'block';
        newQrResult.innerHTML = `
          <div class="card" style="border: 2px solid #10b981; background: rgba(16, 185, 129, 0.05); padding: 24px;">
            <div style="display:flex; align-items:center; gap:10px; margin-bottom:16px;">
              <span style="font-size:24px;">🎉</span>
              <div>
                <h3 style="margin:0; color:#10b981;">Tebrikler! QR Vizite Kartınız Oluşturuldu</h3>
                <p style="margin:0; font-size:14px; color:var(--muted);">Kartınızı test edebilir, indirebilir veya hemen yazdırabilirsiniz.</p>
              </div>
            </div>
            <div style="max-width:340px; margin:0 auto;">
              ${buildQrCardHtml(newQr, true)}
            </div>
            <div style="text-align:center; margin-top:20px;">
              <button class="btn btn-outline" type="button" onclick="switchSection('qr-purchased')">Tüm Kartlarımı Görüntüle →</button>
            </div>
          </div>
        `;
        // Görünmesi için kaydır
        newQrResult.scrollIntoView({ behavior: 'smooth' });
      }

      await fetchDashboard();
    } else {
      alert('Hata: ' + (result.message || 'QR vizite oluşturulamadı.'));
    }
  } catch (err) {
    alert('Sunucuya ulaşılamadı. Lütfen sunucunun çalıştığından emin olun.');
  } finally {
    if (submitQrBtn) {
      submitQrBtn.disabled = false;
      submitQrBtn.textContent = 'QR Vizit Kartı Oluştur';
    }
  }
};

// Paket Satın Alma Butonu
if (buyQrBtn) {
  buyQrBtn.onclick = async () => {
    try {
      const res = await fetch('/api/user/update-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id, plan: 'pro' })
      });
      const result = await res.json();
      if (result.success) {
        setUserPlan('pro');
        alert('Tebrikler! Pro QR Vizite Paketi başarıyla hesabınıza tanımlandı.');
        await fetchDashboard();
        switchSection('qr-create');
      } else {
        alert('Hata: ' + result.message);
      }
    } catch (e) {
      alert('İşlem sırasında bir hata oluştu.');
    }
  };
}

// Başlangıçta verileri çek
fetchDashboard();
