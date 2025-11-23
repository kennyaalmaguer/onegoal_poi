<?php
session_start();
header('Content-Type: application/json');

if (!isset($_SESSION['id_usuario'])) {
    echo json_encode(['has_new' => false]);
    exit;
}

require_once 'config/database.php';

$chat_id = $_GET['chat_id'] ?? 0;
$last_check = $_GET['last_check'] ?? 0;

try {
    $stmt = $pdo->prepare("
        SELECT COUNT(*) as new_count 
        FROM mensaje 
        WHERE id_chat = ? AND fecha_envio > FROM_UNIXTIME(?)
    ");
    $stmt->execute([$chat_id, $last_check / 1000]);
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    
    echo json_encode([
        'has_new' => $result['new_count'] > 0,
        'new_messages' => $result['new_count']
    ]);
    
} catch (PDOException $e) {
    echo json_encode(['has_new' => false, 'error' => $e->getMessage()]);
}
?>