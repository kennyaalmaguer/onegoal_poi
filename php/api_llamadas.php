<?php
session_start();
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

require_once 'config/database.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'error' => 'Método no permitido']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);

if (!$input) {
    echo json_encode(['success' => false, 'error' => 'Datos JSON inválidos']);
    exit;
}

$idChat = $input['idChat'] ?? null;
$idGrupo = $input['idGrupo'] ?? null;
$idUsuarioEmisor = $input['idUsuarioEmisor'] ?? null;
$idUsuarioReceptor = $input['idUsuarioReceptor'] ?? null;
$tipo = $input['tipo'] ?? 'voz';
$estado = $input['estado'] ?? 'saliente';

// Validaciones básicas
if (!$idUsuarioEmisor) {
    echo json_encode(['success' => false, 'error' => 'ID emisor requerido']);
    exit;
}

try {
    $sql = "INSERT INTO llamada (id_chat, id_grupo, idUsuarioEmisor, idUsuarioReceptor, tipo, estado, fecha) 
            VALUES (:id_chat, :id_grupo, :idUsuarioEmisor, :idUsuarioReceptor, :tipo, :estado, NOW())";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        ':id_chat' => $idChat,
        ':id_grupo' => $idGrupo,
        ':idUsuarioEmisor' => $idUsuarioEmisor,
        ':idUsuarioReceptor' => $idUsuarioReceptor,
        ':tipo' => $tipo,
        ':estado' => $estado
    ]);
    
    $idLlamada = $pdo->lastInsertId();
    
    echo json_encode([
        'success' => true,
        'idLlamada' => $idLlamada,
        'message' => 'Llamada registrada exitosamente'
    ]);
    
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>