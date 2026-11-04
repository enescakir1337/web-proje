const params = new URLSearchParams(window.location.search);
const token = params.get('token');
const qrInfo = document.getElementById('qrInfo');
const callBtn = document.getElementById('callBtn');
const whatsappBtn = document.getElementById('whatsappBtn');
const smsBtn = document.getElementById('smsBtn');

async function loadQr() {
  if (!token) {
    qrInfo.innerHTML = '<p>Geçersiz QR kodu.</p>';
    return;
  }
  try {
    const res = await fetch('/api/qr?token=' + encodeURIComponent(token));
    const data = await res.json();
    if (data.success && data.qr) {
      const qr = data.qr;
      let phone = qr.call_number || qr.vehicle_contact || '';
      phone = phone.replace(/\s+/g, '');
      qrInfo.innerHTML = ''
        + '<div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid rgba(255,255,255,0.08);"><span style="color:var(--muted);">Plaka</span><span style="font-weight:600;">' + (qr.plate_number || '-') + '</span></div>'
        + '<div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid rgba(255,255,255,0.08);"><span style="color:var(--muted);">Marka / Model</span><span style="font-weight:600;">' + (qr.brand_model || '-') + '</span></div>'
        + '<div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid rgba(255,255,255,0.08);"><span style="color:var(--muted);">Renk</span><span style="font-weight:600;">' + (qr.color || '-') + '</span></div>'
        + '<div style="display:flex; justify-content:space-between; padding:8px 0;"><span style="color:var(--muted);">İletişim</span><span style="font-weight:600;">' + (phone || '-') + '</span></div>';
      if (phone) {
        callBtn.href = 'tel:' + phone;
        const msg = qr.auto_message || 'Merhaba, aracınızla ilgili bir durum var. Lütfen aracınızı hareket ettirir misiniz?';
        if (whatsappBtn) {
          whatsappBtn.href = 'https://wa.me/' + phone.replace('+', '') + '?text=' + encodeURIComponent(msg);
        }
        if (smsBtn) {
          smsBtn.href = 'sms:' + phone + '?body=' + encodeURIComponent(msg);
        }
      } else {
        if (callBtn) callBtn.style.display = 'none';
        if (whatsappBtn) whatsappBtn.style.display = 'none';
        if (smsBtn) smsBtn.style.display = 'none';
      }
    } else {
      qrInfo.innerHTML = '<p>QR bilgisi bulunamadı.</p>';
      if (callBtn) callBtn.style.display = 'none';
      if (whatsappBtn) whatsappBtn.style.display = 'none';
      if (smsBtn) smsBtn.style.display = 'none';
    }
  } catch (e) {
    qrInfo.innerHTML = '<p>Bir hata oluştu.</p>';
    if (callBtn) callBtn.style.display = 'none';
    if (whatsappBtn) whatsappBtn.style.display = 'none';
    if (smsBtn) smsBtn.style.display = 'none';
  }
}

loadQr();
