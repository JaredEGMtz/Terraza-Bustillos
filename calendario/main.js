// Importa y configura Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { firebaseConfig } from './config.js';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const diasDisponibles = new Set();
const diasNoDisponibles = new Set();

// Cargar días desde Firestore
async function cargarDias() {
    const snapshot = await getDocs(collection(db, "calendario"));
    snapshot.forEach((doc) => {
        const data = doc.data();
        const fecha = data.fecha; // formato: "2025-07-27"
        if (data.disponible) {
            diasDisponibles.add(fecha);
        } else {
            diasNoDisponibles.add(fecha);
        }
    });

    generarCalendario(new Date());
}

// Crear calendario visual
function generarCalendario(fecha) {
    const calendario = document.getElementById('calendario');
    calendario.innerHTML = ''; // limpiar

    const año = fecha.getFullYear();
    const mes = fecha.getMonth();

    const primerDia = new Date(año, mes, 1);
    const ultimoDia = new Date(año, mes + 1, 0);
    const diasEnMes = ultimoDia.getDate();
    const diaInicio = primerDia.getDay(); // 0 (Dom) - 6 (Sáb)

    const titulo = document.getElementById('mes-titulo');
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    titulo.textContent = `${meses[mes]} ${año}`;

    // Celdas vacías al inicio
    for (let i = 0; i < diaInicio; i++) {
        const celdaVacia = document.createElement('div');
        celdaVacia.className = 'dia vacio';
        calendario.appendChild(celdaVacia);
    }

    // Días del mes
    for (let dia = 1; dia <= diasEnMes; dia++) {
        const fechaActual = `${año}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;

        const celda = document.createElement('div');
        celda.className = 'dia';
        celda.textContent = dia;

        if (diasDisponibles.has(fechaActual)) {
            celda.classList.add('disponible');
        } else if (diasNoDisponibles.has(fechaActual)) {
            celda.classList.add('no-disponible');
        }

        calendario.appendChild(celda);
    }
}

// Navegación del calendario
document.getElementById('mes-anterior').addEventListener('click', () => {
    const actual = new Date(document.getElementById('mes-titulo').textContent + " 1");
    actual.setMonth(actual.getMonth() - 1);
    generarCalendario(actual);
});

document.getElementById('mes-siguiente').addEventListener('click', () => {
    const actual = new Date(document.getElementById('mes-titulo').textContent + " 1");
    actual.setMonth(actual.getMonth() + 1);
    generarCalendario(actual);
});

// Iniciar
cargarDias();
