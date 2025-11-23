<?php
session_start();
header('Content-Type: application/json');
require_once 'config/database.php';

if (!isset($_SESSION['id_usuario'])) {
    echo json_encode(['success' => false, 'error' => 'No autenticado']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);

if (!$input || !isset($input['idLlamada']) || !isset($input['estado'])) {
    echo json_encode(['success' => false, 'error' => 'Datos inválidos']);
    exit;
}

$idLlamada = $input['idLlamada'];
$estado = $input['estado'];

try {
    $sql = "UPDATE llamada SET estado = :estado WHERE idLlamada = :idLlamada";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        ':estado' => $estado,
        ':idLlamada' => $idLlamada
    ]);
    
    echo json_encode([
        'success' => true,
        'message' => 'Estado actualizado'
    ]);
    
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>