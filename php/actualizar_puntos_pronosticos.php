
<?php
session_start();
require_once 'conexion.php';
header('Content-Type: application/json');

if (!isset($_SESSION['id_usuario'])) {
    echo json_encode(['success' => false, 'mensaje' => 'No autenticado']);
    exit;
}

$id_usuario = $_SESSION['id_usuario'];

try {
    $conn->begin_transaction();

    // 1. Buscar pronósticos del usuario que no tienen puntos
    $stmt_pronosticos = $conn->prepare("
        SELECT id_pronostico, id_partido 
        FROM pronostico 
        WHERE id_usuario = ? AND (puntos_obtenidos = 0 OR puntos_obtenidos IS NULL)
    ");
    $stmt_pronosticos->bind_param("i", $id_usuario);
    $stmt_pronosticos->execute();
    $result = $stmt_pronosticos->get_result();
    $pronosticos_sin_puntos = $result->fetch_all(MYSQLI_ASSOC);

    $total_puntos = 0;
    $pronosticos_actualizados = 0;

    // 2. Actualizar cada pronóstico sin puntos
    foreach ($pronosticos_sin_puntos as $pronostico) {
        $puntos = 5; // 5 puntos por pronóstico
        
        // Actualizar puntos en el pronóstico
        $stmt_update = $conn->prepare("
            UPDATE pronostico SET puntos_obtenidos = ? WHERE id_pronostico = ?
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
?>
