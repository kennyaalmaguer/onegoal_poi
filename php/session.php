
<?php
session_start();

$response = [
    "loggedIn" => false
];

if (isset($_SESSION["id_usuario"])) {
    $response["loggedIn"] = true;
    $response["nombre"] = $_SESSION["nombre"];
    $response["correo"] = $_SESSION["correo"];
    $response["foto_perfil"] = $_SESSION["foto_perfil"]; 
}

header("Content-Type: application/json");
echo json_encode($response);
?>