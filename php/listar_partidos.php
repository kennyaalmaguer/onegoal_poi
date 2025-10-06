<?php
session_start();
require_once 'conexion.php'; 

<<<<<<< Updated upstream
header('Content-Type: application/json; charset=utf-8');
=======
header('Content-Type: application/json; charset=utf-8'); 
>>>>>>> Stashed changes
error_reporting(E_ALL);
ini_set('display_errors', 1);


$conexion = $conn;

if (!$conexion) {
    echo json_encode(['success' => false, 'mensaje' => 'Error de conexión a la base de datos']);
    exit;
}

try {
   $sql = "SELECT id_partido, 
                   equipo_local, 
                   equipo_visitante, 
                   fecha, 
                   hora, 
                   etapa
            FROM partido
            ORDER BY fecha, hora";

    $result = $conexion->query($sql);

    $partidos = [];
    while ($row = $result->fetch_assoc()) {
        $partidos[] = $row;
    }

    echo json_encode(['success' => true, 'partidos' => $partidos], JSON_UNESCAPED_UNICODE);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'mensaje' => 'Error: ' . $e->getMessage()]);
}
?>