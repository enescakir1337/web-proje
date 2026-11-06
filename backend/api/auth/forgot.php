<?php
declare(strict_types=1);

require_once __DIR__ . '/../../auth.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(['success' => false, 'message' => 'Yalnızca POST istekleri kabul edilir.'], 405);
}

try {
    $data = read_json_body();
    $email = strtolower(trim((string)($data['email'] ?? '')));

    if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        json_response(['success' => false, 'message' => 'Geçerli bir e-posta adresi giriniz.'], 400);
    }

    rate_limit('forgot', 5, 30);

    $db = getDbConnection();
    $stmt = $db->prepare('SELECT id FROM users WHERE email = :email');
    $stmt->execute([':email' => $email]);
    $row = $stmt->fetch();

    if ($row) {
        $token = createPasswordResetToken((int)$row['id']);
        $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
        $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
        $resetLink = $scheme . '://' . $host . '/sifre_sifirla.html?token=' . urlencode($token);

        $mailBody = "Merhaba,\n\n"
            . "66 Vizite hesabınız için şifre sıfırlama talebi alındı.\n"
            . "Yeni şifrenizi belirlemek için aşağıdaki bağlantıyı açın (1 saat geçerlidir):\n\n"
            . $resetLink . "\n\n"
            . "Bu talebi siz yapmadıysanız bu e-postayı yok sayabilirsiniz.\n\n"
            . "66 Vizite";

        send_mail($email, '66 Vizite - Şifre Sıfırlama', $mailBody);
    }

    json_response(['success' => true, 'message' => 'Eğer bu e-posta kayıtlıysa şifre sıfırlama bağlantısı gönderildi. Gelen kutunuzu kontrol edin.']);
} catch (Throwable $e) {
    handle_api_error('forgot-password', $e);
}
