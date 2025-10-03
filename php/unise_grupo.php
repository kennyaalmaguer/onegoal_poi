<?php
session_start();
include "conexion.php";
header("Content-Type: application/json");

if ($_SERVER["REQUEST_METHOD"] === "POST") {
    if (!isset($_SESSION["id_usuario"])) {
        echo json_encode(["status"=>"error","message"=>"Debes iniciar sesión"]);
        exit;
    }

    $idUsuario = $_SESSION["id_usuario"];
    $idGrupo = intval($_POST["grupo_id"]);

    try {
        // Verificar cupo
        $stmt = $conn->prepare("SELECT COUNT(*) AS total, g.max_participantes 
                                FROM usuario_grupo ug 
                                JOIN grupo g ON g.id_grupo=ug.id_grupo
                                WHERE ug.id_grupo=?");
        $stmt->bind_param("i",$idGrupo);
        $stmt->execute();
        $res = $stmt->get_result()->fetch_assoc();

        if ($res["total"] >= $res["max_participantes"]) {
            echo json_encode(["status"=>"error","message"=>"Grupo lleno"]);
            exit;
        }

        // Validar que no esté ya dentro
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