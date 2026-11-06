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
    $userId = isset($_GET['user_id']) ? (int)$_GET['user_id'] : (isset($_POST['user_id']) ? (int)$_POST['user_id'] : 0);
    
    if ($userId <= 0) {
        $rawInput = file_get_contents('php://input');
        $data = json_decode($rawInput, true);
        if (is_array($data) && isset($data['user_id'])) {
            $userId = (int)$data['user_id'];
        } elseif (is_array($data) && isset($data['userId'])) {
            $userId = (int)$data['userId'];
        }
    }
    
    if ($userId <= 0) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Kullanıcı bilgisi gerekli.'
        ]);
        exit;
    }
    
    $user = getUserById($userId);
    $vehicles = getVehiclesByUserId($userId);
    $purchases = getPurchasesByUserId($userId);
    $qrCodes = getQrCodesByUserId($userId);
    $purchasedQrCodes = getPurchasedQrCodesByUserId($userId);
    
    $serverIp = gethostbyname(gethostname());
    $port = $_SERVER['SERVER_PORT'] ?? '8000';
    $lanUrl = 'http://' . $serverIp . ':' . $port;

    http_response_code(200);
    echo json_encode([
        'success' => true,
        'user' => $user,
        'vehicles' => $vehicles,
        'purchases' => $purchases,
        'qrCodes' => $qrCodes,
        'purchasedQrCodes' => $purchasedQrCodes,
        'serverIp' => $serverIp,
        'lanUrl' => $lanUrl
    ]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Dashboard verileri yüklenirken hata oluştu: ' . $e->getMessage()
    ]);
}
