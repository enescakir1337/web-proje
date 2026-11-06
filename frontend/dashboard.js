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
const profileName = document.getElementById('profileName');
const profileEmail = document.getElementById('profileEmail');
const profilePlan = document.getElementById('profilePlan');
const profileVehicleList = document.getElementById('profileVehicleList');
const profileForm = document.getElementById('profileForm');
const passwordForm = document.getElementById('passwordForm');
const buyQrBtn = document.getElementById('buyQrBtn');

let globalVehicles = [];
let lanUrl = window.location.origin;
let editingVehicleId = null;

function escapeHtml(value) {
  const replacements = {
    '&' : '\u0026amp;',
    '<' : '\u0026lt;',
    '>' : '\u0026gt;',
    '"' : '\u0026quot;',
    "'" : '\u0026#39;'
  };
  return String(value ?? '').replace(/[&<>"']/g, (ch) => replacements[ch]);
}

// Menü geçişleri
const menuButtons = document.querySelectorAll('.panel-menu button');
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
  document.querySelectorAll('.panel-section').forEach(sec => sec.classList.remove('active'));
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
  return u.planTier || u.plan_tier || 'free';
}

function setUserPlan(newPlan) {
  const u = JSON.parse(localStorage.getItem('user') || '{}');
  u.planTier = newPlan;
  u.plan_tier = newPlan;
  localStorage.setItem('user', JSON.stringify(u));
  user = u;
  if (profilePlan) profilePlan.textContent = newPlan;
}

function storageUserFromServer(srvUser) {
  const u = JSON.parse(localStorage.getItem('user') || '{}');
  u.id = srvUser.id;
  u.fullName = srvUser.full_name;
  u.full_name = srvUser.full_name;
  u.email = srvUser.email;
  u.planTier = srvUser.plan_tier;
  u.plan_tier = srvUser.plan_tier;
  u.role = srvUser.role;
  u.phoneNumber = srvUser.phone_number;
  localStorage.setItem('user', JSON.stringify(u));
  user = u;
}

function handleUnauthorized() {
  alert('Oturumunuz sona erdi. Lütfen tekrar giriş yapın.');
  localStorage.removeItem('user');
  window.location.href = 'index.html';
}

if (userInfo) {
  userInfo.textContent = user.fullName || user.full_name || user.email || '';
}

if (logoutBtn) {
  logoutBtn.onclick = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {
      console.warn('Oturum kapatma isteği gönderilemedi.', e);
    }
    localStorage.removeItem('user');
    window.location.href = 'index.html';
  };
}

// QR görselini internet olmadan üret (vendor/qrcode.min.js)
function qrPngDataUrl(text, cellSize = 6, marginCells = 4) {
  const qr = qrcode(0, 'M');
  qr.addData(text);
  qr.make();
  const count = qr.getModuleCount();
  const size = (count + marginCells * 2) * cellSize;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = '#000000';
  for (let row = 0; row < count; row++) {
    for (let col = 0; col < count; col++) {
      if (qr.isDark(row, col)) {
        ctx.fillRect((marginCells + col) * cellSize, (marginCells + row) * cellSize, cellSize, cellSize);
      }
    }
  }
  return canvas.toDataURL('image/png');
}

