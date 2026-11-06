<?php

declare(strict_types=1);

/*
 * API front controller.
 * Tum /api/* rotalari tek tablodan cozulur:
 *  - PHP built-in sunucuda router.php bu dosyaya devreder (backend -t frontend).
 *  - Shared hosting (Apache) icin .htaccess /api/* isteklerini buraya yonlendirir.
 */

$uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);

$routes = [
    '/api/auth/register' => __DIR__ . '/auth/register.php',
    '/api/auth/login' => __DIR__ . '/auth/login.php',
    '/api/auth/logout' => __DIR__ . '/auth/logout.php',
    '/api/auth/forgot' => __DIR__ . '/auth/forgot.php',
    '/api/auth/reset' => __DIR__ . '/auth/reset.php',
    '/api/profile' => __DIR__ . '/profile.php',
    '/api/users' => __DIR__ . '/users.php',
    '/api/user/update-plan' => __DIR__ . '/user_update_plan.php',
    '/api/dashboard' => __DIR__ . '/dashboard.php',
    '/api/vehicles' => __DIR__ . '/vehicles.php',
    '/api/qr-codes' => __DIR__ . '/qr_codes.php',
    '/api/purchases' => __DIR__ . '/purchases.php',
    '/api/qr' => __DIR__ . '/qr.php',
    '/api/admin/users' => __DIR__ . '/admin_users.php',
];

if (isset($routes[$uri])) {
    require $routes[$uri];
    exit;
}

http_response_code(404);
header('Content-Type: application/json; charset=utf-8');
echo json_encode(['success' => false, 'message' => 'Bilinmeyen API ucu.']);
