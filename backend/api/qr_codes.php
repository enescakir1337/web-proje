<?php
declare(strict_types=1);

require_once __DIR__ . '/../auth.php';

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

try {
    $user = require_user();
    $userId = (int)$user['id'];

    if ($method === 'GET') {
        $qrCodes = getQrCodesByUserId($userId);
        json_response(['success' => true, 'qrCodes' => $qrCodes]);
    }

    if ($method === 'POST') {
        $data = read_json_body();

        $vehicleId = (int)($data['vehicle_id'] ?? $data['vehicleId'] ?? 0);
        $purchaseId = $data['purchase_id'] ?? $data['purchaseId'] ?? null;
        $purchaseId = ($purchaseId === null || (int)$purchaseId === 0) ? null : (int)$purchaseId;
        $callNumber = trim((string)($data['callNumber'] ?? $data['call_number'] ?? $data['phone'] ?? $data['telefon'] ?? ''));
        $autoMessage = trim((string)($data['autoMessage'] ?? $data['auto_message'] ?? $data['mesaj'] ?? ''));

        if ($vehicleId <= 0) {
            json_response(['success' => false, 'message' => 'Lütfen geçerli bir araç seçin.'], 400);
        }

        $vehicle = getVehicleForOwner($vehicleId, $userId);
        if ($vehicle === null) {
            json_response(['success' => false, 'message' => 'Seçilen araç bulunamadı.'], 404);
        }

        $qrCode = createQrCode($vehicleId, $purchaseId, $callNumber, $autoMessage);
        json_response([
            'success' => true,
            'message' => 'QR vizit kartı başarıyla oluşturuldu.',
            'qrCode' => $qrCode
        ], 201);
    }

    if ($method === 'PATCH' || $method === 'PUT') {
        $data = read_json_body();
        $qrId = (int)($data['id'] ?? $data['qr_id'] ?? $data['qrId'] ?? 0);
        $action = trim((string)($data['action'] ?? ''));

        if ($qrId <= 0) {
            json_response(['success' => false, 'message' => 'Geçersiz istek.'], 400);
        }

        if ($action === 'toggle') {
            $active = (int)($data['is_active'] ?? $data['isActive'] ?? 0) === 1;
            if (!setQrActive($qrId, $userId, $active)) {
                json_response(['success' => false, 'message' => 'QR kartı bulunamadı.'], 404);
            }
            json_response([
                'success' => true,
                'message' => $active ? 'QR kartı etkinleştirildi.' : 'QR kartı devre dışı bırakıldı.',
                'qrCode' => ['id' => $qrId, 'is_active' => $active ? 1 : 0]
            ]);
        }

        if ($action === 'rotate') {
            $updated = rotateQrToken($qrId, $userId);
            if ($updated === null) {
                json_response(['success' => false, 'message' => 'QR kartı bulunamadı.'], 404);
            }
            json_response(['success' => true, 'message' => 'QR kartı bağlantısı yenilendi. Eski basılı kartlar geçersizdir.', 'qrCode' => $updated]);
        }

        json_response(['success' => false, 'message' => 'Geçersiz işlem.'], 400);
    }

    if ($method === 'DELETE') {
        $data = read_json_body();
        $qrId = (int)($data['id'] ?? $data['qr_id'] ?? $data['qrId'] ?? $_GET['id'] ?? 0);

        if ($qrId <= 0) {
            json_response(['success' => false, 'message' => 'Geçersiz istek.'], 400);
        }

        if (!deleteQrCodeByOwner($qrId, $userId)) {
            json_response(['success' => false, 'message' => 'QR kartı bulunamadı.'], 404);
        }

        json_response(['success' => true, 'message' => 'QR kartı silindi.']);
    }

    json_response(['success' => false, 'message' => 'Desteklenmeyen istek metodu.'], 405);
} catch (InvalidArgumentException $e) {
    json_response(['success' => false, 'message' => $e->getMessage()], 400);
} catch (Throwable $e) {
    handle_api_error('qr-codes', $e);
}
