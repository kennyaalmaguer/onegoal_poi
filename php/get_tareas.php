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

    // Obtener tareas del usuario (individuales y grupales donde pertenece)
    $sql = "SELECT 
                t.id_tarea,
                t.nombre as title,
                t.descripcion as description,
                t.tipo,
                t.scope,
                t.puntos,
                t.fecha_limite as deadline,
                t.estado,
                t.id_grupo,
                t.id_partido,
                u.nombre as assignedBy,
                COALESCE(ut.estado, 
                    CASE 
                        WHEN t.scope = 'grupal' THEN 'Pendiente' 
                        ELSE 'No asignada' 
                    END) as user_status,
                ut.respuesta,
                ut.puntos_obtenidos,
                p.equipo_local,
                p.equipo_visitante,
                p.fecha as partido_fecha,
                g.nombre as grupo_nombre
            FROM tarea t
            LEFT JOIN usuario u ON t.creado_por = u.id_usuario
            LEFT JOIN usuario_tarea ut ON t.id_tarea = ut.id_tarea AND ut.id_usuario = ?
            LEFT JOIN partido p ON t.id_partido = p.id_partido
            LEFT JOIN grupo g ON t.id_grupo = g.id_grupo
            LEFT JOIN usuario_grupo ug ON t.id_grupo = ug.id_grupo AND ug.id_usuario = ?
            WHERE t.scope = 'individual' 
               OR (t.scope = 'grupal' AND ug.id_usuario IS NOT NULL)
            ORDER BY t.fecha_creacion DESC";

    $stmt = $conn->prepare($sql);
    $stmt->bind_param("ii", $id_usuario, $id_usuario);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $tasks = [];
    
    while ($row = $result->fetch_assoc()) {
        // Determinar el estado para mostrar
        $display_status = 'pending';
        if ($row['user_status'] === 'Completada') {
            $display_status = 'completed';
        } else if ($row['scope'] === 'grupal') {
            // Para tareas grupales pendientes, verificar si ya participó
            if ($row['respuesta'] !== null) {
                $display_status = 'completed';
            }
        }
        
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
            'groupId' => $row['id_grupo'],
            'matchId' => $row['id_partido'],
            'grupo_nombre' => $row['grupo_nombre'],
            'partido_info' => $row['equipo_local'] && $row['equipo_visitante'] ? 
                $row['equipo_local'] . ' vs ' . $row['equipo_visitante'] : null,
            'isDaily' => $row['scope'] === 'individual',
            'hasResponse' => $row['respuesta'] !== null,
            'pointsObtained' => $row['puntos_obtenidos']
        ];
        $tasks[] = $task;
    }
    
    echo json_encode([
        'success' => true,
        'tasks' => $tasks,
        'userId' => $id_usuario
    ]);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => 'Error al obtener tareas: ' . $e->getMessage()
    ]);
}

$conn->close();
?>