<?php
session_start();
include "conexion.php";

if ($_SERVER["REQUEST_METHOD"] === "POST") {
    if (!isset($_SESSION["id_usuario"])) {
        echo json_encode(["status"=>"error","message"=>"Debes iniciar sesión"]);
        exit;
    }

    $idCreador = $_SESSION["id_usuario"];
    $nombreGrupo = $_POST["nombre"];
    $maxParticipantes = $_POST["maxParticipantes"];
    $participantes = isset($_POST["participantes"]) ? $_POST["participantes"] : [];

    try {
        //  Insertar grupo
        $sql = "INSERT INTO grupo (nombre, fecha_creacion, hora_creacion, estado, id_creador, max_participantes) 
        VALUES (?, CURDATE(), CURTIME(), 'Activo', ?, ?)";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("sii", $nombreGrupo, $idCreador, $maxParticipantes);
        $stmt->execute();
        $idGrupo = $stmt->insert_id;

        //  Insertar creador en usuario_grupo
        $sqlUG = "INSERT INTO usuario_grupo (id_usuario, id_grupo, rol, puntos_totales) VALUES (?, ?, 'creador', 0)";
        $stmtUG = $conn->prepare($sqlUG);
        $stmtUG->bind_param("ii", $idCreador, $idGrupo);
        $stmtUG->execute();

        //  Dar admin al creador
        $sqlAdmin = "UPDATE usuario SET es_admin = 1 WHERE id_usuario = ?";
        $stmtAdmin = $conn->prepare($sqlAdmin);
        $stmtAdmin->bind_param("i", $idCreador);
        $stmtAdmin->execute();

        // verificar cupo
        $stmtCap = $conn->prepare("SELECT COUNT(*) AS total FROM usuario_grupo WHERE id_grupo = ?");
        $stmtCap->bind_param("i", $idGrupo);
        $stmtCap->execute();
        $countRes = $stmtCap->get_result()->fetch_assoc();
        $totalMembers = intval($countRes['total']); // hasta ahora solo creador está insertado -> 1

        $toAdd = count($participantes);
        if (($totalMembers + $toAdd) > intval($maxParticipantes)) {
        echo json_encode(["status"=>"error","message"=>"No es posible agregar tantos participantes: excede el cupo del grupo"]);
        exit;
        } 



        // Insertar participantes
        if(!empty($participantes)){
            $sqlP = "INSERT INTO usuario_grupo (id_usuario, id_grupo, rol, puntos_totales) VALUES (?, ?, 'miembro', 0)";
            $stmtP = $conn->prepare($sqlP);
            foreach($participantes as $idUsuario){
                $stmtP->bind_param("ii", $idUsuario, $idGrupo);
                $stmtP->execute();
            }
        }

        echo json_encode(["status"=>"success","message"=>"Grupo creado con éxito","idGrupo"=>$idGrupo]);

    } catch (Exception $e){
        echo json_encode(["status"=>"error","message"=>"Error: ".$e->getMessage()]);
    }
}
?>