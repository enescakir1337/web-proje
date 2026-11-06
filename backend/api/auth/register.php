<?php
declare(strict_types=1);

require_once __DIR__ . '/../../auth.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(['success' => false, 'message' => 'Yalnızca POST istekleri kabul edilir.'], 405);
}

try {
    $data = read_json_body();

    $fullName = trim((string)($data['fullName'] ?? $data['full_name'] ?? $data['name'] ?? ''));
    $email = trim((string)($data['email'] ?? ''));
    $password = (string)($data['password'] ?? '');
    $phoneNumber = trim((string)($data['phoneNumber'] ?? $data['phone_number'] ?? ''));
    $occupation = trim((string)($data['occupation'] ?? ''));
    $planTier = 'free';

    if ($fullName === '' || $email === '' || $password === '') {
        json_response(['success' => false, 'message' => 'Ad Soyad, E-posta ve Şifre alanları zorunludur.'], 400);
    }

    if (mb_strlen($password) < 6) {
        json_response(['success' => false, 'message' => 'Şifre en az 6 karakter olmalıdır.'], 400);
    }

    if (mb_strlen($password) > 72) {
        json_response(['success' => false, 'message' => 'Şifre en fazla 72 karakter olabilir.'], 400);
    }

    rate_limit('register', 10, 60);

    $user = registerUser($fullName, $email, $password, $planTier, $phoneNumber, $occupation);

    login_session((int)$user['id']);

    json_response([
        'success' => true,
        'message' => 'Kayıt işlemi başarıyla tamamlandı.',
        'user' => $user + ['role' => 'user']
    ], 201);
} catch (InvalidArgumentException $e) {
    json_response(['success' => false, 'message' => $e->getMessage()], 400);
} catch (Throwable $e) {
    handle_api_error('register', $e);
}