function renkGorselHtml(renkAdi) {
  const ad = String(renkAdi ?? '').trim();
  if (ad === '') return '-';
  const kod = aracRenkKodu(ad);
  if (kod === null) return escapeHtml(ad);
  return '<span class="renk-dot" style="background:' + kod + '"></span>' + escapeHtml(ad);
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
    const res = await fetch('/api/dashboard');
    if (res.status === 401) {
      handleUnauthorized();
      return;
    }
    const data = await res.json();
    if (data.success) {
      if (data.lanUrl) {
        lanUrl = data.lanUrl;
      }
      if (data.user) {
        storageUserFromServer(data.user);
        if (profileName) profileName.textContent = data.user.full_name || '-';
        if (profileEmail) profileEmail.textContent = data.user.email || '-';
        if (profilePlan) profilePlan.textContent = data.user.plan_tier || 'free';
        if (userInfo) userInfo.textContent = data.user.full_name || data.user.email || '';
        const nameInput = document.getElementById('profileFullNameInput');
        const phoneInput = document.getElementById('profilePhoneInput');
        const occInput = document.getElementById('profileOccupationInput');
        if (nameInput && document.activeElement !== nameInput) nameInput.value = data.user.full_name || '';
        if (phoneInput && document.activeElement !== phoneInput) phoneInput.value = data.user.phone_number || '';
        if (occInput && document.activeElement !== occInput) occInput.value = data.user.occupation || '';
      }
      globalVehicles = data.vehicles || [];
      renderVehicles(globalVehicles);
      renderProfileVehicles(globalVehicles);
      renderQrCodes(data.qrCodes || []);
    }
  } catch (e) {
    console.error('Dashboard yükleme hatası:', e);
    alert('Sunucuya ulaşılamadı. Lütfen sunucunun çalıştığından emin olun.');
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
    opt.textContent = `${escapeHtml(v.plate_number)} ${v.brand_model ? '- ' + escapeHtml(v.brand_model) : ''}`;
    if (String(v.id) === String(currentVal)) {
      opt.selected = true;
    }
    vehicleSelect.appendChild(opt);

    const wrapper = document.createElement('div');
    wrapper.innerHTML = buildVehicleCardHtml(v);
    vehicleList.appendChild(wrapper.firstElementChild);
  });

  if (!callNumberInput.value && vehicles[0] && vehicles[0].contact_phone) {
    if (vehicleSelect.value) {
      const selected = vehicles.find(x => String(x.id) === String(vehicleSelect.value));
      if (selected && selected.contact_phone) {
        callNumberInput.value = selected.contact_phone;
      }
    }
  }
}

function buildVehicleCardHtml(v, opts = {}) {
  const id = Number(v.id);
  const editing = opts.editing === true;
  const withActions = opts.withActions === true;

  if (editing) {
    return `
      <div class="card veh-card">
        <h4>${escapeHtml(v.plate_number || '')}</h4>
        <form data-edit-form="${id}">
          <label>Plaka<input type="text" name="plateNumber" maxlength="20" value="${escapeHtml(v.plate_number || '')}" required></label>
          <label>Marka/Model<input type="text" name="brandModel" value="${escapeHtml(v.brand_model || '')}"></label>
          <label>Renk<select name="color">${aracRenkSecenekleri(v.color, 'Renk seçilmedi')}</select></label>
          <label>İsim Soyisim<input type="text" name="ownerName" value="${escapeHtml(v.owner_name || '')}"></label>
          <label>Telefon<input type="tel" name="contactPhone" value="${escapeHtml(v.contact_phone || '')}"></label>
          <div class="row-actions" style="margin-top: 8px;">
            <button type="submit" class="btn btn-primary btn-sm">Kaydet</button>
            <button type="button" class="btn btn-outline btn-sm" data-action="cancel-edit">Vazgeç</button>
          </div>
        </form>
      </div>
    `;
  }

  return `
    <div class="card veh-card">
      <h4>${escapeHtml(v.plate_number || '-')}</h4>
      <p><strong>Marka/Model</strong><span>${escapeHtml(v.brand_model || '-')}</span></p>
      <p><strong>Renk</strong><span>${renkGorselHtml(v.color)}</span></p>
      <p><strong>İsim Soyisim</strong><span>${escapeHtml(v.owner_name || '-')}</span></p>
      <p><strong>Telefon</strong><span>${escapeHtml(v.contact_phone || '-')}</span></p>
      ${withActions ? `
      <div class="row-actions" style="margin-top: 14px;">
        <button class="btn btn-outline btn-sm" data-action="edit" data-id="${id}">Düzenle</button>
        <button class="btn btn-outline btn-sm" data-action="delete" data-id="${id}">Sil</button>
      </div>` : ''}
    </div>
  `;
}

function renderProfileVehicles(vehicles) {
  if (!profileVehicleList) return;
  profileVehicleList.innerHTML = '';
  if (!vehicles || vehicles.length === 0) {
    profileVehicleList.innerHTML = '<p style="color:var(--muted);">Henüz araç eklenmemiş.</p>';
    return;
  }
  vehicles.forEach(v => {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = buildVehicleCardHtml(v, { editing: editingVehicleId === Number(v.id), withActions: true });
    profileVehicleList.appendChild(wrapper.firstElementChild);
  });
}

