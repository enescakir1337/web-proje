const modal = document.getElementById('authModal');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const loginTab = document.getElementById('loginTab');
const registerTab = document.getElementById('registerTab');

function openModal() {
  modal.classList.add('show');
}

function closeModal() {
  modal.classList.remove('show');
}

function showTab(isLogin) {
  loginForm.classList.toggle('hidden', !isLogin);
  registerForm.classList.toggle('hidden', isLogin);
  loginTab.classList.toggle('active', isLogin);
  registerTab.classList.toggle('active', !isLogin);
}

document.getElementById('loginBtn').onclick = openModal;
document.getElementById('closeModal').onclick = closeModal;

modal.onclick = (event) => {
  if (event.target === modal) {
    closeModal();
  }
};

loginTab.onclick = () => showTab(true);
registerTab.onclick = () => showTab(false);

async function sendRequest(url, data) {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    return await response.json();
  } catch {
    return { success: false, message: 'Sunucuya ulaşılamadı.' };
  }
}

loginForm.onsubmit = async (event) => {
  event.preventDefault();

  const data = Object.fromEntries(new FormData(loginForm));
  const result = await sendRequest('/api/auth/login', data);

  if (result.success) {
    if (result.user) {
      localStorage.setItem('user', JSON.stringify(result.user));
    }
    alert('Giriş başarılı. Hoş geldiniz!');
    closeModal();
    loginForm.reset();
    const role = result.user?.role || 'user';
    if (role === 'admin') {
      window.location.href = 'admin.html';
    } else {
      window.location.href = 'dashboard.html';
    }
  } else {
    alert('Giriş başarısız: ' + result.message);
  }
};

registerForm.onsubmit = async (event) => {
  event.preventDefault();

  const data = Object.fromEntries(new FormData(registerForm));
  data.planTier = 'free';
  data.role = 'user';

  const result = await sendRequest('/api/auth/register', data);

  if (result.success) {
    if (result.user) {
      localStorage.setItem('user', JSON.stringify(result.user));
    }
    alert('Kayıt başarılı. Hoş geldiniz!');
    closeModal();
    registerForm.reset();
    const role = result.user?.role || 'user';
    if (role === 'admin') {
      window.location.href = 'admin.html';
    } else {
      window.location.href = 'dashboard.html';
    }
  } else {
    alert('Kayıt başarısız: ' + result.message);
  }
};
