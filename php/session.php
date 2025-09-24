
<?php
session_start();

$response = [
    "logged_in" => false
];

if (isset($_SESSION["id_usuario"])) {
    $response["logged_in"] = true;
    $response["nombre"] = $_SESSION["nombre"];
}

header("Content-Type: application/json");
echo json_encode($response);
//ESTO ES PARA REVISAR HAY ALGUIEN LOGEADO
?>
