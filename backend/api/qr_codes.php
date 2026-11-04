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
        $qrCodes = getQrCodesByUserId($userId);
        $purchasedQrCodes = getPurchasedQrCodesByUserId($userId);
        http_response_code(200);
        echo json_encode(['success' => true, 'qrCodes' => $qrCodes, 'purchasedQrCodes' => $purchasedQrCodes]);
        exit;
    }
    
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $rawInput = file_get_contents('php://input');
        $data = json_decode($rawInput, true);
        if (!is_array($data)) {
            $data = $_POST;
        }
        
        $vehicleId = isset($data['vehicle_id']) ? (int)$data['vehicle_id'] : (isset($data['vehicleId']) ? (int)$data['vehicleId'] : 0);
        $purchaseId = isset($data['purchase_id']) ? (int)$data['purchase_id'] : (isset($data['purchaseId']) ? (int)$data['purchaseId'] : null);
        if ($purchaseId === 0) {
            $purchaseId = null;
        }
        $callNumber = trim((string)($data['callNumber'] ?? $data['call_number'] ?? $data['phone'] ?? $data['telefon'] ?? ''));
        $autoMessage = trim((string)($data['autoMessage'] ?? $data['auto_message'] ?? $data['mesaj'] ?? ''));
        
        if ($vehicleId <= 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Araç bilgisi gerekli.']);
            exit;
        }
        
        $qrCode = createQrCode($vehicleId, $purchaseId, $callNumber, $autoMessage);
        http_response_code(201);
        echo json_encode(['success' => true, 'message' => 'QR vizit kartı başarıyla oluşturuldu.', 'qrCode' => $qrCode]);
        exit;
    }
    
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Desteklenmeyen istek metodu.']);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'QR kod işlemi sırasında hata oluştu: ' . $e->getMessage()]);
}
