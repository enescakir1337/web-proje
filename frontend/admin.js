const adminInfo = document.getElementById('adminInfo');
const logoutBtn = document.getElementById('logoutBtn');
const usersList = document.getElementById('usersList');

const user = JSON.parse(localStorage.getItem('user') || 'null');

if (!user || !user.id) {
  alert('Lütfen önce giriş yapın.');
  window.location.href = 'index.html';
}

if ((user.role || 'user') !== 'admin') {
  alert('Bu sayfaya erişim yetkiniz yok.');
  window.location.href = 'dashboard.html';
}

if (adminInfo) {
  adminInfo.textContent = user.fullName || user.email || '';
}

if (logoutBtn) {
  logoutBtn.onclick = () => {
    localStorage.removeItem('user');
    window.location.href = 'index.html';
  };
}

async function loadUsers() {
  try {
    const res = await fetch('/api/users');
    const data = await res.json();
    if (data.success && usersList) {
      if (!data.users || data.users.length === 0) {
        usersList.innerHTML = '<p>Kullanıcı bulunmamadı.</p>';
        return;
      }
      let html = '<table style="width:100%; border-collapse: separate; border-spacing: 0;"><thead><tr style="background: rgba(255,255,255,0.02);"><th style="text-align:left; padding:12px 16px; border-bottom:1px solid rgba(255,255,255,0.08);">ID</th><th style="text-align:left; padding:12px 16px; border-bottom:1px solid rgba(255,255,255,0.08);">Ad Soyad</th><th style="text-align:left; padding:12px 16px; border-bottom:1px solid rgba(255,255,255,0.08);">E-posta</th><th style="text-align:left; padding:12px 16px; border-bottom:1px solid rgba(255,255,255,0.08);">Rol</th><th style="text-align:left; padding:12px 16px; border-bottom:1px solid rgba(255,255,255,0.08);">Plan</th></tr></thead><tbody>';
      data.users.forEach(u => {
        html += `<tr><td style="padding:12px 16px; border-bottom:1px solid rgba(255,255,255,0.05);">${u.id}</td><td style="padding:12px 16px; border-bottom:1px solid rgba(255,255,255,0.05);">${u.full_name || '-'}</td><td style="padding:12px 16px; border-bottom:1px solid rgba(255,255,255,0.05);">${u.email || '-'}</td><td style="padding:12px 16px; border-bottom:1px solid rgba(255,255,255,0.05); text-transform: capitalize;">${u.role || '-'}</td><td style="padding:12px 16px; border-bottom:1px solid rgba(255,255,255,0.05); text-transform: uppercase;">${u.plan_tier || '-'}</td></tr>`;
      });
      html += '</tbody></table>';
      usersList.innerHTML = html;
    }
  } catch (e) {
    if (usersList) usersList.innerHTML = '<p>Hata oluştu.</p>';
  }
}

loadUsers();
