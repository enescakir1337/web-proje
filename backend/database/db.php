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

function registerUser(string $fullName, string $email, string $password, string $planTier = 'free', string $phoneNumber = '', string $occupation = ''): array {
    $db = getDbConnection();
    $email = strtolower(trim($email));
    $fullName = trim($fullName);
    $phoneNumber = trim($phoneNumber);
    $occupation = trim($occupation);
    $role = 'user';

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        throw new InvalidArgumentException('Geçerli bir e-posta adresi giriniz.');
    }

    if (!in_array($planTier, ['free', 'pro', 'business'], true)) {
        $planTier = 'free';
    }

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
    $stmt = $db->prepare('SELECT id, full_name, email, plan_tier, role, phone_number, occupation, created_at FROM users WHERE id = :id');
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

    if (!$vehicle) {
        throw new InvalidArgumentException('Seçilen araç bulunamadı.');
    }

    if ($purchaseId === null && $vehicle && isset($vehicle['user_id'])) {
        $pStmt = $db->prepare('SELECT id FROM purchases WHERE user_id = :uid AND status = \'completed\' ORDER BY id DESC LIMIT 1');
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
        INNER JOIN vehicles v ON v.id = qc.vehicle_id
        LEFT JOIN purchases p ON p.id = qc.purchase_id
        WHERE v.user_id = :user_id
        ORDER BY qc.created_at DESC
    ');
    $stmt->execute([':user_id' => $userId]);
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

function gecerliAracRenkleri(): array {
    return [
        'Beyaz', 'Siyah', 'Gri', 'Gümüş', 'Krem', 'Bej', 'Kırmızı', 'Bordo',
        'Turuncu', 'Sarı', 'Yeşil', 'Turkuaz', 'Mavi', 'Lacivert', 'Mor',
        'Pembe', 'Kahverengi', 'Altın',
    ];
}

function findVehicleByPlate(int $userId, string $plateNumber, int $excludeId = 0): ?array {
    $db = getDbConnection();
    $stmt = $db->prepare('SELECT * FROM vehicles WHERE user_id = :user_id AND plate_number = :plate AND id != :exclude LIMIT 1');
    $stmt->execute([':user_id' => $userId, ':plate' => trim($plateNumber), ':exclude' => $excludeId]);
    $row = $stmt->fetch();
    return $row ?: null;
}

function getVehicleForOwner(int $vehicleId, int $userId): ?array {
    $db = getDbConnection();
    $stmt = $db->prepare('SELECT * FROM vehicles WHERE id = :id AND user_id = :user_id');
    $stmt->execute([':id' => $vehicleId, ':user_id' => $userId]);
    $row = $stmt->fetch();
    return $row ?: null;
}

function getActiveQrByToken(string $token): ?array {
    $db = getDbConnection();
    $stmt = $db->prepare('
        SELECT qc.*, v.plate_number, v.brand_model, v.color, v.owner_name, v.contact_phone as vehicle_contact
        FROM qr_codes qc
        LEFT JOIN vehicles v ON v.id = qc.vehicle_id
        WHERE qc.qr_token = :token AND qc.is_active = 1
    ');
    $stmt->execute([':token' => $token]);
    $row = $stmt->fetch();
    return $row ?: null;
}

function incrementQrScanCount(int $qrId): void {
    $db = getDbConnection();
    $db->prepare('UPDATE qr_codes SET scan_count = scan_count + 1 WHERE id = :id AND is_active = 1')->execute([':id' => $qrId]);
}

function setQrActive(int $qrId, int $userId, bool $active): bool {
    $db = getDbConnection();
    $stmt = $db->prepare('
        UPDATE qr_codes SET is_active = :active
        WHERE id = :id AND vehicle_id IN (SELECT id FROM vehicles WHERE user_id = :user_id)
    ');
    $stmt->execute([':active' => $active ? 1 : 0, ':id' => $qrId, ':user_id' => $userId]);
    return $stmt->rowCount() > 0;
}

function rotateQrToken(int $qrId, int $userId): ?array {
    $db = getDbConnection();
    $check = $db->prepare('
        SELECT qc.id FROM qr_codes qc
        INNER JOIN vehicles v ON v.id = qc.vehicle_id
        WHERE qc.id = :id AND v.user_id = :user_id
    ');
    $check->execute([':id' => $qrId, ':user_id' => $userId]);
    if (!$check->fetch()) {
        return null;
    }

    $qrToken = bin2hex(random_bytes(32));
    $stmt = $db->prepare('UPDATE qr_codes SET qr_token = :token, is_active = 1 WHERE id = :id');
    $stmt->execute([':token' => $qrToken, ':id' => $qrId]);

    $fetch = $db->prepare('
        SELECT qc.*, v.plate_number, v.brand_model, v.color, v.user_id, p.package_name, p.amount
        FROM qr_codes qc
        LEFT JOIN vehicles v ON v.id = qc.vehicle_id
        LEFT JOIN purchases p ON p.id = qc.purchase_id
        WHERE qc.id = :id
    ');
    $fetch->execute([':id' => $qrId]);
    $row = $fetch->fetch();
    return $row ?: null;
}

function deleteQrCodeByOwner(int $qrId, int $userId): bool {
    $db = getDbConnection();
    $stmt = $db->prepare('
        DELETE FROM qr_codes
        WHERE id = :id AND vehicle_id IN (SELECT id FROM vehicles WHERE user_id = :user_id)
    ');
    $stmt->execute([':id' => $qrId, ':user_id' => $userId]);
    return $stmt->rowCount() > 0;
}

function setPlanTier(int $userId, string $plan): bool {
    $db = getDbConnection();
    $stmt = $db->prepare("UPDATE users SET plan_tier = :plan, updated_at = CURRENT_TIMESTAMP WHERE id = :id");
    $stmt->execute([':plan' => $plan, ':id' => $userId]);
    return $stmt->rowCount() > 0;
}

function updateUserProfile(int $userId, string $fullName, string $phoneNumber, string $occupation): void {
    $db = getDbConnection();
    $stmt = $db->prepare("UPDATE users SET full_name = :full_name, phone_number = :phone_number, occupation = :occupation, updated_at = CURRENT_TIMESTAMP WHERE id = :id");
    $stmt->execute([
        ':full_name' => trim($fullName),
        ':phone_number' => trim($phoneNumber) === '' ? null : trim($phoneNumber),
        ':occupation' => trim($occupation) === '' ? null : trim($occupation),
        ':id' => $userId,
    ]);
}

function updateUserPassword(int $userId, string $newPassword): void {
    $db = getDbConnection();
    $stmt = $db->prepare("UPDATE users SET password_hash = :hash, updated_at = CURRENT_TIMESTAMP WHERE id = :id");
    $stmt->execute([':hash' => password_hash($newPassword, PASSWORD_BCRYPT), ':id' => $userId]);
}

function verifyCurrentPassword(int $userId, string $password): bool {
    $db = getDbConnection();
    $stmt = $db->prepare('SELECT password_hash, salt FROM users WHERE id = :id');
    $stmt->execute([':id' => $userId]);
    $user = $stmt->fetch();
    if (!$user) {
        return false;
    }
    if (password_verify($password, $user['password_hash'])) {
        return true;
    }
    if (!empty($user['salt'])) {
        return hash_equals($user['password_hash'], hash_pbkdf2('sha512', $password, $user['salt'], 100000, 128));
    }
    return false;
}

function recordRateLimitAttempt(string $attemptKey): void {
    $db = getDbConnection();
    $db->prepare('INSERT INTO login_attempts (attempt_key) VALUES (:key)')->execute([':key' => $attemptKey]);
    $db->prepare("DELETE FROM login_attempts WHERE attempted_at < datetime('now', '-1 day')")->execute();
}

function countRecentRateLimitAttempts(string $attemptKey, int $windowMinutes = 15): int {
    $db = getDbConnection();
    $stmt = $db->prepare("SELECT COUNT(*) FROM login_attempts WHERE attempt_key = :key AND attempted_at >= datetime('now', :window)");
    $stmt->execute([':key' => $attemptKey, ':window' => sprintf('-%d minutes', $windowMinutes)]);
    return (int)$stmt->fetchColumn();
}

function createPasswordResetToken(int $userId, int $ttlSeconds = 3600): string {
    $db = getDbConnection();
    $db->prepare("DELETE FROM password_resets WHERE user_id = :user_id OR expires_at < datetime('now')")->execute([':user_id' => $userId]);
    $token = bin2hex(random_bytes(32));
    $stmt = $db->prepare('INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES (:user_id, :token_hash, :expires_at)');
    $stmt->execute([
        ':user_id' => $userId,
        ':token_hash' => hash('sha256', $token),
        ':expires_at' => gmdate('Y-m-d H:i:s', time() + $ttlSeconds),
    ]);
    return $token;
}

function resetPasswordWithToken(string $rawToken, string $newPassword): array {
    $db = getDbConnection();
    $stmt = $db->prepare("DELETE FROM password_resets WHERE expires_at < datetime('now')");
    $stmt->execute();

    $stmt = $db->prepare('SELECT id, user_id FROM password_resets WHERE token_hash = :hash AND expires_at >= datetime(\'now\')');
    $stmt->execute([':hash' => hash('sha256', $rawToken)]);
    $row = $stmt->fetch();

    if (!$row) {
        throw new InvalidArgumentException('Şifre sıfırlama bağlantısı geçersiz veya süresi dolmuş.');
    }

    updateUserPassword((int)$row['user_id'], $newPassword);

    $db->prepare('DELETE FROM password_resets WHERE id = :id')->execute([':id' => (int)$row['id']]);

    return ['user_id' => (int)$row['user_id']];
}

function getAdminStats(): array {
    $db = getDbConnection();
    return [
        'userCount' => (int)$db->query('SELECT COUNT(*) FROM users')->fetchColumn(),
        'vehicleCount' => (int)$db->query('SELECT COUNT(*) FROM vehicles')->fetchColumn(),
        'activeQrCount' => (int)$db->query('SELECT COUNT(*) FROM qr_codes WHERE is_active = 1')->fetchColumn(),
        'totalScans' => (int)$db->query('SELECT COALESCE(SUM(scan_count), 0) FROM qr_codes')->fetchColumn(),
    ];
}

function deleteUserById(int $userId): bool {
    $db = getDbConnection();
    $stmt = $db->prepare('DELETE FROM users WHERE id = :id');
    $stmt->execute([':id' => $userId]);
    return $stmt->rowCount() > 0;
}

function updateAdminUserFields(int $userId, string $role, string $planTier): bool {
    $db = getDbConnection();
    $stmt = $db->prepare("UPDATE users SET role = :role, plan_tier = :plan_tier, updated_at = CURRENT_TIMESTAMP WHERE id = :id");
    $stmt->execute([':role' => $role, ':plan_tier' => $planTier, ':id' => $userId]);
    return $stmt->rowCount() > 0;
}

