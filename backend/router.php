<?php

declare(strict_types=1);

$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$frontendDir = dirname(__DIR__) . DIRECTORY_SEPARATOR . 'frontend';

$routes = [
    '/api/auth/register' => __DIR__ . '/api/auth/register.php',
    '/api/auth/login' => __DIR__ . '/api/auth/login.php',
    '/api/users' => __DIR__ . '/api/users.php',
    '/api/user/update-plan' => __DIR__ . '/api/user_update_plan.php',
    '/api/dashboard' => __DIR__ . '/api/dashboard.php',
    '/api/vehicles' => __DIR__ . '/api/vehicles.php',
    '/api/qr-codes' => __DIR__ . '/api/qr_codes.php',
    '/api/purchases' => __DIR__ . '/api/purchases.php',
    '/api/qr' => __DIR__ . '/api/qr.php',
];

if (isset($routes[$uri])) {
    require $routes[$uri];
    exit;
}

if ($uri === '/' || $uri === '') {
    require $frontendDir . DIRECTORY_SEPARATOR . 'index.html';
    exit;
}

$filePath = realpath($frontendDir . $uri);

if ($filePath && str_starts_with($filePath, $frontendDir) && is_file($filePath)) {
    return false;
}

http_response_code(404);
header('Content-Type: text/html; charset=utf-8');
echo '<h1>404 - Sayfa veya Dosya Bulunamadı</h1><p><a href="/">Ana Sayfaya Dön</a></p>';
