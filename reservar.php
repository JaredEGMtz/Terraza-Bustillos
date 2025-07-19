<?php 


$host = "localhost";
$user = "root";
$pasword = "";
$bd = "bustillos";

$conexion = new mysqli($host,$user,$pasword,$bd);

if($conexion ->connect_error){
    die("Conexion fallida". $conexion->connect_error);
}


$nombre = $_POST['nombre'];
$personas = $_POST['personas'];
$fecha = $_POST['fecha'];
$hora_inicio = $_POST['hora_inicio'];
$hora_fin = $_POST['hora_fin'];




$ask = "SELECT * FROM reserva
        WHERE fecha = '$fecha'
        AND NOT (
            '$hora_fin' <= hora_entrada OR
            '$hora_inicio' >= hora_salida
        )";

$insert = "INSERT INTO reserva(ID,nombre, personas, fecha, hora_entrada, hora_salida) VALUES('NULL', '$nombre', '$personas', '$fecha', '$hora_inicio', '$hora_fin')";

$result = $conexion->query($ask);

if($result->num_rows == 0){
    $conexion->query($insert);
    echo "Reserva exitosa";
}else{
    echo "Reserva no disponible";
}



?>