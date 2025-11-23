<?php
session_start();
header('Content-Type: application/json');

$host = "127.0.0.1:3306";
$usuario = "root";
$clave = "";
$bd = "onegoal";

error_log("DEBUG initialize_user_tasks - Sesión: " . print_r($_SESSION, true));

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

    // 1. Primero crear tareas del sistema si no existen
    $sql_system_tasks = "INSERT INTO tarea (id_partido, nombre, descripcion, tipo, fecha_limite, puntos, scope, estado)
                         SELECT 
                             p.id_partido,
                             CONCAT('Pronóstico: ', p.equipo_local, ' vs ', p.equipo_visitante) as nombre,
                             CONCAT('Realiza tu pronóstico del marcador exacto para ', p.equipo_local, ' vs ', p.equipo_visitante) as descripcion,
                             'pronostico' as tipo,
                             DATE_SUB(p.fecha, INTERVAL 1 HOUR) as fecha_limite,
                             5 as puntos,
                             'individual' as scope,
                             'Pendiente' as estado
                         FROM partido p
                         WHERE p.fecha BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 7 DAY)
                         AND NOT EXISTS (
                             SELECT 1 FROM tarea t 
                             WHERE t.id_partido = p.id_partido 
                             AND t.scope = 'individual' 
                             AND t.tipo = 'pronostico'
                             AND t.creado_por IS NULL
                         )
                         LIMIT 5";

    $conn->query($sql_system_tasks);

    // 2. Luego asignar tareas del sistema al usuario si no las tiene
    $sql_assign_tasks = "INSERT INTO usuario_tarea (id_usuario, id_tarea, estado)
                         SELECT 
                             ? as id_usuario,
                             t.id_tarea,
                             'Pendiente' as estado
                         FROM tarea t
                         WHERE t.scope = 'individual' 
                         AND t.tipo = 'pronostico'
                         AND t.creado_por IS NULL
                         AND NOT EXISTS (
                             SELECT 1 FROM usuario_tarea ut 
                             WHERE ut.id_usuario = ? 
                             AND ut.id_tarea = t.id_tarea
                         )";

    $stmt = $conn->prepare($sql_assign_tasks);
    $stmt->bind_param("ii", $id_usuario, $id_usuario);
    $stmt->execute();
    $tasks_assigned = $stmt->affected_rows;
    
    echo json_encode([
        'success' => true,
        'tasks_assigned' => $tasks_assigned,
        'message' => "Se asignaron $tasks_assigned tareas del sistema"
    ]);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => 'Error al inicializar tareas: ' . $e->getMessage()
    ]);
}

$conn->close();
?>