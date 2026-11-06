const form = document.getElementById('pageRegisterForm');

form.onsubmit = async (event) => {
  event.preventDefault();

  const data = Object.fromEntries(new FormData(form));

  try {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    const result = await response.json();

    if (result.success) {
      if (result.user) {
        localStorage.setItem('user', JSON.stringify(result.user));
      }
      alert('Tebrikler! Kayıt başarılı. Panele yönlendiriliyorsunuz.');
      const role = result.user?.role || 'user';
      if (role === 'admin') {
        window.location.href = 'admin.html';
      } else {
        window.location.href = 'dashboard.html';
      }
    } else {
      alert('Kayıt başarısız: ' + result.message);
    }
  } catch {
    alert('Sunucuya ulaşılamadı. Lütfen daha sonra tekrar deneyin.');
  }
};
