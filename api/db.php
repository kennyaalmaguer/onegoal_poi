<?php
$conn = new mysqli("localhost", "root", "", "onegoal");
if ($conn->connect_error) {
    die(json_encode(["error" => "Error de conexión a la base de datos"]));
}
?>