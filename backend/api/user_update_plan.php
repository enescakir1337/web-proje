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

require_once __DIR__ . '/../database/db.php';

try {
    $rawInput = file_get_contents('php://input');
    $data = json_decode($rawInput, true);
    if (!is_array($data)) {
        $data = $_POST;
    }
    $userId = isset($data['user_id']) ? (int)$data['user_id'] : (isset($data['userId']) ? (int)$data['userId'] : 0);
    $plan = trim((string)($data['plan'] ?? $data['plan_tier'] ?? 'pro'));
    
    if ($userId <= 0) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Kullanıcı bilgisi gerekli.']);
        exit;
    }
    
    $db = getDbConnection();
    $stmt = $db->prepare('UPDATE users SET plan_tier = :plan WHERE id = :id');
    $stmt->execute([':plan' => $plan, ':id' => $userId]);
    
    // Satın alma kaydı da ekleyelim
    createPurchase($userId, 'QR Vizite Paketi (Pro)', 1, 299.00);

    http_response_code(200);
    echo json_encode(['success' => true, 'message' => 'Plan başarıyla güncellendi.', 'plan' => $plan]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Hata: ' . $e->getMessage()]);
}
