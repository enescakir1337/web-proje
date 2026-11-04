<?php
require_once __DIR__ . '/backend/database/db.php';
try {
    $result = createVehicle(1, 'TEST123', 'Test Model', 'Beyaz', 'Test Kisi', '+905551234567');
    var_dump($result);
} catch (Throwable $e) {
    echo $e->getMessage();
}
?>
