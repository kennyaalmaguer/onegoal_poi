<?php
session_start();
header('Content-Type: application/json');
require_once 'api/db.php';

// Desactivar errores HTML para evitar el <br /> en la respuesta
ini_set('display_errors', 0);
error_reporting(E_ALL);

// Log para debugging
file_put_contents('debug.log', date('Y-m-d H:i:s') . " - Llamada recibida\n", FILE_APPEND);

try {
    // Verificar autenticación
    if (!isset($_SESSION['id_usuario'])) {
        throw new Exception('No autenticado');
    }

    // Obtener y validar datos JSON
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input || json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception('Datos JSON inválidos: ' . json_last_error_msg());
    }

    // Validar datos requeridos
    $required = ['idUsuarioEmisor', 'tipo', 'estado'];
    foreach ($required as $field) {
        if (!isset($input[$field]) || empty($input[$field])) {
            throw new Exception("Campo requerido: $field");
        }
    }

    // Insertar en BD
    $sql = "INSERT INTO llamada (id_chat, id_grupo, idUsuarioEmisor, idUsuarioReceptor, tipo, estado, fecha) 
            VALUES (:id_chat, :id_grupo, :idUsuarioEmisor, :idUsuarioReceptor, :tipo, :estado, NOW())";
    
    $stmt = $pdo->prepare($sql);
    $success = $stmt->execute([
        ':id_chat' => $input['id_chat'] ?? null,
        ':id_grupo' => $input['id_grupo'] ?? null,
        ':idUsuarioEmisor' => $input['idUsuarioEmisor'],
        ':idUsuarioReceptor' => $input['idUsuarioReceptor'] ?? null,
        ':tipo' => $input['tipo'],
        ':estado' => $input['estado']
    ]);
    
    if (!$success) {
        throw new Exception('Error al ejecutar la consulta');
    }
    
    $idLlamada = $pdo->lastInsertId();
    
    // Respuesta exitosa
    echo json_encode([
        'success' => true,
        'idLlamada' => $idLlamada,
        'message' => 'Llamada registrada exitosamente'
    ]);
    
} catch (Exception $e) {
    // Log del error
    file_put_contents('debug.log', date('Y-m-d H:i:s') . " - ERROR: " . $e->getMessage() . "\n", FILE_APPEND);
    
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>