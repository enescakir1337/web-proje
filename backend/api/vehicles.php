<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
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
        $vehicles = getVehiclesByUserId($userId);
        http_response_code(200);
        echo json_encode(['success' => true, 'vehicles' => $vehicles]);
        exit;
    }
    
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $rawInput = file_get_contents('php://input');
        $data = json_decode($rawInput, true);
        if (!is_array($data)) {
            $data = $_POST;
        }
        
        $userId = isset($data['user_id']) ? (int)$data['user_id'] : (isset($data['userId']) ? (int)$data['userId'] : 0);
        $plateNumber = trim((string)($data['plateNumber'] ?? $data['plate_number'] ?? ''));
        $brandModel = trim((string)($data['brandModel'] ?? $data['brand_model'] ?? ''));
        $color = trim((string)($data['color'] ?? ''));
        $ownerName = trim((string)($data['ownerName'] ?? $data['owner_name'] ?? $data['isimSoyisim'] ?? $data['adSoyad'] ?? ''));
        $contactPhone = trim((string)($data['contactPhone'] ?? $data['contact_phone'] ?? $data['phone'] ?? $data['telefon'] ?? $data['telefonNumarasi'] ?? ''));
        
        if ($userId <= 0 || $plateNumber === '') {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Kullanıcı ve plaka bilgileri zorunludur.']);
            exit;
        }
        
        $vehicle = createVehicle($userId, $plateNumber, $brandModel, $color, $ownerName, $contactPhone);
        http_response_code(201);
        echo json_encode(['success' => true, 'message' => 'Araç başarıyla eklendi.', 'vehicle' => $vehicle]);
        exit;
    }
    
    if ($_SERVER['REQUEST_METHOD'] === 'PUT' || $_SERVER['REQUEST_METHOD'] === 'PATCH') {
        $rawInput = file_get_contents('php://input');
        $data = json_decode($rawInput, true);
        if (!is_array($data)) {
            $data = $_POST;
        }
        $vehicleId = isset($data['id']) ? (int)$data['id'] : (isset($data['vehicle_id']) ? (int)$data['vehicle_id'] : 0);
        $userId = isset($data['user_id']) ? (int)$data['user_id'] : 0;
        if ($vehicleId <= 0 || $userId <= 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Geçersiz istek.']);
            exit;
        }
        $db = getDbConnection();
        $stmt = $db->prepare('UPDATE vehicles SET plate_number=:plate_number, brand_model=:brand_model, color=:color, owner_name=:owner_name, contact_phone=:contact_phone WHERE id=:id AND user_id=:user_id');
        $stmt->execute([
            ':id' => $vehicleId,
            ':user_id' => $userId,
            ':plate_number' => trim((string)($data['plateNumber'] ?? $data['plate_number'] ?? '')),
            ':brand_model' => trim((string)($data['brandModel'] ?? $data['brand_model'] ?? '')),
            ':color' => trim((string)($data['color'] ?? '')),
            ':owner_name' => trim((string)($data['ownerName'] ?? $data['owner_name'] ?? '')) === '' ? null : trim((string)($data['ownerName'] ?? $data['owner_name'] ?? '')),
            ':contact_phone' => trim((string)($data['contactPhone'] ?? $data['contact_phone'] ?? '')) === '' ? null : trim((string)($data['contactPhone'] ?? $data['contact_phone'] ?? '')),
        ]);
        http_response_code(200);
        echo json_encode(['success' => true, 'message' => 'Araç bilgileri güncellendi.']);
        exit;
    }
    
    if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
        $rawInput = file_get_contents('php://input');
        $data = json_decode($rawInput, true);
        if (!is_array($data)) {
            $data = $_GET;
        }
        $vehicleId = isset($data['id']) ? (int)$data['id'] : (isset($_GET['id']) ? (int)$_GET['id'] : 0);
        $userId = isset($data['user_id']) ? (int)$data['user_id'] : (isset($_GET['user_id']) ? (int)$_GET['user_id'] : 0);
        if ($vehicleId <= 0 || $userId <= 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Geçersiz istek.']);
            exit;
        }
        $db = getDbConnection();
        $stmt = $db->prepare('DELETE FROM vehicles WHERE id=:id AND user_id=:user_id');
        $stmt->execute([':id' => $vehicleId, ':user_id' => $userId]);
        http_response_code(200);
        echo json_encode(['success' => true, 'message' => 'Araç silindi.']);
        exit;
    }
    
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Desteklenmeyen istek metodu.']);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Araç işlemi sırasında hata oluştu: ' . $e->getMessage()]);
}
