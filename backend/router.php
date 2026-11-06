<?php

declare(strict_types=1);

/*
 * PHP built-in sunucu router (gelistirme / baslat.sh):
 *   php -S 0.0.0.0:8000 -t frontend backend/router.php
 *
 * API istekleri tek route tablosu icin backend/api/index.php'ye devredilir.
 * Shared hosting'te (Apache) bu dosya kullanilmaz; orada .htaccess gecerlidir.
 */

$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$frontendDir = dirname(__DIR__) . DIRECTORY_SEPARATOR . 'frontend';

if ($uri === '/api' || str_starts_with($uri, '/api/')) {
    require __DIR__ . '/api/index.php';
    return true;
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
