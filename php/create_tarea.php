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
    
    $id_grupo = $data['groupId'] ?? null;
    $id_partido = $data['matchId'] ?? null;
    $tipo = $data['type'] ?? null;
    $descripcion = $data['description'] ?? null;
    $fecha_limite = $data['deadline'] ?? null;
    
    // Validar que el usuario pertenezca al grupo
    $sql_check = "SELECT id_usuario FROM usuario_grupo WHERE id_grupo = ? AND id_usuario = ?";
    $stmt = $conn->prepare($sql_check);
    $stmt->bind_param("ii", $id_grupo, $id_usuario);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        echo json_encode(['success' => false, 'error' => 'No perteneces a este grupo']);
        exit;
    }
    
    // Puntos según tipo
    $puntos_map = [
        'debate' => 3,
        'trivia' => 3,
        'encuesta' => 2,
        'analisis' => 4,
        'meme' => 2,
        'prediccion' => 3
    ];
    
    $puntos = $puntos_map[$tipo] ?? 2;
    
    // Generar nombre automático
    $sql_partido = "SELECT equipo_local, equipo_visitante FROM partido WHERE id_partido = ?";
    $stmt = $conn->prepare($sql_partido);
    $stmt->bind_param("i", $id_partido);
    $stmt->execute();
    $partido = $stmt->get_result()->fetch_assoc();
    
    $tipo_texto = [
        'debate' => 'Debate',
        'trivia' => 'Trivia', 
        'encuesta' => 'Encuesta',
        'analisis' => 'Análisis',
        'meme' => 'Meme',
        'prediccion' => 'Predicción'
    ];
    
    $nombre = $tipo_texto[$tipo] . ': ' . $partido['equipo_local'] . ' vs ' . $partido['equipo_visitante'];
    
    // Insertar tarea
    $sql_insert = "INSERT INTO tarea (id_grupo, id_partido, nombre, descripcion, tipo, fecha_limite, puntos, creado_por, scope) 
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'grupal')";
    $stmt = $conn->prepare($sql_insert);
    $stmt->bind_param("iissssii", $id_grupo, $id_partido, $nombre, $descripcion, $tipo, $fecha_limite, $puntos, $id_usuario);
    
    if ($stmt->execute()) {
        $id_tarea_nueva = $conn->insert_id;
        
        // 🔥 CREAR ENTRADAS EN usuario_tarea PARA TODOS LOS MIEMBROS DEL GRUPO
        $sql_miembros = "SELECT id_usuario FROM usuario_grupo WHERE id_grupo = ?";
        $stmt_miembros = $conn->prepare($sql_miembros);
        $stmt_miembros->bind_param("i", $id_grupo);
        $stmt_miembros->execute();
        $result_miembros = $stmt_miembros->get_result();
        
        while ($miembro = $result_miembros->fetch_assoc()) {
            $sql_insert_ut = "INSERT INTO usuario_tarea (id_usuario, id_tarea, estado) VALUES (?, ?, 'Pendiente')";
            $stmt_ut = $conn->prepare($sql_insert_ut);
            $stmt_ut->bind_param("ii", $miembro['id_usuario'], $id_tarea_nueva);
            $stmt_ut->execute();
        }
        
        echo json_encode(['success' => true, 'message' => 'Tarea grupal creada exitosamente']);
    } else {
        echo json_encode(['success' => false, 'error' => 'Error al crear tarea: ' . $stmt->error]);
    }
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => 'Error al crear tarea: ' . $e->getMessage()
    ]);
}

$conn->close();
?>