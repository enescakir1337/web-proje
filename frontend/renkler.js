// Arac renk paleti - TEK KAYNAK frontend icin.
// DIKKAT: Bu liste backend/database/db.php icindeki gecerliAracRenkleri()
// ile ayni olmalidir; yeni renk eklerken ikisini birlikte guncelleyin.

const ARAC_RENKLERI = [
  { ad: 'Beyaz',      kod: '#f4f4f4' },
  { ad: 'Siyah',      kod: '#1c1c1c' },
  { ad: 'Gri',        kod: '#8a8a8a' },
  { ad: 'Gümüş',      kod: '#b8bcbf' },
  { ad: 'Krem',       kod: '#efe3c8' },
  { ad: 'Bej',        kod: '#d9c9a8' },
  { ad: 'Kırmızı',    kod: '#d32f2f' },
  { ad: 'Bordo',      kod: '#7b1f2b' },
  { ad: 'Turuncu',    kod: '#ef6c00' },
  { ad: 'Sarı',       kod: '#f2c200' },
  { ad: 'Yeşil',      kod: '#2e7d32' },
  { ad: 'Turkuaz',    kod: '#00838f' },
  { ad: 'Mavi',       kod: '#1565c0' },
  { ad: 'Lacivert',   kod: '#1a2740' },
  { ad: 'Mor',        kod: '#6a1b9a' },
  { ad: 'Pembe',      kod: '#d81b60' },
  { ad: 'Kahverengi', kod: '#6d4c41' },
  { ad: 'Altın',      kod: '#c9a227' }
];

function aracRenkKodu(renkAdi) {
  const aranan = String(renkAdi ?? '').trim();
  const bulundu = ARAC_RENKLERI.find(function (r) { return r.ad === aranan; });
  return bulundu ? bulundu.kod : null;
}

function renklerEsc(deger) {
  const map = {
    '&' : '\u0026amp;',
    '<' : '\u0026lt;',
    '>' : '\u0026gt;',
    '"' : '\u0026quot;',
    "'" : '\u0026#39;'
  };
  return String(deger ?? '').replace(/[&<>"']/g, function (ch) { return map[ch]; });
}

// Secmeli renk kutusu secenekleri olusturur.
// secili: mevcut deger (listede yoksa eski degeri korumak icin ayrı secenek eklenir)
function aracRenkSecenekleri(secili, bosMetin) {
  let html = '';
  if (bosMetin !== undefined) {
    html += '<option value="">' + bosMetin + '</option>';
  }
  const sec = String(secili ?? '').trim();
  if (sec !== '' && aracRenkKodu(sec) === null) {
    html += '<option value="' + renklerEsc(sec) + '" selected>' + renklerEsc(sec) + '</option>';
  }
  ARAC_RENKLERI.forEach(function (r) {
    html += '<option value="' + r.ad + '"' + (r.ad === sec ? ' selected' : '') + '>' + r.ad + '</option>';
  });
  return html;
}