profileVehicleList.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-action]');
  if (!btn) return;
  const action = btn.getAttribute('data-action');

  if (action === 'edit') {
    editingVehicleId = Number(btn.getAttribute('data-id'));
    renderProfileVehicles(globalVehicles);
  } else if (action === 'cancel-edit') {
    editingVehicleId = null;
    renderProfileVehicles(globalVehicles);
  } else if (action === 'delete') {
    const id = Number(btn.getAttribute('data-id'));
    const v = globalVehicles.find(x => Number(x.id) === id);
    if (!confirm(`"${v ? v.plate_number : id}" plakalı araç silinecek.\n\nBu araca bağlı TÜM QR kartlar da kalıcı olarak silinir.\n\nOnaylıyor musunuz?`)) {
      return;
    }
    (async () => {
      try {
        const res = await fetch('/api/vehicles', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ vehicle_id: id })
        });
        if (res.status === 401) return handleUnauthorized();
        const result = await res.json();
        if (result.success) {
          alert('Araç ve bağlı QR kartları silindi.');
          fetchDashboard();
        } else {
          alert('Hata: ' + result.message);
        }
      } catch (err) {
        alert('Sunucuya ulaşılamadı.');
      }
    })();
  }
});

profileVehicleList.addEventListener('submit', async (e) => {
  const form = e.target.closest('form[data-edit-form]');
  if (!form) return;
  e.preventDefault();
  const id = Number(form.getAttribute('data-edit-form'));
  const data = Object.fromEntries(new FormData(form));
  try {
    const res = await fetch('/api/vehicles', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vehicle_id: id,
        plateNumber: data.plateNumber,
        brandModel: data.brandModel,
        color: data.color,
        ownerName: data.ownerName,
        contactPhone: data.contactPhone
      })
    });
    if (res.status === 401) return handleUnauthorized();
    const result = await res.json();
    if (result.success) {
      editingVehicleId = null;
      alert('Araç bilgileri güncellendi.');
      fetchDashboard();
    } else {
      alert('Hata: ' + result.message);
    }
  } catch (err) {
    alert('Sunucuya ulaşılamadı.');
  }
});

function getQrLinks(qrToken) {
  const browserUrl = window.location.origin + '/qr.html?token=' + encodeURIComponent(qrToken || '');
  let phoneUrl = browserUrl;
  if (lanUrl && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    phoneUrl = lanUrl + '/qr.html?token=' + encodeURIComponent(qrToken || '');
  }
  return { browserUrl, phoneUrl };
}

function buildQrCardHtml(qr, isSingleResult = false) {
  const token = qr.qr_token || qr.qrToken || '';
  const qrId = Number(qr.id || 0);
  const isActive = Number(qr.is_active ?? qr.isActive ?? 1) === 1;
  const { browserUrl, phoneUrl } = getQrLinks(token);
  const plate = qr.plate_number || qr.plateNumber || 'Araç';
  const brand = qr.brand_model || qr.brandModel || '';
  const phone = qr.call_number || qr.callNumber || qr.contact_phone || '-';
  const scanCount = Number(qr.scan_count || 0);
  const qrImgSrc = qrPngDataUrl(phoneUrl);

  const badge = isActive
    ? '<span class="qr-badge qr-badge-active">● Aktif QR Vizit</span>'
    : '<span class="qr-badge qr-badge-inactive">○ Devre Dışı</span>';

  return `
    <div class="qr-card-item ${isSingleResult ? 'printable-qr-card' : ''}" id="qr-card-${escapeHtml(token)}">
      <div class="qr-card-top">
        ${badge}
        <span class="qr-meta">${scanCount} kez tarandı</span>
      </div>
      <div class="qr-visual">
        <a href="${browserUrl}" target="_blank" rel="noopener" title="Vizit sayfasını önizlemek için tıklayın">
          <img src="${qrImgSrc}" alt="QR Kod" />
        </a>
        <p>Telefon ile okutabilirsiniz</p>
      </div>
      <h3 class="qr-plate">${escapeHtml(plate)}</h3>
      ${brand ? `<p class="qr-brand">${escapeHtml(brand)}</p>` : ''}
      <p class="qr-line"><strong>İletişim:</strong> ${escapeHtml(phone)}</p>
      <p class="qr-token"><strong>Token:</strong> <span class="no-print">${escapeHtml(token.substring(0, 16))}...</span></p>

      <div class="qr-actions-grid no-print">
        <a href="${browserUrl}" target="_blank" rel="noopener" class="btn btn-outline">Sayfayı Aç</a>
        <button type="button" class="btn btn-outline" data-qr-action="download" data-token="${escapeHtml(token)}" data-plate="${escapeHtml(plate)}">İndir</button>
        <button type="button" class="btn btn-outline" data-qr-action="copy" data-token="${escapeHtml(token)}">Kopyala</button>
        <button type="button" class="btn btn-outline" data-qr-action="print" data-token="${escapeHtml(token)}">Yazdır</button>
        <button type="button" class="btn btn-outline" data-qr-action="toggle" data-id="${qrId}" data-active="${isActive ? 1 : 0}">${isActive ? 'Devre Dışı Bırak' : 'Etkinleştir'}</button>
        <button type="button" class="btn btn-outline" data-qr-action="rotate" data-id="${qrId}">Bağlantıyı Yenile</button>
        <button type="button" class="btn btn-outline" data-qr-action="delete" data-id="${qrId}">Sil</button>
      </div>
    </div>
  `;
}

