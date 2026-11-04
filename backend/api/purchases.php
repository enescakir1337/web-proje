<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

require_once __DIR__ . '/../database/db.php';

try {
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $userId = isset($_GET['user_id']) ? (int)$_GET['user_id'] : 0;
        if ($userId <= 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Kullanıcı bilgisi gerekli.']);
            exit;
        }
        $purchases = getPurchasesByUserId($userId);
        http_response_code(200);
        echo json_encode(['success' => true, 'purchases' => $purchases]);
        exit;
    }
    
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $rawInput = file_get_contents('php://input');
        $data = json_decode($rawInput, true);
        if (!is_array($data)) {
            $data = $_POST;
        }
        
        $userId = isset($data['user_id']) ? (int)$data['user_id'] : (isset($data['userId']) ? (int)$data['userId'] : 0);
        $packageName = trim((string)($data['packageName'] ?? $data['package_name'] ?? 'QR Vizit'));
        $quantity = isset($data['quantity']) ? (int)$data['quantity'] : 1;
        $amount = isset($data['amount']) ? (float)$data['amount'] : 0;
        
        if ($userId <= 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Kullanıcı bilgisi gerekli.']);
            exit;
        }
        
        $purchase = createPurchase($userId, $packageName, $quantity, $amount);
        http_response_code(201);
        echo json_encode(['success' => true, 'message' => 'Satın alma işlemi başarılı.', 'purchase' => $purchase]);
        exit;
    }
    
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Desteklenmeyen istek metodu.']);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Satın alma işlemi sırasında hata oluştu: ' . $e->getMessage()]);
}
