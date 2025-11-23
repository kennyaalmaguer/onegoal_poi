<?php
session_start();
require_once 'conexion.php';
header('Content-Type: application/json; charset=utf-8');

function normalizarNombre($nombre) {
    if (!$nombre) return '';
    
    // Convertir a minúsculas y quitar espacios extras
    $nombre = trim(strtolower($nombre));
    
    // Remover acentos y caracteres especiales
    $nombre = iconv('UTF-8', 'ASCII//TRANSLIT', $nombre);
    
    // Remover puntos, comas, etc.
    $nombre = preg_replace('/[^a-z0-9\s]/', '', $nombre);
    
    // Remover espacios múltiples
    $nombre = preg_replace('/\s+/', ' ', $nombre);
    
    return trim($nombre);
}

function calcularPuntosPronostico($pronostico, $partido) {
    $puntos = 0;
    
    // Verificar resultado exacto (5 puntos)
    $pronostico_resultado = $pronostico['marcador_local'] . '-' . $pronostico['marcador_visitante'];
    if ($pronostico_resultado === $partido['resultado_final']) {
        $puntos += 5;
    } else {
        // Verificar ganador/empate (2 puntos)
        list($local_real, $visitante_real) = explode('-', $partido['resultado_final']);
        $local_real = intval($local_real);
        $visitante_real = intval($visitante_real);
        
        $resultado_real = $local_real <=> $visitante_real; // -1: visita, 0: empate, 1: local
        $resultado_pronostico = $pronostico['marcador_local'] <=> $pronostico['marcador_visitante'];
        
        if ($resultado_real === $resultado_pronostico) {
            $puntos += 2;
        }
    }
    
    // Verificar primer goleador (3 puntos) - CON FLEXIBILIDAD
    if ($pronostico['jugador_primer_gol'] && $partido['jugador_primer_gol']) {
        $goleador_pronostico = normalizarNombre($pronostico['jugador_primer_gol']);
        $goleador_real = normalizarNombre($partido['jugador_primer_gol']);
        
        // Verificar coincidencia exacta o por apellido
        if ($goleador_pronostico === $goleador_real) {
            $puntos += 3;
        } else {
            // Verificar si coincide el apellido
            $apellido_pronostico = explode(' ', $goleador_pronostico);
            $apellido_pronostico = end($apellido_pronostico); // Última palabra (apellido)
            
            $apellido_real = explode(' ', $goleador_real);
            $apellido_real = end($apellido_real); // Última palabra (apellido)
            
            if ($apellido_pronostico === $apellido_real) {
                $puntos += 3;
            }
        }
    }
    
    return $puntos;
}

try {
    // Obtener todos los partidos con resultado
    $partidos_stmt = $conn->prepare("
        SELECT id_partido, equipo_local, equipo_visitante, resultado_final, jugador_primer_gol 
        FROM partido 
        WHERE resultado_final IS NOT NULL
    ");
    $partidos_stmt->execute();
    $partidos = $partidos_stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    
    $total_actualizados = 0;
    
    foreach ($partidos as $partido) {
        // Obtener todos los pronósticos para este partido
        $pronosticos_stmt = $conn->prepare("
            SELECT id_pronostico, id_usuario, marcador_local, marcador_visitante, jugador_primer_gol, puntos_obtenidos
            FROM pronostico 
            WHERE id_partido = ?
        ");
        $pronosticos_stmt->bind_param("i", $partido['id_partido']);
        $pronosticos_stmt->execute();
        $pronosticos = $pronosticos_stmt->get_result()->fetch_all(MYSQLI_ASSOC);
        
        foreach ($pronosticos as $pronostico) {
            // Solo calcular si no tiene puntos o tiene solo los puntos base
            if ($pronostico['puntos_obtenidos'] <= 5) {
                $puntos_reales = calcularPuntosPronostico($pronostico, $partido);
                
                // Si los puntos reales son diferentes a los actuales, actualizar
                if ($puntos_reales != $pronostico['puntos_obtenidos']) {
                    // Actualizar puntos del pronóstico
                    $update_stmt = $conn->prepare("
                        UPDATE pronostico SET puntos_obtenidos = ? WHERE id_pronostico = ?
                    ");
                    $update_stmt->bind_param("ii", $puntos_reales, $pronostico['id_pronostico']);
                    $update_stmt->execute();
                    
                    // Calcular diferencia de puntos
                    $diferencia = $puntos_reales - $pronostico['puntos_obtenidos'];
                    
                    if ($diferencia > 0) {
                        // Actualizar puntos totales del usuario
                        $user_stmt = $conn->prepare("
                            UPDATE usuario 
                            SET puntos_totales = COALESCE(puntos_totales, 0) + ? 
                            WHERE id_usuario = ?
                        ");
                        $user_stmt->bind_param("ii", $diferencia, $pronostico['id_usuario']);
                        $user_stmt->execute();
                        
                        // Registrar en tabla puntos
                        $puntos_stmt = $conn->prepare("
                            INSERT INTO puntos (id_usuario, fuente, detalle, puntos_otorgados) 
                            VALUES (?, 'Pronostico', ?, ?)
                        ");
                        $detalle = "Aciertos: " . $partido['equipo_local'] . " vs " . $partido['equipo_visitante'];
                        $puntos_stmt->bind_param("isi", $pronostico['id_usuario'], $detalle, $diferencia);
                        $puntos_stmt->execute();
                    }
                    
                    $total_actualizados++;
                }
            }
        }
    }
    
    echo json_encode([
        'success' => true, 
        'mensaje' => "Puntos reales calculados: $total_actualizados pronósticos actualizados",
        'total_actualizados' => $total_actualizados
    ]);
    
} catch (Exception $e) {
    echo json_encode(['success' => false, 'mensaje' => 'Error: ' . $e->getMessage()]);
}
?>