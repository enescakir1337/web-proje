<?php
declare(strict_types=1);

require_once __DIR__ . '/../auth.php';

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

try {
    $user = require_user();
    $userId = (int)$user['id'];

    if ($method === 'GET') {
        $purchases = getPurchasesByUserId($userId);
        json_response(['success' => true, 'purchases' => $purchases]);
    }

    if ($method === 'POST') {
        $data = read_json_body();

        $packageName = trim((string)($data['packageName'] ?? $data['package_name'] ?? 'QR Vizite'));
        $quantity = max(1, min(100, (int)($data['quantity'] ?? 1)));
        $amount = max(0, min(1000000, (float)($data['amount'] ?? 0)));

        if ($packageName === '') {
            json_response(['success' => false, 'message' => 'Paket adı zorunludur.'], 400);
        }

        $purchase = createPurchase($userId, $packageName, $quantity, $amount);
        json_response(['success' => true, 'message' => 'Satın alma işlemi başarılı.', 'purchase' => $purchase], 201);
    }

    json_response(['success' => false, 'message' => 'Desteklenmeyen istek metodu.'], 405);
} catch (Throwable $e) {
    handle_api_error('purchases', $e);
}
