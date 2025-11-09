<?php
header('Content-Type: application/json');
include 'conexion.php';

$chat_id = $_GET['chat_id'] ?? null;
$last_check = $_GET['last_check'] ?? 0;

if (!$chat_id) {
    echo json_encode(['has_new' => false]);
    exit;
}

// Busca mensajes nuevos después del último check
$sql = "SELECT COUNT(*) as count FROM mensajes 
        WHERE id_chat = ? AND fecha_envio > FROM_UNIXTIME(?)";
$stmt = $pdo->prepare($sql);
$stmt->execute([$chat_id, $last_check]);
$result = $stmt->fetch();

echo json_encode([
    'has_new' => $result['count'] > 0,
    'timestamp' => time()
]);
?>