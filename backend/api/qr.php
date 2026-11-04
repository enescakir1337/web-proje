<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

require_once __DIR__ . '/../database/db.php';

try {
    $token = $_GET['token'] ?? '';
    if ($token === '') {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'QR token gerekli.']);
        exit;
    }
    
    $db = getDbConnection();
    $stmt = $db->prepare('
        SELECT qc.*, v.plate_number, v.brand_model, v.color, v.owner_name, v.contact_phone as vehicle_contact
        FROM qr_codes qc
        JOIN vehicles v ON v.id = qc.vehicle_id
        WHERE qc.qr_token = :token
    ');
    $stmt->execute([':token' => $token]);
    $qr = $stmt->fetch();
    
    if (!$qr) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'QR bulunamadı.']);
        exit;
    }
    
    $db->prepare('UPDATE qr_codes SET scan_count = scan_count + 1 WHERE qr_token = :token')->execute([':token' => $token]);
    
    http_response_code(200);
    echo json_encode(['success' => true, 'qr' => $qr]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Hata: ' . $e->getMessage()]);
}
