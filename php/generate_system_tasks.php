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

function generateSystemTasks($conn, $id_usuario) {
    // Obtener partidos futuros (próximos 7 días)
    $fecha_limite = date('Y-m-d H:i:s', strtotime('+7 days'));
    
    $sql = "SELECT p.id_partido, p.equipo_local, p.equipo_visitante, p.fecha, p.etapa
            FROM partido p
            WHERE p.fecha BETWEEN NOW() AND ?
            AND p.id_partido NOT IN (
                SELECT t.id_partido 
                FROM tarea t 
                WHERE t.scope = 'individual' 
                AND t.tipo = 'pronostico'
                AND t.creado_por IS NULL
                AND t.id_tarea IN (
                    SELECT id_tarea FROM usuario_tarea WHERE id_usuario = ?
                )
            )
            ORDER BY p.fecha ASC
            LIMIT 5";

    $stmt = $conn->prepare($sql);
    $stmt->bind_param("si", $fecha_limite, $id_usuario);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $tasks_created = 0;
    
    while ($row = $result->fetch_assoc()) {
        // Verificar si ya existe una tarea del sistema para este partido
        $sql_check_task = "SELECT id_tarea FROM tarea 
                          WHERE id_partido = ? 
                          AND scope = 'individual' 
                          AND tipo = 'pronostico' 
                          AND creado_por IS NULL";
        
        $stmt_check = $conn->prepare($sql_check_task);
        $stmt_check->bind_param("i", $row['id_partido']);
        $stmt_check->execute();
        $existing_task = $stmt_check->get_result()->fetch_assoc();
        $stmt_check->close();
        
        if ($existing_task) {
            // Ya existe tarea del sistema, asignarla al usuario
            $id_tarea_existente = $existing_task['id_tarea'];
            
            // Verificar si el usuario ya tiene esta tarea asignada
            $sql_check_assignment = "SELECT id_usuario_tarea FROM usuario_tarea 
                                   WHERE id_usuario = ? AND id_tarea = ?";
            $stmt_assignment = $conn->prepare($sql_check_assignment);
            $stmt_assignment->bind_param("ii", $id_usuario, $id_tarea_existente);
            $stmt_assignment->execute();
            $existing_assignment = $stmt_assignment->get_result()->fetch_assoc();
            $stmt_assignment->close();
            
            if (!$existing_assignment) {
                // Asignar la tarea existente al usuario
                $sql_assign = "INSERT INTO usuario_tarea (id_usuario, id_tarea, estado) 
                              VALUES (?, ?, 'Pendiente')";
                $stmt_assign = $conn->prepare($sql_assign);
                $stmt_assign->bind_param("ii", $id_usuario, $id_tarea_existente);
                
                if ($stmt_assign->execute()) {
                    $tasks_created++;
                }
                $stmt_assign->close();
            }
        } else {
            // Crear nueva tarea del sistema y asignarla al usuario
            $nombre = "Pronóstico: " . $row['equipo_local'] . " vs " . $row['equipo_visitante'];
            $descripcion = "Realiza tu pronóstico del marcador exacto para " . $row['equipo_local'] . " vs " . $row['equipo_visitante'];
            
            // Fecha límite: 1 hora antes del partido
            $fecha_limite_tarea = date('Y-m-d H:i:s', strtotime($row['fecha'] . ' -1 hour'));
            
            $sql_insert = "INSERT INTO tarea (id_partido, nombre, descripcion, tipo, fecha_limite, puntos, scope, estado) 
                           VALUES (?, ?, ?, 'pronostico', ?, 5, 'individual', 'Pendiente')";
            
            $stmt_insert = $conn->prepare($sql_insert);
            $stmt_insert->bind_param("isss", $row['id_partido'], $nombre, $descripcion, $fecha_limite_tarea);
            
            if ($stmt_insert->execute()) {
                $id_nueva_tarea = $conn->insert_id;
                
                // Asignar la nueva tarea al usuario
                $sql_assign = "INSERT INTO usuario_tarea (id_usuario, id_tarea, estado) 
                              VALUES (?, ?, 'Pendiente')";
                $stmt_assign = $conn->prepare($sql_assign);
                $stmt_assign->bind_param("ii", $id_usuario, $id_nueva_tarea);
                
                if ($stmt_assign->execute()) {
                    $tasks_created++;
                }
                $stmt_assign->close();
            }
            $stmt_insert->close();
        }
    }
    
    return $tasks_created;
}

try {
    $id_usuario = isset($_SESSION['id_usuario']) ? $_SESSION['id_usuario'] : null;
    
    if (!$id_usuario) {
        echo json_encode(['success' => false, 'error' => 'Usuario no autenticado']);
        exit;
    }

    // Generar tareas del sistema para este usuario
    $tasks_created = generateSystemTasks($conn, $id_usuario);
    
    echo json_encode([
        'success' => true,
        'tasks_created' => $tasks_created,
        'message' => "Se asignaron $tasks_created nuevas tareas de pronóstico"
    ]);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => 'Error al generar tareas: ' . $e->getMessage()
    ]);
}

$conn->close();
?>