<?php
$host = "127.0.0.1:3307";// o 127.0.0.1
$usuario = "root";    // usuario por defecto en XAMPP
$clave = "";          // contraseña (vacía en XAMPP por default)
$bd = "onegoal";

// Crear conexión
$conn = new mysqli($host, $usuario, $clave, $bd);

// Verificar conexión
if ($conn->connect_error) {
    die("Error de conexión: " . $conn->connect_error);
} 
?>