<?php
declare(strict_types=1);

require_once __DIR__ . '/../auth.php';

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

try {
    $admin = require_admin();
    $adminId = (int)$admin['id'];

    if ($method === 'GET') {
        json_response([
            'success' => true,
            'stats' => getAdminStats(),
            'users' => getAllUsers()
        ]);
    }

    if ($method === 'POST') {
        $data = read_json_body();
        $action = trim((string)($data['action'] ?? ''));
        $targetId = (int)($data['user_id'] ?? $data['userId'] ?? 0);

        if ($action === 'update') {
            $role = trim((string)($data['role'] ?? ''));
            $plan = trim((string)($data['plan_tier'] ?? $data['plan'] ?? ''));

            if ($targetId <= 0 || getUserById($targetId) === null) {
                json_response(['success' => false, 'message' => 'Kullanıcı bulunamadı.'], 404);
            }

            if (!in_array($role, ['admin', 'member', 'business', 'user'], true)) {
                json_response(['success' => false, 'message' => 'Geçersiz rol seçimi.'], 400);
            }

            if (!in_array($plan, ['free', 'pro', 'business'], true)) {
                json_response(['success' => false, 'message' => 'Geçersiz plan seçimi.'], 400);
            }

            if ($targetId === $adminId && $role !== 'admin') {
                json_response(['success' => false, 'message' => 'Kendi yönetici yetkinizi kaldıramazsınız.'], 400);
            }

            updateAdminUserFields($targetId, $role, $plan);
            json_response(['success' => true, 'message' => 'Kullanıcı bilgileri güncellendi.']);
        }

        if ($action === 'delete') {
            if ($targetId <= 0) {
                json_response(['success' => false, 'message' => 'Geçersiz istek.'], 400);
            }
            if ($targetId === $adminId) {
                json_response(['success' => false, 'message' => 'Kendi hesabınızı silemezsiniz.'], 400);
            }
            if (!deleteUserById($targetId)) {
                json_response(['success' => false, 'message' => 'Kullanıcı bulunamadı.'], 404);
            }
            json_response(['success' => true, 'message' => 'Kullanıcı ve tüm verileri silindi.']);
        }

        json_response(['success' => false, 'message' => 'Geçersiz işlem.'], 400);
    }

    json_response(['success' => false, 'message' => 'Desteklenmeyen istek metodu.'], 405);
} catch (Throwable $e) {
    handle_api_error('admin-users', $e);
}
