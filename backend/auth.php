<?php

declare(strict_types=1);

require_once __DIR__ . '/database/db.php';

function ensure_session(): void {
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }
    $secure = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== '' && $_SERVER['HTTPS'] !== 'off');
    session_set_cookie_params([
        'httponly' => true,
        'samesite' => 'Lax',
        'secure' => $secure,
    ]);
    session_name('vizite_session');
    session_start();
}

function current_user(): ?array {
    static $cached = null;
    static $resolved = false;

    ensure_session();

    if ($resolved) {
        return $cached;
    }

    $resolved = true;

    if (empty($_SESSION['user_id'])) {
        return $cached = null;
    }

    $user = getUserById((int)$_SESSION['user_id']);

    if ($user === null) {
        return $cached = null;
    }

    return $cached = $user;
}

function require_user(): array {
    $user = current_user();
    if ($user === null) {
        json_response(['success' => false, 'message' => 'Bu işlem için giriş yapmalısınız.'], 401);
    }
    return $user;
}

function require_admin(): array {
    $user = require_user();
    if (($user['role'] ?? 'user') !== 'admin') {
        json_response(['success' => false, 'message' => 'Bu işlem için yönetici yetkisi gereklidir.'], 403);
    }
    return $user;
}

function login_session(int $userId): void {
    ensure_session();
    session_regenerate_id(true);
    $_SESSION['user_id'] = $userId;
}

function logout_session(): void {
    ensure_session();
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', [
            'expires' => time() - 42000,
            'path' => $params['path'],
            'domain' => $params['domain'],
            'secure' => $params['secure'],
            'httponly' => $params['httponly'],
            'samesite' => $params['samesite'] ?? 'Lax',
        ]);
    }
    session_destroy();
}

function client_ip(): string {
    return $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
}

function rate_limit_key(string $scope): string {
    return hash('sha256', $scope . '|' . client_ip());
}

function rate_limit(string $scope, int $maxAttempts, int $windowMinutes): void {
    $key = rate_limit_key($scope);
    if (countRecentRateLimitAttempts($key, $windowMinutes) >= $maxAttempts) {
        json_response(['success' => false, 'message' => 'Çok fazla deneme yapıldı. Lütfen ' . $windowMinutes . ' dakika sonra tekrar deneyin.'], 429);
    }
    recordRateLimitAttempt($key);
}

function json_response(array $payload, int $statusCode = 200): void {
    if (!headers_sent()) {
        http_response_code($statusCode);
        header('Content-Type: application/json; charset=utf-8');
    }
    echo json_encode($payload);
    exit;
}

function read_json_body(): array {
    $data = json_decode(file_get_contents('php://input') ?: '', true);
    return is_array($data) ? $data : $_POST;
}

function handle_api_error(string $context, Throwable $e): void {
    error_log('[66Vizite] ' . $context . ': ' . $e);
    json_response(['success' => false, 'message' => 'Sunucu hatası oluştu. Lütfen daha sonra tekrar deneyin.'], 500);
}

function send_mail(string $to, string $subject, string $body): bool {
    $host = parse_url('//' . ($_SERVER['HTTP_HOST'] ?? 'localhost'), PHP_URL_HOST) ?: 'localhost';
    $from = 'no-reply@' . preg_replace('/[^a-zA-Z0-9.\-]/', '', $host);
    $headers = [
        'From: 66 Vizite <' . $from . '>',
        'Content-Type: text/plain; charset=UTF-8',
        'Content-Transfer-Encoding: 8bit',
    ];
    error_log('[66Vizite] Mail Denemesi: ' . $to . ' | ' . $subject);
    return @mail($to, $subject, $body, implode("\r\n", $headers), '-f' . $from);
}
