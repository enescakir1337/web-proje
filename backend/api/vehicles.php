<?php
declare(strict_types=1);

require_once __DIR__ . '/../auth.php';

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

try {
    $user = require_user();
    $userId = (int)$user['id'];

    if ($method === 'GET') {
        $vehicles = getVehiclesByUserId($userId);
        json_response(['success' => true, 'vehicles' => $vehicles]);
    }

    if ($method === 'POST') {
        $data = read_json_body();

        $plateNumber = trim((string)($data['plateNumber'] ?? $data['plate_number'] ?? ''));
        $brandModel = trim((string)($data['brandModel'] ?? $data['brand_model'] ?? ''));
        $color = trim((string)($data['color'] ?? ''));
        $ownerName = trim((string)($data['ownerName'] ?? $data['owner_name'] ?? $data['isimSoyisim'] ?? $data['adSoyad'] ?? ''));
        $contactPhone = trim((string)($data['contactPhone'] ?? $data['contact_phone'] ?? $data['phone'] ?? $data['telefon'] ?? $data['telefonNumarasi'] ?? ''));

        if ($plateNumber === '') {
            json_response(['success' => false, 'message' => 'Plaka bilgisi zorunludur.'], 400);
        }

        if (mb_strlen($plateNumber) > 20) {
            json_response(['success' => false, 'message' => 'Plaka en fazla 20 karakter olabilir.'], 400);
        }

        if (findVehicleByPlate($userId, $plateNumber) !== null) {
            json_response(['success' => false, 'message' => 'Bu plaka zaten kayıtlarınızda bulunuyor.'], 400);
        }

        if ($color !== '' && !in_array($color, gecerliAracRenkleri(), true)) {
            json_response(['success' => false, 'message' => 'Geçersiz renk seçimi. Lütfen listeden bir renk seçin.'], 400);
        }

        $vehicle = createVehicle($userId, $plateNumber, $brandModel, $color, $ownerName, $contactPhone);
        json_response(['success' => true, 'message' => 'Araç başarıyla eklendi.', 'vehicle' => $vehicle], 201);
    }

    if ($method === 'PUT' || $method === 'PATCH') {
        $data = read_json_body();
        $vehicleId = (int)($data['vehicle_id'] ?? $data['vehicleId'] ?? $data['id'] ?? 0);

        if ($vehicleId <= 0) {
            json_response(['success' => false, 'message' => 'Geçersiz istek.'], 400);
        }

        $existing = getVehicleForOwner($vehicleId, $userId);
        if ($existing === null) {
            json_response(['success' => false, 'message' => 'Araç bulunamadı.'], 404);
        }

        $plateNumber = trim((string)($data['plateNumber'] ?? $data['plate_number'] ?? $existing['plate_number']));
        $brandModel = trim((string)($data['brandModel'] ?? $data['brand_model'] ?? $existing['brand_model'] ?? ''));
        $color = trim((string)($data['color'] ?? $existing['color'] ?? ''));
        $ownerName = trim((string)($data['ownerName'] ?? $data['owner_name'] ?? $existing['owner_name'] ?? ''));
        $contactPhone = trim((string)($data['contactPhone'] ?? $data['contact_phone'] ?? $existing['contact_phone'] ?? ''));

        if ($plateNumber === '') {
            json_response(['success' => false, 'message' => 'Plaka bilgisi zorunludur.'], 400);
        }

        $duplicate = findVehicleByPlate($userId, $plateNumber, $vehicleId);
        if ($duplicate !== null) {
            json_response(['success' => false, 'message' => 'Bu plaka zaten kayıtlarınızda bulunuyor.'], 400);
        }

        if ($color !== '' && !in_array($color, gecerliAracRenkleri(), true)) {
            json_response(['success' => false, 'message' => 'Geçersiz renk seçimi. Lütfen listeden bir renk seçin.'], 400);
        }

        $db = getDbConnection();
        $stmt = $db->prepare('UPDATE vehicles SET plate_number=:plate_number, brand_model=:brand_model, color=:color, owner_name=:owner_name, contact_phone=:contact_phone WHERE id=:id AND user_id=:user_id');
        $stmt->execute([
            ':id' => $vehicleId,
            ':user_id' => $userId,
            ':plate_number' => $plateNumber,
            ':brand_model' => $brandModel === '' ? null : $brandModel,
            ':color' => $color === '' ? null : $color,
            ':owner_name' => $ownerName === '' ? null : $ownerName,
            ':contact_phone' => $contactPhone === '' ? null : $contactPhone,
        ]);

        json_response(['success' => true, 'message' => 'Araç bilgileri güncellendi.', 'vehicle' => getVehicleForOwner($vehicleId, $userId)]);
    }

    if ($method === 'DELETE') {
        $data = read_json_body();
        $vehicleId = (int)($data['vehicle_id'] ?? $data['vehicleId'] ?? $data['id'] ?? $_GET['id'] ?? 0);

        if ($vehicleId <= 0) {
            json_response(['success' => false, 'message' => 'Geçersiz istek.'], 400);
        }

        $existing = getVehicleForOwner($vehicleId, $userId);
        if ($existing === null) {
            json_response(['success' => false, 'message' => 'Araç bulunamadı.'], 404);
        }

        $db = getDbConnection();
        $stmt = $db->prepare('DELETE FROM vehicles WHERE id = :id AND user_id = :user_id');
        $stmt->execute([':id' => $vehicleId, ':user_id' => $userId]);

        json_response(['success' => true, 'message' => 'Araç ve bağlı QR kodları silindi.']);
    }

    json_response(['success' => false, 'message' => 'Desteklenmeyen istek metodu.'], 405);
} catch (InvalidArgumentException $e) {
    json_response(['success' => false, 'message' => $e->getMessage()], 400);
} catch (Throwable $e) {
    handle_api_error('vehicles', $e);
}