function renderQrCodes(qrCodes) {
  qrList.innerHTML = '';
  if (!qrCodes || qrCodes.length === 0) {
    qrList.innerHTML = '<p style="color:var(--muted);">Henüz QR vizit kartı oluşturulmamış. "QR Vizite Oluşturma" menüsünden aracınız için anında oluşturabilirsiniz.</p>';
    return;
  }
  qrCodes.forEach(qr => {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = buildQrCardHtml(qr);
    qrList.appendChild(wrapper.firstElementChild);
  });
}

// QR kartı aksiyonları (olay delegasyonu)
function findQrContainer(e) {
  return qrList.contains(e.target) || (newQrResult && newQrResult.contains(e.target));
}

async function qrActionToggle(btn) {
  const qrId = Number(btn.getAttribute('data-id'));
  const nextActive = btn.getAttribute('data-active') === '1' ? 0 : 1;
  if (nextActive === 0 && !confirm('Bu QR kartı devre dışı bırakılacak. Tarama yapanlar artık bu linke ulaşamaz. Onaylıyor musunuz?')) {
    return;
  }
  try {
    const res = await fetch('/api/qr-codes', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: qrId, action: 'toggle', is_active: nextActive })
    });
    if (res.status === 401) return handleUnauthorized();
    const result = await res.json();
    if (result.success) {
      alert(result.message);
      await fetchDashboard();
    } else {
      alert('Hata: ' + result.message);
    }
  } catch (err) {
    alert('Sunucuya ulaşılamadı.');
  }
}

async function qrActionRotate(btn) {
  const qrId = Number(btn.getAttribute('data-id'));
  if (!confirm('QR bağlantısı yenilenecek. Daha önce basılmış/baskıda olan eski kartlar ÇALIŞMAYACAK. Onaylıyor musunuz?')) {
    return;
  }
  try {
    const res = await fetch('/api/qr-codes', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: qrId, action: 'rotate' })
    });
    if (res.status === 401) return handleUnauthorized();
    const result = await res.json();
    if (result.success) {
      alert(result.message);
      await fetchDashboard();
    } else {
      alert('Hata: ' + result.message);
    }
  } catch (err) {
    alert('Sunucuya ulaşılamadı.');
  }
}

async function qrActionDelete(btn) {
  const qrId = Number(btn.getAttribute('data-id'));
  if (!confirm('Bu QR kartı kalıcı olarak silinecek. Onaylıyor musunuz?')) {
    return;
  }
  try {
    const res = await fetch('/api/qr-codes', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: qrId })
    });
    if (res.status === 401) return handleUnauthorized();
    const result = await res.json();
    if (result.success) {
      alert(result.message);
      await fetchDashboard();
    } else {
      alert('Hata: ' + result.message);
    }
  } catch (err) {
    alert('Sunucuya ulaşılamadı.');
  }
}

