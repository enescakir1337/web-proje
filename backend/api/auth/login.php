<?php
declare(strict_types=1);

require_once __DIR__ . '/../../auth.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(['success' => false, 'message' => 'Yalnızca POST istekleri kabul edilir.'], 405);
}

try {
    $data = read_json_body();
    $email = strtolower(trim((string)($data['email'] ?? '')));
    $password = (string)($data['password'] ?? '');

    if ($email === '' || $password === '') {
        json_response(['success' => false, 'message' => 'E-posta ve Şifre alanları zorunludur.'], 400);
    }

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        json_response(['success' => false, 'message' => 'Geçerli bir e-posta adresi giriniz.'], 400);
    }

    rate_limit('login', 10, 15);

    $user = authenticateUser($email, $password);

    login_session((int)$user['id']);

    json_response([
        'success' => true,
        'message' => 'Giriş başarılı!',
        'user' => $user
    ]);
} catch (InvalidArgumentException $e) {
    json_response(['success' => false, 'message' => $e->getMessage()], 401);
} catch (Throwable $e) {
    handle_api_error('login', $e);
}
