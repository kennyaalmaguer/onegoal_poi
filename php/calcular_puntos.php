<?php
// calcular_puntos.php
// Devuelve una función calculatePoints(...) que calcula puntos según reglas configurables.

function calculatePoints($pred_local, $pred_visit, $real_local, $real_visit, $pred_scorer = null, $real_scorer = null) {
    // Convierte a enteros
    $pred_local = intval($pred_local);
    $pred_visit = intval($pred_visit);
    $real_local = intval($real_local);
    $real_visit = intval($real_visit);

    // Reglas (modificables)
    $P_EXACT = 5;   // marcador exacto
    $P_DIFF  = 3;   // diferencia de goles (goal difference) correcta
    $P_RESULT = 2;  // acierta resultado (ganador/empate)
    $P_SCORER = 4;  // acierta primer goleador

    $points_main = 0;

    // exact score?
    if ($pred_local === $real_local && $pred_visit === $real_visit) {
        $points_main = $P_EXACT;
    } else {
        // calcular diferencia
        $pred_diff = $pred_local - $pred_visit;
        $real_diff = $real_local - $real_visit;
        if ($pred_diff === $real_diff) {
            $points_main = $P_DIFF;
        } else {
            // resultado: ganador o empate
            $pred_result = ($pred_local === $pred_visit) ? 0 : (($pred_local > $pred_visit) ? 1 : -1);
            $real_result = ($real_local === $real_visit) ? 0 : (($real_local > $real_visit) ? 1 : -1);
            if ($pred_result === $real_result) {
                $points_main = $P_RESULT;
            } else {
                $points_main = 0;
            }
        }
    }

    // primer goleador
    $points_scorer = 0;
    if ($pred_scorer && $real_scorer) {
        // comparar sin distinguir mayúsculas/minúsculas y trim
        if (mb_strtolower(trim($pred_scorer)) === mb_strtolower(trim($real_scorer))) {
            $points_scorer = $P_SCORER;
        }
    }

    return $points_main + $points_scorer;
}