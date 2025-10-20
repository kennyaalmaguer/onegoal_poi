<?php
session_start();
header('Content-Type: application/json');

$host = "127.0.0.1:3307";
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
    
    $id_tarea = $data['taskId'] ?? null;
    $respuesta = $data['response'] ?? null;
    $tipo_tarea = $data['taskType'] ?? null;
    
    // Verificar que la tarea existe y el usuario tiene acceso
    $sql_check = "SELECT 
                    t.id_tarea, 
                    t.puntos,
                    t.scope,
                    t.id_grupo,
                    ut.id_usuario_tarea
                 FROM tarea t
                 LEFT JOIN usuario_tarea ut ON t.id_tarea = ut.id_tarea AND ut.id_usuario = ?
                 WHERE t.id_tarea = ?";
    $stmt = $conn->prepare($sql_check);
    $stmt->bind_param("ii", $id_usuario, $id_tarea);
    $stmt->execute();
    $task_data = $stmt->get_result()->fetch_assoc();
    
    if (!$task_data) {
        echo json_encode(['success' => false, 'error' => 'Tarea no encontrada']);
        exit;
    }
    
    // Si es tarea grupal, verificar que el usuario pertenece al grupo
    if ($task_data['scope'] === 'grupal') {
        $sql_check_grupo = "SELECT id_usuario FROM usuario_grupo WHERE id_grupo = ? AND id_usuario = ?";
        $stmt_grupo = $conn->prepare($sql_check_grupo);
        $stmt_grupo->bind_param("ii", $task_data['id_grupo'], $id_usuario);
        $stmt_grupo->execute();
        $grupo_member = $stmt_grupo->get_result()->fetch_assoc();
        
        if (!$grupo_member) {
            echo json_encode(['success' => false, 'error' => 'No perteneces al grupo de esta tarea']);
            exit;
        }
        
        // Si no existe entrada en usuario_tarea, crearla
        if (!$task_data['id_usuario_tarea']) {
            $sql_insert_ut = "INSERT INTO usuario_tarea (id_usuario, id_tarea, estado) VALUES (?, ?, 'Pendiente')";
            $stmt_insert = $conn->prepare($sql_insert_ut);
            $stmt_insert->bind_param("ii", $id_usuario, $id_tarea);
            $stmt_insert->execute();
            $task_data['id_usuario_tarea'] = $conn->insert_id;
        }
    }
    
    $puntos = $task_data['puntos'];
    
    // Para tareas de pronóstico, verificar si ya hizo pronóstico
    if ($tipo_tarea === 'pronostico') {
        $sql_check_pronostico = "SELECT id_pronostico FROM pronostico WHERE id_usuario = ? AND id_partido = (
            SELECT id_partido FROM tarea WHERE id_tarea = ?
        )";
        $stmt = $conn->prepare($sql_check_pronostico);
        $stmt->bind_param("ii", $id_usuario, $id_tarea);
        $stmt->execute();
        $pronostico = $stmt->get_result()->fetch_assoc();
        
        if (!$pronostico) {
            echo json_encode(['success' => false, 'error' => 'Debes completar el pronóstico primero']);
            exit;
        }
    }
    
    // Actualizar usuario_tarea
    $sql_update = "UPDATE usuario_tarea 
                   SET estado = 'Completada', 
                       respuesta = ?, 
                       fecha_completado = NOW(), 
                       puntos_obtenidos = ? 
                   WHERE id_usuario = ? AND id_tarea = ?";
    $stmt = $conn->prepare($sql_update);
    $stmt->bind_param("siii", $respuesta, $puntos, $id_usuario, $id_tarea);
    
    if ($stmt->execute()) {
        // Actualizar puntos del usuario
        $sql_update_points = "UPDATE usuario SET puntos_totales = puntos_totales + ? WHERE id_usuario = ?";
        $stmt = $conn->prepare($sql_update_points);
        $stmt->bind_param("ii", $puntos, $id_usuario);
        $stmt->execute();
        
        echo json_encode(['success' => true, 'message' => 'Tarea completada', 'points' => $puntos]);
    } else {
        echo json_encode(['success' => false, 'error' => 'Error al completar tarea: ' . $stmt->error]);
    }
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => 'Error al completar tarea: ' . $e->getMessage()
    ]);
}

$conn->close();
?>