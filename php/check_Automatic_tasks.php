<?php
session_start();
require_once 'conexion.php';

function crearTareasAutomaticas($conn, $id_usuario) {
    $tareas_creadas = 0;
    
    // 1. TAREAS DE PRONÓSTICO - Partidos futuros (próximos 7 días)
    $sql_pronosticos = "
        SELECT id_partido, equipo_local, equipo_visitante, fecha 
        FROM partido 
        WHERE fecha BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 7 DAY)
        AND id_partido NOT IN (
            SELECT id_partido FROM tarea 
            WHERE id_usuario = ? AND tipo = 'pronostico'
        )
    ";
    
    $stmt = $conn->prepare($sql_pronosticos);
    $stmt->bind_param("i", $id_usuario);
    $stmt->execute();
    $partidos_futuros = $stmt->get_result();
    
    while ($partido = $partidos_futuros->fetch_assoc()) {
        $sql_insert = "
            INSERT INTO tarea (id_usuario, id_partido, nombre, descripcion, tipo, fecha_limite, puntos, estado, scope) 
            VALUES (?, ?, ?, ?, 'pronostico', ?, 5, 'Pendiente', 'individual')
        ";
        $stmt_insert = $conn->prepare($sql_insert);
        $nombre = 'Pronóstico: ' . $partido['equipo_local'] . ' vs ' . $partido['equipo_visitante'];
        $descripcion = 'Realiza tu pronóstico del marcador exacto y el primer goleador.';
        $stmt_insert->bind_param("iisss", $id_usuario, $partido['id_partido'], $nombre, $descripcion, $partido['fecha']);
        $stmt_insert->execute();
        $tareas_creadas++;
    }
    
    // 2. TAREAS DE ANÁLISIS - Partidos que terminaron en las últimas 48 horas
    $sql_terminados = "
        SELECT id_partido, equipo_local, equipo_visitante, fecha, resultado_final 
        FROM partido 
        WHERE resultado_final IS NOT NULL 
        AND fecha BETWEEN DATE_SUB(NOW(), INTERVAL 48 HOUR) AND NOW()
        AND id_partido NOT IN (
            SELECT id_partido FROM tarea 
            WHERE id_usuario = ? AND tipo IN ('resumen', 'jugador')
        )
    ";
    
    $stmt = $conn->prepare($sql_terminados);
    $stmt->bind_param("i", $id_usuario);
    $stmt->execute();
    $partidos_terminados = $stmt->get_result();
    
    while ($partido = $partidos_terminados->fetch_assoc()) {
        // Tarea de Resumen
        $sql_resumen = "
            INSERT INTO tarea (id_usuario, id_partido, nombre, descripcion, tipo, fecha_limite, puntos, estado, scope) 
            VALUES (?, ?, ?, ?, 'resumen', DATE_ADD(NOW(), INTERVAL 24 HOUR), 3, 'Pendiente', 'individual')
        ";
        $stmt_resumen = $conn->prepare($sql_resumen);
        $nombre_resumen = 'Resumen: ' . $partido['equipo_local'] . ' vs ' . $partido['equipo_visitante'];
        $descripcion_resumen = 'Redacta un resumen analítico del partido. Resultado: ' . $partido['resultado_final'];
        $stmt_resumen->bind_param("iiss", $id_usuario, $partido['id_partido'], $nombre_resumen, $descripcion_resumen);
        $stmt_resumen->execute();
        $tareas_creadas++;
        
        // Tarea de Jugador Clave
        $sql_jugador = "
            INSERT INTO tarea (id_usuario, id_partido, nombre, descripcion, tipo, fecha_limite, puntos, estado, scope) 
            VALUES (?, ?, ?, ?, 'jugador', DATE_ADD(NOW(), INTERVAL 24 HOUR), 2, 'Pendiente', 'individual')
        ";
        $stmt_jugador = $conn->prepare($sql_jugador);
        $nombre_jugador = 'Jugador Clave: ' . $partido['equipo_local'] . ' vs ' . $partido['equipo_visitante'];
        $descripcion_jugador = 'Identifica al jugador clave del partido y justifica tu elección. Resultado: ' . $partido['resultado_final'];
        $stmt_jugador->bind_param("iiss", $id_usuario, $partido['id_partido'], $nombre_jugador, $descripcion_jugador);
        $stmt_jugador->execute();
        $tareas_creadas++;
    }
    
    return $tareas_creadas;
}

// Ejecutar solo si hay usuario logueado
$id_usuario = isset($_SESSION['id_usuario']) ? $_SESSION['id_usuario'] : null;

if ($id_usuario) {
    $tareas_creadas = crearTareasAutomaticas($conn, $id_usuario);
    
    if ($tareas_creadas > 0) {
        error_log("Tareas automáticas creadas: " . $tareas_creadas . " para usuario: " . $id_usuario);
    }
}

$conn->close();
?>