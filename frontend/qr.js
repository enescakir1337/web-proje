const params = new URLSearchParams(window.location.search);
const token = params.get('token');
const qrInfo = document.getElementById('qrInfo');
const callBtn = document.getElementById('callBtn');
const whatsappBtn = document.getElementById('whatsappBtn');
const smsBtn = document.getElementById('smsBtn');

async function loadQr() {
  if (!token) {
    qrInfo.innerHTML = '<p style="color:var(--danger, #ef4444);">Geçersiz QR kodu.</p>';
    return;
  }
  try {
    const res = await fetch('/api/qr?token=' + encodeURIComponent(token));
    const data = await res.json();
    if (data.success && data.qr) {
      const qr = data.qr;
      const rawPhone = qr.call_number || qr.vehicle_contact || '';
      const digits = rawPhone.replace(/\D/g, '');
      let waPhone = digits;
      if (digits.startsWith('0')) {
        waPhone = '90' + digits.substring(1);
      } else if (digits.length === 10) {
        waPhone = '90' + digits;
      }
      const callPhone = digits ? ('+' + (waPhone.startsWith('90') ? waPhone : digits)) : '';

      qrInfo.innerHTML = ''
        + '<div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid rgba(255,255,255,0.08);"><span style="color:var(--muted);">Plaka</span><span style="font-weight:600; font-size:16px;">' + (qr.plate_number || '-') + '</span></div>'
        + '<div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid rgba(255,255,255,0.08);"><span style="color:var(--muted);">Marka / Model</span><span style="font-weight:600;">' + (qr.brand_model || '-') + '</span></div>'
        + '<div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid rgba(255,255,255,0.08);"><span style="color:var(--muted);">Renk</span><span style="font-weight:600;">' + (qr.color || '-') + '</span></div>'
        + '<div style="display:flex; justify-content:space-between; padding:8px 0;"><span style="color:var(--muted);">İletişim Numarası</span><span style="font-weight:600;">' + (rawPhone || '-') + '</span></div>';

      if (digits) {
        callBtn.href = 'tel:' + callPhone;
        const msg = qr.auto_message || 'Merhaba, aracınızla ilgili bir durum var. Lütfen aracınızı hareket ettirir misiniz?';
        if (whatsappBtn) {
          whatsappBtn.href = 'https://wa.me/' + waPhone + '?text=' + encodeURIComponent(msg);
        }
        if (smsBtn) {
          smsBtn.href = 'sms:' + callPhone + '?body=' + encodeURIComponent(msg);
        }
      } else {
        if (callBtn) callBtn.style.display = 'none';
        if (whatsappBtn) whatsappBtn.style.display = 'none';
        if (smsBtn) smsBtn.style.display = 'none';
      }
    } else {
      qrInfo.innerHTML = '<p style="color:var(--danger, #ef4444);">QR vizite bilgisi bulunamadı veya silinmiş.</p>';
      if (callBtn) callBtn.style.display = 'none';
      if (whatsappBtn) whatsappBtn.style.display = 'none';
      if (smsBtn) smsBtn.style.display = 'none';
    }
  } catch (e) {
    qrInfo.innerHTML = '<p style="color:var(--danger, #ef4444);">Bilgiler alınırken bir hata oluştu.</p>';
    if (callBtn) callBtn.style.display = 'none';
    if (whatsappBtn) whatsappBtn.style.display = 'none';
    if (smsBtn) smsBtn.style.display = 'none';
  }
}

loadQr();
