<?php 


$host = "localhost";
$user = "root";
$pasword = "";
$bd = "bustillos";

$conexion = new mysqli($host,$user,$pasword,$bd);

if($conexion ->connect_error){
    die("Conexion fallida". $conexion->connect_error);
}else{
    echo("Conexion exitosa");
}

?>