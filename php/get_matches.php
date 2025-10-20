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
    $sql = "SELECT id_partido, equipo_local, equipo_visitante, fecha, etapa 
            FROM partido 
            ORDER BY fecha DESC";
    
    $result = $conn->query($sql);
    
    $matches = [];
    while ($row = $result->fetch_assoc()) {
        $matches[] = [
            'id' => $row['id_partido'],
            'teams' => $row['equipo_local'] . ' vs ' . $row['equipo_visitante'],
            'date' => $row['fecha'],
            'group' => $row['etapa']
        ];
    }
    
    echo json_encode([
        'success' => true,
        'matches' => $matches
    ]);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => 'Error al obtener partidos: ' . $e->getMessage()
    ]);
}

$conn->close();
?>