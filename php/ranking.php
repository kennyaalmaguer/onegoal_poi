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
    // Consulta mejorada para obtener estadísticas reales
    $sql = "SELECT 
                u.id_usuario,
                u.nombre as username,
                COALESCE(u.puntos_totales, 0) as points,
                -- Pronósticos exactos (puntos_obtenidos >= 3)
                (SELECT COUNT(*) FROM Pronostico p 
                 WHERE p.id_usuario = u.id_usuario 
                 AND p.puntos_obtenidos >= 3) as exact_predictions,
                -- Total de pronósticos
                (SELECT COUNT(*) FROM Pronostico p 
                 WHERE p.id_usuario = u.id_usuario) as total_predictions,
                -- Tareas completadas
                (SELECT COUNT(*) FROM Usuario_tarea ut 
                 WHERE ut.id_usuario = u.id_usuario 
                 AND ut.estado = 'Completada') as completed_tasks,
                -- Mensajes en chat (¡ESTA ES LA PARTE IMPORTANTE!)
                (SELECT COUNT(*) FROM Mensaje m 
                 WHERE m.id_usuario = u.id_usuario) as chat_messages
            FROM Usuario u
            ORDER BY u.puntos_totales DESC";

    $result = $conn->query($sql);
    
    $users = [];
    $currentUserId = isset($_SESSION['id_usuario']) ? $_SESSION['id_usuario'] : null;
    
    if ($result && $result->num_rows > 0) {
        while ($row = $result->fetch_assoc()) {
            $user = [
                'id' => $row['id_usuario'],
                'username' => $row['username'],
                'points' => (int)$row['points'],
                'exactPredictions' => (int)$row['exact_predictions'],
                'quickPredictions' => (int)$row['total_predictions'],
                'completedTasks' => (int)$row['completed_tasks'],
                'chatMessages' => (int)$row['chat_messages'], // ¡Aquí están los mensajes!
                'isCurrentUser' => ($currentUserId && $row['id_usuario'] == $currentUserId)
            ];
            $users[] = $user;
        }
        
        echo json_encode([
            'success' => true,
            'users' => $users,
            'currentUser' => $currentUserId,
            'totalUsers' => count($users),
            'debug' => 'Consulta ejecutada correctamente'
        ]);
    } else {
        echo json_encode([
            'success' => true,
            'users' => [],
            'currentUser' => $currentUserId,
            'totalUsers' => 0,
            'message' => 'No se encontraron usuarios'
        ]);
    }
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => 'Error al obtener el ranking: ' . $e->getMessage()
    ]);
}

$conn->close();
?>