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
        echo json_encode(['success' => false, 'mensaje' => 'No autenticado']);
        exit;
    }

    $conn->begin_transaction();

    // 1. Buscar pronósticos del usuario que no tienen puntos
    $stmt_pronosticos = $conn->prepare("
        SELECT p.id_pronostico, p.id_partido 
        FROM Pronostico p 
        WHERE p.id_usuario = ? AND (p.puntos_obtenidos IS NULL OR p.puntos_obtenidos = 0)
    ");
    $stmt_pronosticos->bind_param("i", $id_usuario);
    $stmt_pronosticos->execute();
    $result = $stmt_pronosticos->get_result();
    $pronosticos_sin_puntos = $result->fetch_all(MYSQLI_ASSOC);

    $total_puntos = 0;
    $pronosticos_actualizados = 0;

    // 2. Actualizar cada pronóstico (5 puntos base por pronóstico)
    foreach ($pronosticos_sin_puntos as $pronostico) {
        $puntos = 5;
        
        // Actualizar puntos en el pronóstico
        $stmt_update = $conn->prepare("
            UPDATE Pronostico SET puntos_obtenidos = ? WHERE id_pronostico = ?
        ");
        $stmt_update->bind_param("ii", $puntos, $pronostico['id_pronostico']);
        $stmt_update->execute();
        
        $total_puntos += $puntos;
        $pronosticos_actualizados++;
    }

    // 3. Actualizar puntos totales del usuario
    if ($total_puntos > 0) {
        $stmt_usuario = $conn->prepare("
            UPDATE usuario 
            SET puntos_totales = COALESCE(puntos_totales, 0) + ? 
            WHERE id_usuario = ?
        ");
        $stmt_usuario->bind_param("ii", $total_puntos, $id_usuario);
        $stmt_usuario->execute();
        
        // Registrar en tabla puntos
        $stmt_puntos = $conn->prepare("
            INSERT INTO puntos (id_usuario, fuente, detalle, puntos_otorgados) 
            VALUES (?, 'Pronostico', ?, ?)
        ");
        $detalle = "Pronósticos completados: " . $pronosticos_actualizados;
        $stmt_puntos->bind_param("isi", $id_usuario, $detalle, $total_puntos);
        $stmt_puntos->execute();
    }

    $conn->commit();

    echo json_encode([
        'success' => true, 
        'mensaje' => "Puntos actualizados: $pronosticos_actualizados pronósticos, +$total_puntos puntos"
    ]);

} catch (Exception $e) {
    $conn->rollback();
    echo json_encode(['success' => false, 'mensaje' => 'Error: ' . $e->getMessage()]);
}

$conn->close();
?>