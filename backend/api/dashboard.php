<?php
declare(strict_types=1);

require_once __DIR__ . '/../auth.php';

try {
    $user = require_user();
    $userId = (int)$user['id'];

    $vehicles = getVehiclesByUserId($userId);
    $purchases = getPurchasesByUserId($userId);
    $qrCodes = getQrCodesByUserId($userId);

    $serverIp = getenv('LAN_IP') ?: gethostbyname(gethostname());
    $port = $_SERVER['SERVER_PORT'] ?? '8000';
    $lanUrl = $serverIp ? 'http://' . $serverIp . ':' . $port : null;

    json_response([
        'success' => true,
        'user' => [
            'id' => (int)$user['id'],
            'full_name' => $user['full_name'],
            'email' => $user['email'],
            'plan_tier' => $user['plan_tier'],
            'role' => $user['role'],
            'phone_number' => $user['phone_number'],
            'occupation' => $user['occupation'],
            'created_at' => $user['created_at'],
        ],
        'vehicles' => $vehicles,
        'purchases' => $purchases,
        'qrCodes' => $qrCodes,
        'serverIp' => $serverIp,
        'lanUrl' => $lanUrl
    ]);
} catch (Throwable $e) {
    handle_api_error('dashboard', $e);
}
