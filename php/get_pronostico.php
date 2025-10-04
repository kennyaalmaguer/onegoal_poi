<?php
session_start();
require_once 'conexion.php';
header('Content-Type: application/json; charset=utf-8');

error_reporting(E_ALL);
ini_set('display_errors', 1);

// Obtener el ID del usuario
$id_usuario = isset($_SESSION['id_usuario']) ? intval($_SESSION['id_usuario']) : null;
if (!$id_usuario && isset($_GET['user_id'])) {
    $id_usuario = intval($_GET['user_id']);
}

if (!$id_usuario) {
    echo json_encode(['success' => false, 'mensaje' => 'Usuario no autenticado.']);
    exit;
}

// Obtener el ID del partido (opcional)
$id_partido = isset($_GET['id_partido']) ? intval($_GET['id_partido']) : 0;

try {
    if ($id_partido > 0) {
        // Traer pronóstico de un partido específico
        $stmt = $conn->prepare("SELECT marcador_local AS goles_local, marcador_visitante AS goles_visitante, jugador_primer_gol
                                FROM pronostico 
                                WHERE id_usuario = ? AND id_partido = ?");
        $stmt->bind_param("ii", $id_usuario, $id_partido);
    } else {
        // Traer todos los pronósticos del usuario
        $stmt = $conn->prepare("SELECT id_partido, marcador_local AS goles_local, marcador_visitante AS goles_visitante, jugador_primer_gol, puntos_obtenidos
                                FROM pronostico 
                                WHERE id_usuario = ?");
        $stmt->bind_param("i", $id_usuario);
    }

    $stmt->execute();
    $res = $stmt->get_result();
    $pronosticos = [];
    while ($row = $res->fetch_assoc()) {
        $pronosticos[] = $row;
    }

    echo json_encode(['success' => true, 'pronosticos' => $pronosticos], JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    echo json_encode(['success' => false, 'mensaje' => 'Error: ' . $e->getMessage()]);
}
?>