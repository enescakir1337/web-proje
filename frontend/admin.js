const adminInfo = document.getElementById('adminInfo');
const logoutBtn = document.getElementById('logoutBtn');
const usersList = document.getElementById('usersList');
const statUsers = document.getElementById('statUsers');
const statVehicles = document.getElementById('statVehicles');
const statActiveQr = document.getElementById('statActiveQr');
const statScans = document.getElementById('statScans');

const user = JSON.parse(localStorage.getItem('user') || 'null');

if (!user || !user.id) {
  alert('Lütfen önce giriş yapın.');
  window.location.href = 'index.html';
}

if ((user.role || 'user') !== 'admin') {
  alert('Bu sayfaya erişim yetkiniz yok.');
  window.location.href = 'dashboard.html';
}

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

function handleUnauthorized() {
  alert('Oturumunuz sona erdi. Lütfen tekrar giriş yapın.');
  localStorage.removeItem('user');
  window.location.href = 'index.html';
}

if (adminInfo) {
  adminInfo.textContent = user.fullName || user.email || '';
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

function setStats(stats) {
  if (statUsers) statUsers.textContent = stats.userCount ?? '-';
  if (statVehicles) statVehicles.textContent = stats.vehicleCount ?? '-';
  if (statActiveQr) statActiveQr.textContent = stats.activeQrCount ?? '-';
  if (statScans) statScans.textContent = stats.totalScans ?? '-';
  const countLabel = document.getElementById('userCountLabel');
  if (countLabel && stats.userCount !== undefined) countLabel.textContent = stats.userCount;
}

function buildUserRow(u) {
  const uid = Number(u.id);
  const self = uid === Number(user.id);
  const role = u.role || 'user';
  const plan = u.plan_tier || 'free';
  const roleOptions = ['user', 'member', 'business', 'admin']
    .map(r => `<option value="${r}" ${r === role ? 'selected' : ''}>${r}</option>`)
    .join('');
  const planOptions = ['free', 'pro', 'business']
    .map(p => `<option value="${p}" ${p === plan ? 'selected' : ''}>${p}</option>`)
    .join('');
  const roleCell = self
    ? `<span>${escapeHtml(role)}</span>`
    : `<select data-field="role" data-user="${uid}">${roleOptions}</select>`;
  const planCell = self
    ? `<span>${escapeHtml(plan)}</span>`
    : `<select data-field="plan" data-user="${uid}">${planOptions}</select>`;
  const actions = self
    ? '<span style="color: var(--muted); font-size: 0.82rem;">(Siz)</span>'
    : `<div class="row-actions">
        <button class="btn btn-primary btn-sm" data-action="update" data-user="${uid}">Kaydet</button>
        <button class="btn btn-outline btn-sm" data-action="delete" data-user="${uid}">Sil</button>
      </div>`;

  return `<tr>
    <td>${uid}</td>
    <td>${escapeHtml(u.full_name || '-')}</td>
    <td>${escapeHtml(u.email || '-')}</td>
    <td>${roleCell}</td>
    <td>${planCell}</td>
    <td>${actions}</td>
  </tr>`;
}

async function loadUsers() {
  try {
    const res = await fetch('/api/admin/users');
    if (res.status === 401) {
      handleUnauthorized();
      return;
    }
    if (res.status === 403) {
      alert('Bu sayfaya erişim yetkiniz yok.');
      window.location.href = 'dashboard.html';
      return;
    }
    const data = await res.json();
    if (data.success && usersList) {
      setStats(data.stats || {});
      const users = data.users || [];
      if (users.length === 0) {
        usersList.innerHTML = '<p>Kullanıcı bulunmamadı.</p>';
        return;
      }
      let html = `<table class="data-table">
        <thead><tr>
          <th>ID</th>
          <th>Ad Soyad</th>
          <th>E-posta</th>
          <th>Rol</th>
          <th>Plan</th>
          <th>İşlemler</th>
        </tr></thead><tbody>`;
      users.forEach(u => {
        html += buildUserRow(u);
      });
      html += '</tbody></table>';
      usersList.innerHTML = html;
    }
  } catch (e) {
    if (usersList) usersList.innerHTML = '<p>Sunucuya ulaşılamadı.</p>';
  }
}

usersList.addEventListener('click', async (e) => {
  const btn = e.target.closest('button[data-action]');
  if (!btn) return;
  const uid = Number(btn.getAttribute('data-user'));
  const action = btn.getAttribute('data-action');

  if (action === 'delete') {
    if (!confirm('Bu kullanıcı ve ona bağlı TÜM veriler (araç, QR, satın alma) silinecek. Onaylıyor musunuz?')) {
      return;
    }
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', user_id: uid })
      });
      const result = await res.json();
      if (result.success) {
        alert(result.message);
        loadUsers();
      } else {
        alert('Hata: ' + result.message);
      }
    } catch (err) {
      alert('Sunucuya ulaşılamadı.');
    }
  } else if (action === 'update') {
    const roleSel = usersList.querySelector(`select[data-field="role"][data-user="${uid}"]`);
    const planSel = usersList.querySelector(`select[data-field="plan"][data-user="${uid}"]`);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          user_id: uid,
          role: roleSel ? roleSel.value : undefined,
          plan_tier: planSel ? planSel.value : undefined
        })
      });
      const result = await res.json();
      if (result.success) {
        alert(result.message);
        loadUsers();
      } else {
        alert('Hata: ' + result.message);
      }
    } catch (err) {
      alert('Sunucuya ulaşılamadı.');
    }
  }
});

loadUsers();
