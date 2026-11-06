<?php
declare(strict_types=1);

require_once __DIR__ . '/../auth.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(['success' => false, 'message' => 'Yalnızca POST istekleri kabul edilir.'], 405);
}

try {
    $user = require_user();
    $userId = (int)$user['id'];
    $data = read_json_body();

    $fullName = trim((string)($data['fullName'] ?? $data['full_name'] ?? $user['full_name']));
    $phoneNumber = trim((string)($data['phoneNumber'] ?? $data['phone_number'] ?? $user['phone_number'] ?? ''));
    $occupation = trim((string)($data['occupation'] ?? $user['occupation'] ?? ''));

    if ($fullName === '') {
        json_response(['success' => false, 'message' => 'Ad Soyad alanı boş bırakılamaz.'], 400);
    }

    if (mb_strlen($fullName) > 100) {
        json_response(['success' => false, 'message' => 'Ad Soyad en fazla 100 karakter olabilir.'], 400);
    }

    $newPassword = (string)($data['newPassword'] ?? $data['new_password'] ?? '');
    $currentPassword = (string)($data['currentPassword'] ?? $data['current_password'] ?? '');

    if ($newPassword !== '') {
        if (mb_strlen($newPassword) < 6) {
            json_response(['success' => false, 'message' => 'Yeni şifre en az 6 karakter olmalıdır.'], 400);
        }
        if (mb_strlen($newPassword) > 72) {
            json_response(['success' => false, 'message' => 'Yeni şifre en fazla 72 karakter olabilir.'], 400);
        }
        if (!verifyCurrentPassword($userId, $currentPassword)) {
            json_response(['success' => false, 'message' => 'Mevcut şifreniz hatalı. Lütfen tekrar deneyin.'], 401);
        }
    }

    updateUserProfile($userId, $fullName, $phoneNumber, $occupation);

    if ($newPassword !== '') {
        updateUserPassword($userId, $newPassword);
    }

    json_response([
        'success' => true,
        'message' => $newPassword !== '' ? 'Profil bilgileri ve şifreniz güncellendi.' : 'Profil bilgileri güncellendi.',
        'user' => getUserById($userId)
    ]);
} catch (Throwable $e) {
    handle_api_error('profile', $e);
}
