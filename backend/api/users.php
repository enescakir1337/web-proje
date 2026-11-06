<?php
declare(strict_types=1);

require_once __DIR__ . '/../auth.php';

try {
    require_admin();
    $users = getAllUsers();
    json_response([
        'success' => true,
        'count' => count($users),
        'users' => $users
    ]);
} catch (Throwable $e) {
    handle_api_error('users', $e);
}
