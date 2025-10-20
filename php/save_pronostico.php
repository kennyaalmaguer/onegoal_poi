
<?php
session_start();
require_once 'conexion.php';
header('Content-Type: application/json; charset=utf-8');

error_reporting(E_ALL);
ini_set('display_errors', 1);

$id_usuario = isset($_SESSION['id_usuario']) ? intval($_SESSION['id_usuario']) : null;
if (!$id_usuario) {
    echo json_encode(['success' => false, 'mensaje' => 'Usuario no autenticado.']);
    exit;
}

$id_partido = isset($_POST['id_partido']) ? intval($_POST['id_partido']) : 0;
$goles_local = isset($_POST['goles_local']) ? intval($_POST['goles_local']) : null;
$goles_visitante = isset($_POST['goles_visitante']) ? intval($_POST['goles_visitante']) : null;
$primer_goleador = isset($_POST['primer_goleador']) ? trim($_POST['primer_goleador']) : null;

if (!$id_partido) {
    echo json_encode(['success' => false, 'mensaje' => 'ID de partido no válido.']);
    exit;
}

try {
    $conn->begin_transaction();

    // 1. Verificar si ya existe un pronóstico para este usuario y partido
    $check_stmt = $conn->prepare("SELECT id_pronostico, puntos_obtenidos FROM pronostico WHERE id_usuario = ? AND id_partido = ?");
    $check_stmt->bind_param("ii", $id_usuario, $id_partido);
    $check_stmt->execute();
    $check_result = $check_stmt->get_result();
    $pronostico_existente = $check_result->fetch_assoc();

    $puntos_a_otorgar = 5;
    $ya_tiene_puntos = false;

    // 2. Si ya existe y ya tiene puntos, no otorgar puntos nuevamente
    if ($pronostico_existente && $pronostico_existente['puntos_obtenidos'] > 0) {
        $puntos_a_otorgar = 0;
        $ya_tiene_puntos = true;
    }

    // 3. Guardar o actualizar el pronóstico
    if ($pronostico_existente) {
        // Actualizar pronóstico existente
        $stmt = $conn->prepare("
            UPDATE pronostico 
            SET marcador_local = ?, marcador_visitante = ?, jugador_primer_gol = ?, fecha_registro = NOW()
            WHERE id_usuario = ? AND id_partido = ?
        ");
        $stmt->bind_param("iisii", $goles_local, $goles_visitante, $primer_goleador, $id_usuario, $id_partido);
    } else {
        // Insertar nuevo pronóstico
        $stmt = $conn->prepare("
            INSERT INTO pronostico (id_usuario, id_partido, marcador_local, marcador_visitante, jugador_primer_gol, fecha_registro, puntos_obtenidos) 
            VALUES (?, ?, ?, ?, ?, NOW(), ?)
        ");
        $stmt->bind_param("iiisii", $id_usuario, $id_partido, $goles_local, $goles_visitante, $primer_goleador, $puntos_a_otorgar);
    }
    
    $stmt->execute();

    // 4. Si es un pronóstico nuevo o no tenía puntos, otorgar los puntos
    if ($puntos_a_otorgar > 0) {
        // Actualizar puntos en el pronóstico (si es una actualización)
        if ($pronostico_existente && !$ya_tiene_puntos) {
            $update_puntos_stmt = $conn->prepare("
                UPDATE pronostico SET puntos_obtenidos = ? WHERE id_usuario = ? AND id_partido = ?
            ");
            $update_puntos_stmt->bind_param("iii", $puntos_a_otorgar, $id_usuario, $id_partido);
            $update_puntos_stmt->execute();
        }

        // Actualizar puntos totales del usuario
        $stmt_puntos = $conn->prepare("
            UPDATE usuario 
            SET puntos_totales = COALESCE(puntos_totales, 0) + ? 
            WHERE id_usuario = ?
        ");
        $stmt_puntos->bind_param("ii", $puntos_a_otorgar, $id_usuario);
        $stmt_puntos->execute();
    }

    $conn->commit();

    // Mensaje según si se otorgaron puntos o no
    if ($ya_tiene_puntos) {
        echo json_encode(['success' => true, 'mensaje' => 'Pronóstico actualizado. (Ya tenías los puntos)']);
    } else {
        echo json_encode(['success' => true, 'mensaje' => 'Pronóstico guardado. +5 puntos!']);
    }

} catch (Exception $e) {
    $conn->rollback();
    error_log("Error en save_pronostico.php: " . $e->getMessage());
    echo json_encode(['success' => false, 'mensaje' => 'Error al guardar el pronóstico: ' . $e->getMessage()]);
}
?>
