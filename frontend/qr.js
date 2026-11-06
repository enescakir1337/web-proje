const params = new URLSearchParams(window.location.search);
const token = params.get('token');
const qrInfo = document.getElementById('qrInfo');
const callBtn = document.getElementById('callBtn');
const whatsappBtn = document.getElementById('whatsappBtn');
const smsBtn = document.getElementById('smsBtn');

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

function renkGorselHtml(renkAdi) {
  var ad = String(renkAdi ?? '').trim();
  if (ad === '') return '-';
  var kod = aracRenkKodu(ad);
  if (kod === null) return escapeHtml(ad);
  return '<span class="renk-dot" style="background:' + kod + '"></span>' + escapeHtml(ad);
}

function infoRow(label, value) {
  return '<div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid rgba(255,255,255,0.08);"><span style="color:var(--muted);">' + label + '</span><span style="font-weight:600; font-size:16px; text-align:right;">' + value + '</span></div>';
}

function hideButtons() {
  if (callBtn) callBtn.style.display = 'none';
  if (whatsappBtn) whatsappBtn.style.display = 'none';
  if (smsBtn) smsBtn.style.display = 'none';
}

async function loadQr() {
  if (!token) {
    qrInfo.innerHTML = '<p style="color:var(--danger, #ef4444);">Geçersiz QR kodu.</p>';
    hideButtons();
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
        + infoRow('Plaka', escapeHtml(qr.plate_number || '-'))
        + infoRow('Marka / Model', escapeHtml(qr.brand_model || '-'))
        + infoRow('Renk', renkGorselHtml(qr.color))
        + infoRow('İletişim Numarası', escapeHtml(rawPhone || '-'));

      if (digits && callBtn) {
        callBtn.href = 'tel:' + callPhone;
        const msg = qr.auto_message || 'Merhaba, aracınızla ilgili bir durum var. Lütfen aracınızı hareket ettirir misiniz?';
        if (whatsappBtn) {
          whatsappBtn.href = 'https://wa.me/' + waPhone + '?text=' + encodeURIComponent(msg);
        }
        if (smsBtn) {
          smsBtn.href = 'sms:' + callPhone + '?body=' + encodeURIComponent(msg);
        }
      } else {
        hideButtons();
      }
    } else {
      qrInfo.innerHTML = '<p style="color:var(--danger, #ef4444);">QR vizite bilgisi bulunamadı veya kart devre dışı.</p>';
      hideButtons();
    }
  } catch (e) {
    qrInfo.innerHTML = '<p style="color:var(--danger, #ef4444);">Bilgiler alınırken bir hata oluştu.</p>';
    hideButtons();
  }
}

loadQr();
