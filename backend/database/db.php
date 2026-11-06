<?php

declare(strict_types=1);

function getDbConnection(): PDO {
    static $pdo = null;

    if ($pdo === null) {
        $dbPath = __DIR__ . DIRECTORY_SEPARATOR . '66Vizite.db';
        $schemaPath = __DIR__ . DIRECTORY_SEPARATOR . 'schema.sql';

        $pdo = new PDO('sqlite:' . $dbPath);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
        $pdo->exec('PRAGMA foreign_keys = ON;');

        if (is_file($schemaPath)) {
            $pdo->exec(file_get_contents($schemaPath));
        }
    }

    return $pdo;
}

function registerUser(string $fullName, string $email, string $password, string $planTier = 'free', string $phoneNumber = '', string $occupation = '', string $role = 'user'): array {
    $db = getDbConnection();
    $email = strtolower(trim($email));
    $fullName = trim($fullName);
    $phoneNumber = trim($phoneNumber);
    $occupation = trim($occupation);
    $role = $role === '' ? 'user' : $role;

    $checkStmt = $db->prepare('SELECT id FROM users WHERE email = :email');
    $checkStmt->execute([':email' => $email]);

    if ($checkStmt->fetch()) {
        throw new InvalidArgumentException('Bu e-posta adresi ile kayıtlı bir hesap zaten var.');
    }

    $insertStmt = $db->prepare('
        INSERT INTO users (full_name, email, password_hash, salt, phone_number, occupation, role, plan_tier)
        VALUES (:full_name, :email, :password_hash, :salt, :phone_number, :occupation, :role, :plan_tier)
    ');

    $insertStmt->execute([
        ':full_name' => $fullName,
        ':email' => $email,
        ':password_hash' => password_hash($password, PASSWORD_BCRYPT),
        ':salt' => bin2hex(random_bytes(16)),
        ':phone_number' => $phoneNumber === '' ? null : $phoneNumber,
        ':occupation' => $occupation === '' ? null : $occupation,
        ':role' => $role,
        ':plan_tier' => $planTier,
    ]);

    $userId = (int)$db->lastInsertId();

    return [
        'id' => $userId,
        'fullName' => $fullName,
        'email' => $email,
        'planTier' => $planTier,
        'role' => $role,
        'phoneNumber' => $phoneNumber === '' ? null : $phoneNumber,
        'occupation' => $occupation === '' ? null : $occupation,
    ];
}

function authenticateUser(string $email, string $password): array {
    $db = getDbConnection();
    $stmt = $db->prepare('SELECT * FROM users WHERE email = :email');
    $stmt->execute([':email' => strtolower(trim($email))]);
    $user = $stmt->fetch();

    if (!$user) {
        throw new InvalidArgumentException('E-posta adresi veya şifre hatalı.');
    }

    $isPasswordValid = password_verify($password, $user['password_hash']);

    if (!$isPasswordValid && !empty($user['salt'])) {
        $pbkdf2Hash = hash_pbkdf2('sha512', $password, $user['salt'], 100000, 128);
        $isPasswordValid = hash_equals($user['password_hash'], $pbkdf2Hash);
    }

    if (!$isPasswordValid) {
        throw new InvalidArgumentException('E-posta adresi veya şifre hatalı.');
    }

    return [
        'id' => (int)$user['id'],
        'fullName' => $user['full_name'],
        'email' => $user['email'],
        'planTier' => $user['plan_tier'] ?? 'free',
        'role' => $user['role'] ?? 'user',
        'createdAt' => $user['created_at'] ?? null,
    ];
}

function getAllUsers(): array {
    $stmt = getDbConnection()->query('SELECT id, full_name, email, role, plan_tier, created_at FROM users ORDER BY id DESC');
    return $stmt->fetchAll();
}

function getUserById(int $userId): ?array {
    $db = getDbConnection();
    $stmt = $db->prepare('SELECT id, full_name, email, plan_tier, phone_number, created_at FROM users WHERE id = :id');
    $stmt->execute([':id' => $userId]);
    $user = $stmt->fetch();
    return $user ?: null;
}

function createVehicle(int $userId, string $plateNumber, string $brandModel = '', string $color = '', string $ownerName = '', string $contactPhone = ''): array {
    $db = getDbConnection();
    $stmt = $db->prepare('
        INSERT INTO vehicles (user_id, plate_number, brand_model, color, owner_name, contact_phone)
        VALUES (:user_id, :plate_number, :brand_model, :color, :owner_name, :contact_phone)
    ');
    $stmt->execute([
        ':user_id' => $userId,
        ':plate_number' => trim($plateNumber),
        ':brand_model' => trim($brandModel),
        ':color' => trim($color),
        ':owner_name' => trim($ownerName) === '' ? null : trim($ownerName),
        ':contact_phone' => trim($contactPhone) === '' ? null : trim($contactPhone),
    ]);
    return [
        'id' => (int)$db->lastInsertId(),
        'userId' => $userId,
        'plateNumber' => trim($plateNumber),
        'brandModel' => trim($brandModel),
        'color' => trim($color),
        'ownerName' => trim($ownerName) === '' ? null : trim($ownerName),
        'contactPhone' => trim($contactPhone) === '' ? null : trim($contactPhone),
    ];
}

function getVehiclesByUserId(int $userId): array {
    $db = getDbConnection();
    $stmt = $db->prepare('SELECT * FROM vehicles WHERE user_id = :user_id ORDER BY id DESC');
    $stmt->execute([':user_id' => $userId]);
    return $stmt->fetchAll();
}

function createQrCode(int $vehicleId, ?int $purchaseId = null, string $callNumber = '', string $autoMessage = ''): array {
    $db = getDbConnection();

    $vehStmt = $db->prepare('SELECT * FROM vehicles WHERE id = :id');
    $vehStmt->execute([':id' => $vehicleId]);
    $vehicle = $vehStmt->fetch();

    if ($purchaseId === null && $vehicle && isset($vehicle['user_id'])) {
        $pStmt = $db->prepare('SELECT id FROM purchases WHERE user_id = :uid AND status = "completed" ORDER BY id DESC LIMIT 1');
        $pStmt->execute([':uid' => $vehicle['user_id']]);
        $pRow = $pStmt->fetch();
        if ($pRow) {
            $purchaseId = (int)$pRow['id'];
        }
    }

    $qrToken = bin2hex(random_bytes(32));
    $stmt = $db->prepare('
        INSERT INTO qr_codes (vehicle_id, qr_token, purchase_id, call_number, auto_message)
        VALUES (:vehicle_id, :qr_token, :purchase_id, :call_number, :auto_message)
    ');
    $stmt->execute([
        ':vehicle_id' => $vehicleId,
        ':qr_token' => $qrToken,
        ':purchase_id' => $purchaseId,
        ':call_number' => trim($callNumber) === '' ? null : trim($callNumber),
        ':auto_message' => trim($autoMessage) === '' ? null : trim($autoMessage),
    ]);

    $newId = (int)$db->lastInsertId();

    return [
        'id' => $newId,
        'vehicle_id' => $vehicleId,
        'vehicleId' => $vehicleId,
        'qr_token' => $qrToken,
        'qrToken' => $qrToken,
        'purchase_id' => $purchaseId,
        'purchaseId' => $purchaseId,
        'is_active' => 1,
        'isActive' => 1,
        'call_number' => trim($callNumber) === '' ? ($vehicle['contact_phone'] ?? null) : trim($callNumber),
        'callNumber' => trim($callNumber) === '' ? ($vehicle['contact_phone'] ?? null) : trim($callNumber),
        'auto_message' => trim($autoMessage) === '' ? null : trim($autoMessage),
        'autoMessage' => trim($autoMessage) === '' ? null : trim($autoMessage),
        'plate_number' => $vehicle['plate_number'] ?? '',
        'brand_model' => $vehicle['brand_model'] ?? '',
        'color' => $vehicle['color'] ?? '',
        'created_at' => date('Y-m-d H:i:s'),
    ];
}

function getQrCodesByUserId(int $userId): array {
    $db = getDbConnection();
    $stmt = $db->prepare('
        SELECT qc.*, v.plate_number, v.brand_model, v.color, v.user_id, p.package_name, p.amount
        FROM qr_codes qc
        LEFT JOIN vehicles v ON v.id = qc.vehicle_id
        LEFT JOIN purchases p ON p.id = qc.purchase_id
        WHERE v.user_id = :user_id OR qc.vehicle_id IN (SELECT id FROM vehicles WHERE user_id = :user_id2)
        ORDER BY qc.created_at DESC
    ');
    $stmt->execute([':user_id' => $userId, ':user_id2' => $userId]);
    return $stmt->fetchAll();
}

function getPurchasedQrCodesByUserId(int $userId): array {
    $db = getDbConnection();
    $stmt = $db->prepare('
        SELECT qc.*, v.plate_number, v.brand_model, v.color, v.user_id, p.package_name, p.amount, p.created_at as purchase_date
        FROM qr_codes qc
        LEFT JOIN vehicles v ON v.id = qc.vehicle_id
        LEFT JOIN purchases p ON p.id = qc.purchase_id
        WHERE v.user_id = :user_id OR qc.vehicle_id IN (SELECT id FROM vehicles WHERE user_id = :user_id2)
        ORDER BY qc.created_at DESC
    ');
    $stmt->execute([':user_id' => $userId, ':user_id2' => $userId]);
    return $stmt->fetchAll();
}

function getPurchasesByUserId(int $userId): array {
    $db = getDbConnection();
    $stmt = $db->prepare('SELECT * FROM purchases WHERE user_id = :user_id ORDER BY created_at DESC');
    $stmt->execute([':user_id' => $userId]);
    return $stmt->fetchAll();
}

function createPurchase(int $userId, string $packageName, int $quantity = 1, float $amount = 0): array {
    $db = getDbConnection();
    $stmt = $db->prepare('
        INSERT INTO purchases (user_id, package_name, quantity, amount, status)
        VALUES (:user_id, :package_name, :quantity, :amount, :status)
    ');
    $stmt->execute([
        ':user_id' => $userId,
        ':package_name' => $packageName,
        ':quantity' => $quantity,
        ':amount' => $amount,
        ':status' => 'completed',
    ]);
    return [
        'id' => (int)$db->lastInsertId(),
        'userId' => $userId,
        'packageName' => $packageName,
        'quantity' => $quantity,
        'amount' => $amount,
    ];
}
