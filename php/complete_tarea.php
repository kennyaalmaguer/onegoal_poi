<?php
session_start();
header('Content-Type: application/json');

$host = "127.0.0.1:3306";
$usuario = "root";
$clave = "";
$bd = "onegoal";

$conn = new mysqli($host, $usuario, $clave, $bd);
if ($conn->connect_error) {
    die(json_encode(['error' => 'Error de conexión: ' . $conn->connect_error]));
}

try {
    $id_usuario = isset($_SESSION['id_usuario']) ? $_SESSION['id_usuario'] : null;
    
    if (!$id_usuario) {
        echo json_encode(['success' => false, 'error' => 'Usuario no autenticado']);
        exit;
    }

    $data = json_decode(file_get_contents('php://input'), true);
    
    $taskId = $data['taskId'] ?? null;
    $taskType = $data['taskType'] ?? null;
    $response = $data['response'] ?? null;
    
    if (!$taskId || !$taskType) {
        echo json_encode(['success' => false, 'error' => 'Datos incompletos']);
        exit;
    }

    // Obtener información de la tarea
    $sql_task = "SELECT t.puntos, t.scope, t.tipo, t.nombre 
                 FROM tarea t 
                 WHERE t.id_tarea = ?";
    $stmt = $conn->prepare($sql_task);
    $stmt->bind_param("i", $taskId);
    $stmt->execute();
    $task = $stmt->get_result()->fetch_assoc();
    
    if (!$task) {
        echo json_encode(['success' => false, 'error' => 'Tarea no encontrada']);
        exit;
    }

    $puntos_a_otorgar = $task['puntos'];
    $conn->begin_transaction();

    try {
        // 1. Actualizar usuario_tarea
        $sql_update = "INSERT INTO usuario_tarea (id_usuario, id_tarea, estado, respuesta, puntos_obtenidos, fecha_completado) 
                       VALUES (?, ?, 'Completada', ?, ?, NOW())
                       ON DUPLICATE KEY UPDATE 
                       estado = 'Completada', respuesta = VALUES(respuesta), 
                       puntos_obtenidos = VALUES(puntos_obtenidos), fecha_completado = NOW()";
        
        $stmt = $conn->prepare($sql_update);
        $stmt->bind_param("iisi", $id_usuario, $taskId, $response, $puntos_a_otorgar);
        $stmt->execute();

        // 2. Actualizar puntos totales del usuario
        $sql_update_puntos = "UPDATE usuario 
                             SET puntos_totales = COALESCE(puntos_totales, 0) + ? 
                             WHERE id_usuario = ?";
        $stmt = $conn->prepare($sql_update_puntos);
        $stmt->bind_param("ii", $puntos_a_otorgar, $id_usuario);
        $stmt->execute();

        // 3. Registrar en tabla puntos (PARA TRAZABILIDAD)
        $sql_puntos = "INSERT INTO puntos (id_usuario, fuente, detalle, puntos_otorgados) 
                       VALUES (?, 'Tarea', ?, ?)";
        $stmt = $conn->prepare($sql_puntos);
        $detalle = "Tarea completada: " . $task['nombre'];
        $stmt->bind_param("isi", $id_usuario, $detalle, $puntos_a_otorgar);
        $stmt->execute();

        $conn->commit();

        echo json_encode([
            'success' => true,
            'points' => $puntos_a_otorgar,
            'message' => 'Tarea completada exitosamente'
        ]);

    } catch (Exception $e) {
        $conn->rollback();
        throw $e;
    }
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => 'Error al completar tarea: ' . $e->getMessage()
    ]);
}

$conn->close();
?>