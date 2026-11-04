const userInfo = document.getElementById('userInfo');
const logoutBtn = document.getElementById('logoutBtn');
const vehicleForm = document.getElementById('vehicleForm');
const qrForm = document.getElementById('qrForm');
const vehicleSelect = document.getElementById('vehicleSelect');
const vehicleList = document.getElementById('vehicleList');
const qrList = document.getElementById('qrList');
const purchasedQrList = document.getElementById('purchasedQrList');
const profileName = document.getElementById('profileName');
const profileEmail = document.getElementById('profileEmail');
const profilePlan = document.getElementById('profilePlan');
const profileVehicleList = document.getElementById('profileVehicleList');

const menuButtons = document.querySelectorAll('.sidebar-menu button');
menuButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    menuButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.dashboard-section').forEach(sec => sec.classList.remove('active'));
    const section = document.getElementById(`section-${btn.dataset.section}`);
    if (section) {
      section.classList.add('active');
    }
  });
});

let user = JSON.parse(localStorage.getItem('user') || 'null');

if (!user || !user.id) {
  alert('Lütfen önce giriş yapın.');
  window.location.href = 'index.html';
}

function getUserPlan() {
  const u = JSON.parse(localStorage.getItem('user') || '{}');
  return u.planTier || u.plan_tier || user.planTier || user.plan_tier || 'free';
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

async function fetchDashboard() {
  try {
    const res = await fetch(`/api/dashboard?user_id=${user.id}`);
    const data = await res.json();
    if (data.success) {
      if (data.user) {
        if (profileName) profileName.textContent = data.user.full_name || data.user.fullName || '-';
        if (profileEmail) profileEmail.textContent = data.user.email || '-';
        const currentPlan = getUserPlan();
        if (profilePlan) profilePlan.textContent = currentPlan;
        if (userInfo) userInfo.textContent = data.user.full_name || data.user.fullName || data.user.email || '';
      }
      renderVehicles(data.vehicles || []);
      if (profileVehicleList) {
        profileVehicleList.innerHTML = '';
        if (!data.vehicles || data.vehicles.length === 0) {
          profileVehicleList.innerHTML = '<p>Henüz araç eklenmemiş.</p>';
        } else {
          data.vehicles.forEach(v => {
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
                const v = data.vehicles.find(x => String(x.id) === String(id));
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
      }
      renderQrCodes(data.qrCodes || [], data.purchasedQrCodes || []);
      if (profilePlan) profilePlan.textContent = getUserPlan();
    }
  } catch (e) {
    console.error(e);
  }
}

function renderVehicles(vehicles) {
  vehicleSelect.innerHTML = '<option value="">Araç seçiniz</option>';
  vehicleList.innerHTML = '';
  
  if (vehicles.length === 0) {
    vehicleList.innerHTML = '<p>Henüz araç eklenmemiş.</p>';
    return;
  }
  
  vehicles.forEach(v => {
    const opt = document.createElement('option');
    opt.value = v.id;
    opt.textContent = `${v.plate_number} ${v.brand_model ? '- ' + v.brand_model : ''}`;
    vehicleSelect.appendChild(opt);
    
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <h4>${v.plate_number}</h4>
      <p>${v.brand_model || ''} ${v.color ? '(' + v.color + ')' : ''}</p>
    `;
    vehicleList.appendChild(card);
  });
}

function renderQrCodes(qrCodes, purchasedQrCodes) {
  const allQr = purchasedQrCodes && purchasedQrCodes.length > 0 ? purchasedQrCodes : qrCodes;
  purchasedQrList.innerHTML = '';
  qrList.innerHTML = '';
  
  if (!allQr || allQr.length === 0) {
    purchasedQrList.innerHTML = '<p>Henüz QR vizit kartı oluşturulmamış.</p>';
    qrList.innerHTML = '<p>Henüz QR vizit kartı oluşturulmamış.</p>';
    return;
  }
  
  allQr.forEach(qr => {
    const card = document.createElement('div');
    card.className = 'card';
    const qrUrl = window.location.origin + '/qr.html?token=' + encodeURIComponent(qr.qr_token || '');
    const qrImg = 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=' + encodeURIComponent(qrUrl);
    card.innerHTML = `
      <h4>QR Vizit Kartı</h4>
      <div style="text-align:center; margin:12px 0;">
        <img src="${qrImg}" alt="QR Kod" style="border-radius:8px; background:#fff; padding:8px;" />
      </div>
      <p><strong>Plaka:</strong> ${qr.plate_number || '-'}</p>
      <p><strong>QR Token:</strong> ${(qr.qr_token || '').substring(0, 16)}...</p>
      <p><strong>Arama Numarası:</strong> ${qr.call_number || '-'}</p>
      <p><strong>Durum:</strong> ${qr.is_active == 1 ? 'Aktif' : 'Pasif'}</p>
      <button class="btn btn-primary btn-full" type="button" onclick="window.print()">QR Kodunu Yazdır</button>
    `;
    purchasedQrList.appendChild(card);
  });
  
  (qrCodes || []).forEach(qr => {
    const card = document.createElement('div');
    card.className = 'card';
    const qrUrl = window.location.origin + '/qr.html?token=' + encodeURIComponent(qr.qr_token || '');
    const qrImg = 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=' + encodeURIComponent(qrUrl);
    card.innerHTML = `
      <h4>QR Vizit Kartı</h4>
      <div style="text-align:center; margin:12px 0;">
        <img src="${qrImg}" alt="QR Kod" style="border-radius:8px; background:#fff; padding:8px;" />
      </div>
      <p><strong>Plaka:</strong> ${qr.plate_number || '-'}</p>
      <p><strong>QR Token:</strong> ${(qr.qr_token || '').substring(0, 16)}...</p>
      <p><strong>Arama Numarası:</strong> ${qr.call_number || '-'}</p>
      <p><strong>Durum:</strong> ${qr.is_active == 1 ? 'Aktif' : 'Pasif'}</p>
      <button class="btn btn-primary btn-full" type="button" onclick="window.print()">QR Kodunu Yazdır</button>
    `;
    qrList.appendChild(card);
  });
}

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
    } else {
      alert('Hata: ' + result.message);
    }
  } catch (err) {
    alert('Sunucuya ulaşılamadı.');
  }
};

qrForm.onsubmit = async (e) => {
  e.preventDefault();
  const plan = getUserPlan();
  if (plan === 'free') {
    alert('QR vizite oluşturmak için paket satın almanız gerekmektedir. Lütfen paket satın alın.');
    return;
  }
  const data = Object.fromEntries(new FormData(qrForm));
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
    if (result.success) {
      alert('QR vizit kartı başarıyla oluşturuldu.');
      fetchDashboard();
    } else {
      alert('Hata: ' + result.message);
    }
  } catch (err) {
    alert('Sunucuya ulaşılamadı.');
  }
};

const buyQrBtn = document.getElementById('buyQrBtn');
if (buyQrBtn) {
  buyQrBtn.onclick = async () => {
    const currentPlan = getUserPlan();
    if (currentPlan === 'pro') {
      alert('Zaten Pro üyeliğiniz bulunmaktadır.');
      return;
    }
    const cardNumber = prompt('Kart Numarası (16 haneli)');
    if (cardNumber === null) return;
    const expiry = prompt('Son Kullanma Tarihi (MM/YY)');
    if (expiry === null) return;
    const cvv = prompt('CVV');
    if (cvv === null) return;
    alert('Satın alma işlemi başarıyla tamamlandı.');
    try {
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      const updatedUser = { ...currentUser, planTier: 'pro', plan_tier: 'pro' };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      user = updatedUser;
      try {
        await fetch('/api/user/update-plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: user.id, plan: 'pro' })
        });
      } catch (e) {}
    } catch (e) {}
    if (profilePlan) profilePlan.textContent = 'pro';
    if (userInfo) userInfo.textContent = user.fullName || user.full_name || user.email || userInfo.textContent;
    await fetchDashboard();
    if (profilePlan) profilePlan.textContent = getUserPlan();
  };
}

fetchDashboard();
