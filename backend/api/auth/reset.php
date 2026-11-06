<?php
declare(strict_types=1);

require_once __DIR__ . '/../../auth.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(['success' => false, 'message' => 'Yalnızca POST istekleri kabul edilir.'], 405);
}

try {
    $data = read_json_body();
    $token = trim((string)($data['token'] ?? ''));
    $newPassword = (string)($data['new_password'] ?? $data['newPassword'] ?? $data['password'] ?? '');

    if ($token === '' || $newPassword === '') {
        json_response(['success' => false, 'message' => 'Geçersiz şifre sıfırlama isteği.'], 400);
    }

    if (mb_strlen($newPassword) < 6) {
        json_response(['success' => false, 'message' => 'Şifre en az 6 karakter olmalıdır.'], 400);
    }

    if (mb_strlen($newPassword) > 72) {
        json_response(['success' => false, 'message' => 'Şifre en fazla 72 karakter olabilir.'], 400);
    }

    rate_limit('reset', 10, 30);

    resetPasswordWithToken($token, $newPassword);

    json_response(['success' => true, 'message' => 'Şifreniz başarıyla güncellendi. Yeni şifrenizle giriş yapabilirsiniz.']);
} catch (InvalidArgumentException $e) {
    json_response(['success' => false, 'message' => $e->getMessage()], 400);
} catch (Throwable $e) {
    handle_api_error('reset-password', $e);
}
