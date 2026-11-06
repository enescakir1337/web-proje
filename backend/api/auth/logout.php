<?php
declare(strict_types=1);

require_once __DIR__ . '/../../auth.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(['success' => false, 'message' => 'Yalnızca POST istekleri kabul edilir.'], 405);
}

logout_session();

json_response(['success' => true, 'message' => 'Çıkış yapıldı.']);
