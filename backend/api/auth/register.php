<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Yalnızca POST istekleri kabul edilir.']);
    exit;
}

require_once __DIR__ . '/../../database/db.php';

$rawInput = file_get_contents('php://input');
$data = json_decode($rawInput, true);

if (!is_array($data)) {
    $data = $_POST;
}

$fullName = trim((string)($data['fullName'] ?? $data['full_name'] ?? $data['name'] ?? ''));
$email = trim((string)($data['email'] ?? ''));
$password = (string)($data['password'] ?? '');
$planTier = trim((string)($data['planTier'] ?? $data['plan_tier'] ?? 'free'));
$phoneNumber = trim((string)($data['phoneNumber'] ?? $data['phone_number'] ?? ''));
$occupation = trim((string)($data['occupation'] ?? ''));
$role = trim((string)($data['role'] ?? 'user'));
if (!in_array($role, ['admin', 'member', 'business', 'user'], true)) {
    $role = 'user';
}

if ($fullName === '' || $email === '' || $password === '') {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'Ad Soyad, E-posta ve Şifre alanları zorunludur.'
    ]);
    exit;
}

if (strlen($password) < 6) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'Şifre en az 6 karakter olmalıdır.'
    ]);
    exit;
}

try {
    $user = registerUser($fullName, $email, $password, $planTier, $phoneNumber, $occupation, $role);
    http_response_code(201);
    echo json_encode([
        'success' => true,
        'message' => 'Kayıt işlemi başarıyla tamamlandı.',
        'user' => $user
    ]);
} catch (InvalidArgumentException $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Sunucu hatası: ' . $e->getMessage()
    ]);
}
