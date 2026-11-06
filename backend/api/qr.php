<?php
declare(strict_types=1);

require_once __DIR__ . '/../auth.php';

try {
    $token = trim((string)($_GET['token'] ?? ''));
    if ($token === '') {
        json_response(['success' => false, 'message' => 'QR token gerekli.'], 400);
    }

    $qr = getActiveQrByToken($token);

    if (!$qr) {
        json_response(['success' => false, 'message' => 'QR vizite bilgisi bulunamadı veya kart devre dışı.'], 404);
    }

    incrementQrScanCount((int)$qr['id']);
    $qr = getActiveQrByToken($token);

    json_response(['success' => true, 'qr' => $qr]);
} catch (Throwable $e) {
    handle_api_error('qr-scan', $e);
}
