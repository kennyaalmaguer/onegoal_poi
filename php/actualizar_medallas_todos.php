<?php
session_start();
require_once 'conexion.php';
header('Content-Type: application/json');

function actualizarMedallasUsuario($id_usuario, $conn) {
    $medallas_obtenidas = [];
    
    // 1. MEDALLA CONVENCEDOR (50 mensajes)
    $sql_mensajes = "SELECT COUNT(*) as total FROM Mensaje WHERE id_usuario = ?";
    $stmt = $conn->prepare($sql_mensajes);
    $stmt->bind_param("i", $id_usuario);
    $stmt->execute();
    $result = $stmt->get_result();
    $row = $result->fetch_assoc();
    
    if ($row['total'] >= 50) {
        $medallas_obtenidas[] = 4; // CONVENCEDOR
    }
    
    // 2. MEDALLA COLABORADOR (10 tareas completadas)
    $sql_tareas = "SELECT COUNT(*) as total FROM Usuario_tarea WHERE id_usuario = ? AND estado = 'Completada'";
    $stmt = $conn->prepare($sql_tareas);
    $stmt->bind_param("i", $id_usuario);
    $stmt->execute();
    $result = $stmt->get_result();
    $row = $result->fetch_assoc();
    
    if ($row['total'] >= 10) {
        $medallas_obtenidas[] = 3; // COLABORADOR
    }
    
    // 3. MEDALLA ORÁCULO (3 pronósticos exactos)
    $sql_exactos = "SELECT COUNT(*) as total FROM Pronostico WHERE id_usuario = ? AND puntos_obtenidos >= 3";
    $stmt = $conn->prepare($sql_exactos);
    $stmt->bind_param("i", $id_usuario);
    $stmt->execute();
    $result = $stmt->get_result();
    $row = $result->fetch_assoc();
    
    if ($row['total'] >= 3) {
        $medallas_obtenidas[] = 1; // ORÁCULO
    }
    
    // 4. MEDALLA VELOCISTA (5 pronósticos rápidos)
    // Por ahora la asignamos temporalmente
    $medallas_obtenidas[] = 2; // VELOCISTA
    
    // INSERTAR MEDALLAS NUEVAS
    $medallas_insertadas = 0;
    foreach ($medallas_obtenidas as $id_medalla) {
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
    
    return $medallas_insertadas;
}

try {
    // OBTENER TODOS LOS USUARIOS
    $sql_usuarios = "SELECT id_usuario FROM Usuario";
    $result = $conn->query($sql_usuarios);
    
    $total_actualizados = 0;
    $total_medallas = 0;
    
    if ($result && $result->num_rows > 0) {
        while ($row = $result->fetch_assoc()) {
            $medallas = actualizarMedallasUsuario($row['id_usuario'], $conn);
            $total_medallas += $medallas;
            $total_actualizados++;
        }
    }
    
    echo json_encode([
        'success' => true, 
        'usuarios_actualizados' => $total_actualizados,
        'nuevas_medallas' => $total_medallas
    ]);
    
} catch (Exception $e) {
    echo json_encode(['success' => false, 'error' => 'Error: ' . $e->getMessage()]);
}
?>