
<?php
session_start();
require_once 'conexion.php'; // Asegúrate de que aquí defines $conn
header('Content-Type: application/json; charset=utf-8');

error_reporting(E_ALL);
ini_set('display_errors', 1);

// Obtener ID de usuario
$id_usuario = isset($_SESSION['id_usuario']) ? intval($_SESSION['id_usuario']) : null;
if (!$id_usuario && isset($_POST['user_id'])) {
    $id_usuario = intval($_POST['user_id']);
}

if (!$id_usuario) {
    echo json_encode(['success' => false, 'mensaje' => 'Usuario no autenticado.']);
    exit;
}

// Obtener datos del formulario
$id_partido = isset($_POST['id_partido']) ? intval($_POST['id_partido']) : 0;
$goles_local = isset($_POST['goles_local']) ? intval($_POST['goles_local']) : null;
$goles_visitante = isset($_POST['goles_visitante']) ? intval($_POST['goles_visitante']) : null;
$jugador_primer_gol = isset($_POST['primer_goleador']) ? trim($_POST['primer_goleador']) : null;

if (!$id_partido) {
    echo json_encode(['success' => false, 'mensaje' => 'Falta el ID del partido.']);
    exit;
}

try {
    // Revisar si ya existe un pronóstico
    $sql_check = "SELECT id_pronostico FROM pronostico WHERE id_usuario = ? AND id_partido = ?";
    $stmt = $conn->prepare($sql_check);
    if (!$stmt) throw new Exception("Error en prepare: " . $conn->error);
    $stmt->bind_param("ii", $id_usuario, $id_partido);
    $stmt->execute();
    $result = $stmt->get_result();
    $existe = $result->fetch_assoc();
    $stmt->close();

    if ($existe) {
        // UPDATE
        $sql_update = "UPDATE pronostico 
                       SET marcador_local = ?, marcador_visitante = ?, jugador_primer_gol = ?, fecha_registro = NOW() 
                       WHERE id_usuario = ? AND id_partido = ?";
        $stmt = $conn->prepare($sql_update);
        if (!$stmt) throw new Exception("Error en prepare UPDATE: " . $conn->error);
        $stmt->bind_param("iisii", $goles_local, $goles_visitante, $jugador_primer_gol, $id_usuario, $id_partido);
        $ok = $stmt->execute();
        $stmt->close();

        if ($ok) {
            echo json_encode(['success' => true, 'mensaje' => 'Pronóstico actualizado correctamente.']);
        } else {
            echo json_encode(['success' => false, 'mensaje' => 'Error al actualizar: ' . $stmt->error]);
        }
    } else {
        // INSERT
        $sql_insert = "INSERT INTO pronostico (id_usuario, id_partido, marcador_local, marcador_visitante, jugador_primer_gol, fecha_registro) 
                       VALUES (?, ?, ?, ?, ?, NOW())";
        $stmt = $conn->prepare($sql_insert);
        if (!$stmt) throw new Exception("Error en prepare INSERT: " . $conn->error);
        $stmt->bind_param("iiiis", $id_usuario, $id_partido, $goles_local, $goles_visitante, $jugador_primer_gol);
        $ok = $stmt->execute();
        $stmt->close();

        if ($ok) {
            echo json_encode(['success' => true, 'mensaje' => 'Pronóstico guardado correctamente.']);
        } else {
            echo json_encode(['success' => false, 'mensaje' => 'Error al guardar: ' . $stmt->error]);
        }
    }
} catch (Exception $e) {
    echo json_encode(['success' => false, 'mensaje' => 'Excepción: ' . $e->getMessage()]);
}
?>
