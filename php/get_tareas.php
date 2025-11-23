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

    // CONSULTA MEJORADA - TAREAS GRUPALES E INDIVIDUALES
    $sql = "SELECT 
                t.id_tarea,
                t.nombre as title,
                t.descripcion as description,
                t.tipo,
                t.scope,
                t.puntos,
                t.fecha_limite as deadline,
                t.creado_por,
                u.nombre as assignedBy,
                COALESCE(ut.estado, 'Pendiente') as user_status,
                ut.respuesta,
                ut.puntos_obtenidos,
                p.equipo_local,
                p.equipo_visitante,
                g.nombre as grupo_nombre,
                -- Para determinar si mostrar la tarea
                CASE 
                    WHEN t.scope = 'individual' THEN 1
                    WHEN t.scope = 'grupal' AND ug.id_usuario IS NOT NULL THEN 1
                    ELSE 0
                END as should_show
            FROM tarea t
            LEFT JOIN usuario u ON t.creado_por = u.id_usuario
            LEFT JOIN usuario_tarea ut ON t.id_tarea = ut.id_tarea AND ut.id_usuario = ?
            LEFT JOIN partido p ON t.id_partido = p.id_partido
            LEFT JOIN grupo g ON t.id_grupo = g.id_grupo
            LEFT JOIN usuario_grupo ug ON t.id_grupo = ug.id_grupo AND ug.id_usuario = ?
            WHERE (t.scope = 'individual' OR ug.id_usuario IS NOT NULL)
            ORDER BY t.fecha_creacion DESC";

    $stmt = $conn->prepare($sql);
    $stmt->bind_param("ii", $id_usuario, $id_usuario);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $tasks = [];
    $total_found = 0;
    
    while ($row = $result->fetch_assoc()) {
        $total_found++;
        // Solo procesar tareas que deben mostrarse
        if ($row['should_show'] == 1) {
            $display_status = ($row['user_status'] === 'Completada' || $row['respuesta'] !== null) ? 'completed' : 'pending';
            
            $task = [
                'id' => $row['id_tarea'],
                'title' => $row['title'],
                'description' => $row['description'],
                'type' => $row['tipo'],
                'scope' => $row['scope'],
                'points' => $row['puntos'],
                'deadline' => $row['deadline'],
                'status' => $display_status,
                'assignedBy' => $row['assignedBy'] ? $row['assignedBy'] : 'Sistema',
                'grupo_nombre' => $row['grupo_nombre'],
                'partido_info' => $row['equipo_local'] && $row['equipo_visitante'] ? 
                    $row['equipo_local'] . ' vs ' . $row['equipo_visitante'] : null,
                'hasResponse' => $row['respuesta'] !== null,
                'puntos_obtenidos' => $row['puntos_obtenidos'] ? (int)$row['puntos_obtenidos'] : 0
            ];
            $tasks[] = $task;
        }
    }
    
    echo json_encode([
        'success' => true,
        'tasks' => $tasks,
        'total' => count($tasks),
        'debug' => [
            'user_id' => $id_usuario,
            'total_found_in_db' => $total_found,
            'total_to_show' => count($tasks)
        ]
    ]);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => 'Error al obtener tareas: ' . $e->getMessage()
    ]);
}

$conn->close();
?>