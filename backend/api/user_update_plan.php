<?php
declare(strict_types=1);

require_once __DIR__ . '/../auth.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(['success' => false, 'message' => 'Yalnızca POST istekleri kabul edilir.'], 405);
}

try {
    $user = require_user();
    $data = read_json_body();

    $targetUserId = (int)$user['id'];
    $requestedId = (int)($data['user_id'] ?? $data['userId'] ?? 0);
    if ($requestedId > 0 && ($user['role'] ?? 'user') === 'admin') {
        $targetUserId = $requestedId;
    }

    $plan = trim((string)($data['plan'] ?? $data['plan_tier'] ?? 'pro'));

    if (!in_array($plan, ['free', 'pro', 'business'], true)) {
        json_response(['success' => false, 'message' => 'Geçersiz plan seçimi.'], 400);
    }

    $targetUser = getUserById($targetUserId);
    if ($targetUser === null) {
        json_response(['success' => false, 'message' => 'Kullanıcı bulunamadı.'], 404);
    }

    $previousPlan = (string)($targetUser['plan_tier'] ?? 'free');

    if ($previousPlan === $plan) {
        json_response(['success' => true, 'message' => 'Planınız zaten aktif.', 'plan' => $plan, 'changed' => false]);
    }

    setPlanTier($targetUserId, $plan);

    if ($plan !== 'free') {
        createPurchase($targetUserId, $plan === 'business' ? 'QR Vizite Paketi (Business)' : 'QR Vizite Paketi (Pro)', 1, 299.00);
    }

    json_response(['success' => true, 'message' => 'Plan başarıyla güncellendi.', 'plan' => $plan, 'changed' => true]);
} catch (Throwable $e) {
    handle_api_error('update-plan', $e);
}
