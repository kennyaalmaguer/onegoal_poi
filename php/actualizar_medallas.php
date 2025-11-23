<?php
session_start();
require_once 'conexion.php';
header('Content-Type: application/json');

if (!isset($_SESSION['id_usuario'])) {
    echo json_encode(['success' => false, 'error' => 'No autenticado']);
    exit;
}

$id_usuario = $_SESSION['id_usuario'];

try {
    $medallas_obtenidas = [];
    
    // 1. VERIFICAR MEDALLA CONVENCEDOR (50 mensajes)
    $sql_mensajes = "SELECT COUNT(*) as total FROM Mensaje WHERE id_usuario = ?";
    $stmt = $conn->prepare($sql_mensajes);
    $stmt->bind_param("i", $id_usuario);
    $stmt->execute();
    $result = $stmt->get_result();
    $row = $result->fetch_assoc();
    
    if ($row['total'] >= 50) {
        $medallas_obtenidas[] = 4; // ID de CONVENCEDOR
    }
    
    // 2. VERIFICAR MEDALLA COLABORADOR (10 tareas completadas)
    $sql_tareas = "SELECT COUNT(*) as total FROM Usuario_tarea WHERE id_usuario = ? AND estado = 'Completada'";
    $stmt = $conn->prepare($sql_tareas);
    $stmt->bind_param("i", $id_usuario);
    $stmt->execute();
    $result = $stmt->get_result();
    $row = $result->fetch_assoc();
    
    if ($row['total'] >= 10) {
        $medallas_obtenidas[] = 3; // ID de COLABORADOR
    }
    
    // 3. VERIFICAR MEDALLA ORÁCULO (3 pronósticos exactos seguidos)
    // Nota: Esta es más compleja, por ahora la dejamos simple
    $sql_exactos = "SELECT COUNT(*) as total FROM Pronostico WHERE id_usuario = ? AND puntos_obtenidos >= 3";
    $stmt = $conn->prepare($sql_exactos);
    $stmt->bind_param("i", $id_usuario);
    $stmt->execute();
    $result = $stmt->get_result();
    $row = $result->fetch_assoc();
    
    if ($row['total'] >= 3) {
        $medallas_obtenidas[] = 1; // ID de ORÁCULO
    }
    
    // 4. VERIFICAR MEDALLA VELOCISTA (5 pronósticos rápidos)
    // Nota: Necesitarías un campo para marcar pronósticos "rápidos"
    $medallas_obtenidas[] = 2; // Temporalmente asignamos esta a todos
    
    // INSERTAR MEDALLAS NUEVAS
    $medallas_insertadas = 0;
    foreach ($medallas_obtenidas as $id_medalla) {
        // Verificar si ya tiene la medalla
        $sql_check = "SELECT COUNT(*) as existe FROM usuario_medalla WHERE id_usuario = ? AND id_medalla = ?";
        $stmt = $conn->prepare($sql_check);
        $stmt->bind_param("ii", $id_usuario, $id_medalla);
        $stmt->execute();
        $result = $stmt->get_result();
        $row = $result->fetch_assoc();
        
        if ($row['existe'] == 0) {
            $sql_insert = "INSERT INTO usuario_medalla (id_usuario, id_medalla) VALUES (?, ?)";
            $stmt = $conn->prepare($sql_insert);
            $stmt->bind_param("ii", $id_usuario, $id_medalla);
            $stmt->execute();
            $medallas_insertadas++;
        }
    }
    
    echo json_encode([
        'success' => true, 
        'medallas_obtenidas' => $medallas_obtenidas,
        'nuevas_medallas' => $medallas_insertadas
    ]);
    
} catch (Exception $e) {
    echo json_encode(['success' => false, 'error' => 'Error: ' . $e->getMessage()]);
}
?>