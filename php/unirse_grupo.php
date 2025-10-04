<?php
session_start();
include "conexion.php";
header("Content-Type: application/json; charset=utf-8");

if ($_SERVER["REQUEST_METHOD"] === "POST") {
    if (!isset($_SESSION["id_usuario"])) {
        echo json_encode(["status"=>"error","message"=>"Debes iniciar sesión"]);
        exit;
    }

    $idUsuario = $_SESSION["id_usuario"];
    $idGrupo = intval($_POST["grupo_id"]);

    try {
        // verificar existencia grupo y estado + maxParticipantes
        $stmtG = $conn->prepare("SELECT estado, max_participantes FROM grupo WHERE id_grupo=?");
        $stmtG->bind_param("i", $idGrupo);
        $stmtG->execute();
        $g = $stmtG->get_result()->fetch_assoc();
        if (!$g) {
            echo json_encode(["status"=>"error","message"=>"Grupo no existe"]);
            exit;
        }
        if ($g['estado'] !== 'Activo') {
            echo json_encode(["status"=>"error","message"=>"No puedes unirte, el grupo está inactivo"]);
            exit;
        }

        // contar miembros actuales
        $stmtCount = $conn->prepare("SELECT COUNT(*) AS total FROM usuario_grupo WHERE id_grupo=?");
        $stmtCount->bind_param("i", $idGrupo);
        $stmtCount->execute();
        $resCount = $stmtCount->get_result()->fetch_assoc();
        $total = intval($resCount['total']);
        $maxP = intval($g['max_participantes']);
        if ($total >= $maxP) {
            echo json_encode(["status"=>"error","message"=>"Grupo lleno"]);
            exit;
        }

        // validar que no esté ya dentro
        $stmt2 = $conn->prepare("SELECT * FROM usuario_grupo WHERE id_usuario=? AND id_grupo=?");
        $stmt2->bind_param("ii",$idUsuario,$idGrupo);
        $stmt2->execute();
        if ($stmt2->get_result()->num_rows > 0) {
            echo json_encode(["status"=>"error","message"=>"Ya perteneces a este grupo"]);
            exit;
        }

        // Insertar
        $stmt3 = $conn->prepare("INSERT INTO usuario_grupo (id_usuario, id_grupo, rol, puntos_totales) VALUES (?,?, 'miembro', 0)");
        $stmt3->bind_param("ii",$idUsuario,$idGrupo);
        $stmt3->execute();

        echo json_encode(["status"=>"success","message"=>"Te uniste al grupo con éxito"]);
    } catch(Exception $e){
        echo json_encode(["status"=>"error","message"=>"Error: ".$e->getMessage()]);
    }
}
?>