function qrActionDownload(btn) {
  const token = btn.getAttribute('data-token');
  const plate = btn.getAttribute('data-plate') || 'QR';
  const { phoneUrl } = getQrLinks(token);
  const dataUrl = qrPngDataUrl(phoneUrl, 10, 8);
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = `66Vizite-${plate}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function qrActionCopy(btn) {
  const token = btn.getAttribute('data-token');
  const { phoneUrl } = getQrLinks(token);
  navigator.clipboard.writeText(phoneUrl).then(() => {
    alert('QR vizite linki panoya kopyalandı:\n' + phoneUrl);
  }).catch(() => {
    prompt('QR linkini kopyalayabilirsiniz:', phoneUrl);
  });
}

function qrActionPrint(btn) {
  const token = btn.getAttribute('data-token');
  const card = document.getElementById(`qr-card-${token}`);
  if (!card) {
    window.print();
    return;
  }
  document.querySelectorAll('.printable-qr-card').forEach(el => el.classList.remove('printable-qr-card'));
  card.classList.add('printable-qr-card');
  window.print();
  card.classList.remove('printable-qr-card');
}

document.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-qr-action]');
  if (!btn || !findQrContainer(e)) return;
  const action = btn.getAttribute('data-qr-action');
  if (action === 'toggle') qrActionToggle(btn);
  else if (action === 'rotate') qrActionRotate(btn);
  else if (action === 'delete') qrActionDelete(btn);
  else if (action === 'download') qrActionDownload(btn);
  else if (action === 'copy') qrActionCopy(btn);
  else if (action === 'print') qrActionPrint(btn);
});

// Araç Ekleme Formu
vehicleForm.onsubmit = async (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(vehicleForm));
  try {
    const res = await fetch('/api/vehicles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (res.status === 401) return handleUnauthorized();
    const result = await res.json();
    if (result.success) {
      alert('Araç başarıyla eklendi.');
      vehicleForm.reset();
      await fetchDashboard();
      if (confirm('Araç eklendi! Şimdi bu araç için QR Vizite Kartı oluşturmak ister misiniz?')) {
        switchSection('qr-create');
        if (result.vehicle && result.vehicle.id) {
          vehicleSelect.value = result.vehicle.id;
          vehicleSelect.dispatchEvent(new Event('change'));
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
    try {
      const res = await fetch('/api/user/update-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: 'pro' })
      });
      const result = await res.json();
      if (!result.success) {
        alert('Hata: ' + result.message);
        return;
      }
      setUserPlan('pro');
    } catch (err) {
      alert('Sunucuya ulaşılamadı.');
      return;
    }
  }

  const data = Object.fromEntries(new FormData(qrForm));
  if (!data.vehicleId) {
    alert('Lütfen bir araç seçiniz.');
    return;
  }

  if (submitQrBtn) {
    submitQrBtn.disabled = true;
    submitQrBtn.textContent = 'QR Vizit Kartı Oluşturuluyor...';
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
    if (res.status === 401) return handleUnauthorized();
    const result = await res.json();

    if (result.success && result.qrCode) {
      const newQr = result.qrCode;

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
              <button class="btn btn-outline" type="button" onclick="switchSection('qr-all');document.getElementById('section-qr-all').scrollIntoView({behavior:'smooth'});">Tüm Kartlarımı Görüntüle →</button>
            </div>
          </div>
        `;
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

// Profil Bilgileri Formu
profileForm.onsubmit = async (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(profileForm));
  try {
    const res = await fetch('/api/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: data.fullName,
        phoneNumber: data.phoneNumber,
        occupation: data.occupation
      })
    });
    if (res.status === 401) return handleUnauthorized();
    const result = await res.json();
    if (result.success) {
      alert(result.message);
      await fetchDashboard();
    } else {
      alert('Hata: ' + result.message);
    }
  } catch (err) {
    alert('Sunucuya ulaşılamadı.');
  }
};

// Şifre Değiştirme Formu
passwordForm.onsubmit = async (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(passwordForm));
  try {
    const res = await fetch('/api/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword
      })
    });
    if (res.status === 401) return handleUnauthorized();
    const result = await res.json();
    if (result.success) {
      passwordForm.reset();
      alert(result.message);
    } else {
      alert('Hata: ' + result.message);
    }
  } catch (err) {
    alert('Sunucuya ulaşılamadı.');
  }
};

// Paket Satın Alma Butonu
if (buyQrBtn) {
  buyQrBtn.onclick = async () => {
    try {
      const res = await fetch('/api/user/update-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: 'pro' })
      });
      if (res.status === 401) return handleUnauthorized();
      const result = await res.json();
      if (result.success) {
        setUserPlan('pro');
        alert('Tebrikler! Pro QR Vizite Paketi hesabınıza tanımlandı.');
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

const vehicleColorSelect = document.getElementById('vehicleColorSelect');
if (vehicleColorSelect) {
  vehicleColorSelect.innerHTML = aracRenkSecenekleri('', 'Renk seçilmedi');
}

// Başlangıçta verileri çek
fetchDashboard();
