// Firebase configuration and initialization (MANDATORY)
const firebaseConfig = {
    apiKey: "AIzaSyBokVu0scSUp98zAkIaR_wzlOHehro_PKA",
    authDomain: "terraza-bustillos.firebaseapp.com",
    projectId: "terraza-bustillos",
    storageBucket: "terraza-bustillos.firebasestorage.app",
    messagingSenderId: "555984411834",
    appId: "1:555984411834:web:94cb62c019a49a374ff683",
    measurementId: "G-JM6GH3RC16"
};

// El appId se puede extraer directamente de firebaseConfig si lo incluyes allí
const appId = firebaseConfig.appId;

// Firebase imports - ACTUALIZADO A LA VERSIÓN 12.0.0
import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js';
import {
    getAuth,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword, // Se mantiene por si se necesita para registro temporal
    signOut,
    onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js';
import { getFirestore, doc, setDoc, deleteDoc, collection, onSnapshot } from 'https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js';

let app, db, auth;
let userId = null; // Almacenará el ID del usuario actual
let isAdmin = false; // Bandera para determinar si el usuario actual es un administrador

// UID del administrador (¡IMPORTANTE: REEMPLAZA ESTO CON EL UID REAL DE TU CUENTA DE ADMINISTRADOR!)
// Para obtener tu UID:
// 1. Crea una cuenta con email y contraseña (puedes usar la función de registro temporalmente o en la consola de Firebase).
// 2. Inicia sesión con esa cuenta.
// 3. Abre la consola del navegador (F12) y busca el mensaje "User ID: [TU_UID_AQUI]".
// 4. Pega ese UID aquí.
const ADMIN_UID = "Zj4oJLAsW0SFoPhR0Sca0aq1HUQ2"; // UID del administrador agregado aquí

document.addEventListener('DOMContentLoaded', async () => {
    // Inicializar Firebase
    try {
        app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        auth = getAuth(app);

    } catch (error) {
        console.error("Error al inicializar Firebase:", error);
        const firebaseStatusDiv = document.getElementById('firebaseStatus');
        if (firebaseStatusDiv) {
            firebaseStatusDiv.textContent = 'Error al conectar con Firebase. Algunas funcionalidades podrían no estar disponibles.';
            firebaseStatusDiv.style.color = 'red';
        }
        return;
    }

    // Referencias a elementos de la interfaz de usuario de autenticación
    const loginForm = document.getElementById('loginForm');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const loginStatusDiv = document.getElementById('loginStatus');
    const logoutBtn = document.getElementById('logoutBtn');
    const adminToggleBtn = document.getElementById('adminToggleBtn'); // Botón de modo admin
    const userIdDisplay = document.getElementById('userIdDisplay'); // Muestra el ID de usuario

    // Ocultar el botón de modo admin y el estado de usuario al inicio
    if (adminToggleBtn) adminToggleBtn.style.display = 'none';
    if (userIdDisplay) userIdDisplay.style.display = 'none';
    if (logoutBtn) logoutBtn.style.display = 'none';

    // Listener para cambios en el estado de autenticación
    onAuthStateChanged(auth, (user) => {
        if (user) {
            userId = user.uid;
            console.log("User ID:", userId);
            if (userIdDisplay) {
                userIdDisplay.textContent = `ID de Usuario: ${userId}`;
                userIdDisplay.style.display = 'block';
            }

            // Verificar si el usuario es administrador
            isAdmin = (userId === ADMIN_UID);
            console.log("Modo Admin:", isAdmin);

            // Actualizar el estado del botón de modo admin
            if (adminToggleBtn) {
                adminToggleBtn.textContent = isAdmin ? 'Modo Admin: ON' : 'Modo Admin: OFF';
                adminToggleBtn.classList.toggle('bg-green-500', isAdmin);
                adminToggleBtn.classList.toggle('bg-gray-500', !isAdmin);
                adminToggleBtn.style.display = 'block'; // Mostrar el botón de modo admin
            }

            if (loginStatusDiv) loginStatusDiv.textContent = `Sesión iniciada como: ${user.email || 'Anónimo'}`;
            if (loginForm) loginForm.style.display = 'none'; // Ocultar formulario de login
            if (logoutBtn) logoutBtn.style.display = 'block'; // Mostrar botón de logout

        } else {
            userId = null;
            isAdmin = false;
            console.log("No user signed in.");
            if (userIdDisplay) userIdDisplay.style.display = 'none';
            if (adminToggleBtn) adminToggleBtn.style.display = 'none'; // Ocultar botón de modo admin
            if (loginStatusDiv) loginStatusDiv.textContent = 'No hay sesión iniciada.';
            if (loginForm) loginForm.style.display = 'block'; // Mostrar formulario de login
            if (logoutBtn) logoutBtn.style.display = 'none'; // Ocultar botón de logout

            // NO LIMPIAMOS unavailableDatesFirestore aquí.
            // El listener de onSnapshot seguirá trayendo los datos públicos.
        }
        // Llamar a setupUnavailableDatesListener() siempre, para que las fechas se carguen
        // sin importar el estado de autenticación.
        setupUnavailableDatesListener();
    });

    // Manejar el envío del formulario de inicio de sesión
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = emailInput.value;
            const password = passwordInput.value;

            try {
                await signInWithEmailAndPassword(auth, email, password);
                console.log("Inicio de sesión exitoso!");
                // onAuthStateChanged manejará la actualización de la UI
            } catch (error) {
                console.error("Error al iniciar sesión:", error.message);
                if (loginStatusDiv) loginStatusDiv.textContent = `Error al iniciar sesión: ${error.message}`;
            }
        });
    }

    // Manejar el cierre de sesión
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                await signOut(auth);
                console.log("Sesión cerrada.");
                // onAuthStateChanged manejará la actualización de la UI
            } catch (error) {
                console.error("Error al cerrar sesión:", error.message);
            }
        });
    }

    // --- Lógica de tu menú de navegación existente ---
    const menuIcon = document.querySelector('.menu-icon i');
    const menu = document.querySelector('.menu');

    menuIcon.addEventListener('click', () => {
        menu.classList.toggle('show');

        if (menu.classList.contains('show')) {
            menuIcon.classList.remove('fa-bars');
            menuIcon.classList.add('fa-times');
        } else {
            menuIcon.classList.remove('fa-times');
            menuIcon.classList.add('fa-bars');
        }
    });

    // --- Lógica del calendario de disponibilidad ---
    const monthYearDisplay = document.getElementById('monthYear');
    const daysGrid = document.getElementById('daysGrid');
    const prevMonthBtn = document.getElementById('prevMonth');
    const nextMonthBtn = document.getElementById('nextMonth');

    let currentDate = new Date();
    let unavailableDatesFirestore = []; // Esto almacenará las fechas de Firestore

    // Función para configurar el listener en tiempo real para fechas no disponibles
    function setupUnavailableDatesListener() {
        if (!db) { // Solo necesitamos que db esté inicializado, no userId para leer datos públicos
            console.warn("Firestore no inicializado. No se puede configurar el listener de fechas no disponibles.");
            return;
        }

        // Ruta de la colección para datos públicos: /artifacts/{appId}/public/data/{your_collection_name}
        const unavailableDatesColRef = collection(db, `artifacts/${appId}/public/data/unavailable_dates`);

        onSnapshot(unavailableDatesColRef, (snapshot) => {
            unavailableDatesFirestore = [];
            snapshot.forEach((doc) => {
                const data = doc.data();
                if (data.date) {
                    unavailableDatesFirestore.push(data.date);
                }
            });
            console.log("Fechas no disponibles desde Firestore:", unavailableDatesFirestore);
            renderCalendar(); // Re-renderizar el calendario con datos actualizados
        }, (error) => {
            console.error("Error al obtener fechas no disponibles:", error);
        });
    }

    // Función para renderizar el calendario
    function renderCalendar() {
        daysGrid.innerHTML = ''; // Limpiar días anteriores

        monthYearDisplay.textContent = currentDate.toLocaleString('es-ES', {
            month: 'long',
            year: 'numeric'
        });

        const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
        const firstDayOfWeek = firstDayOfMonth.getDay();

        const today = new Date();
        const isCurrentMonth = today.getFullYear() === currentDate.getFullYear() && today.getMonth() === currentDate.getMonth();

        // Añadir celdas vacías para los días antes del primer día del mes
        for (let i = 0; i < firstDayOfWeek; i++) {
            const emptyDay = document.createElement('div');
            emptyDay.classList.add('day', 'empty');
            daysGrid.appendChild(emptyDay);
        }

        // Añadir días del mes
        for (let day = 1; day <= daysInMonth; day++) {
            const dayElement = document.createElement('div');
            dayElement.classList.add('day', 'current-month');
            dayElement.textContent = day;

            const fullDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
            // Formatear fecha como YYYY-MM-DD para una comparación consistente con los datos de Firestore
            const formattedDate = fullDate.toISOString().split('T')[0];

            const isUnavailable = unavailableDatesFirestore.includes(formattedDate);

            if (isCurrentMonth && day === today.getDate()) {
                dayElement.classList.add('today');
            }

            if (isUnavailable) {
                dayElement.classList.add('unavailable');
            } else {
                dayElement.classList.add('available');
            }

            // Almacenar la fecha formateada como un atributo de datos para un fácil acceso
            dayElement.dataset.date = formattedDate;

            daysGrid.appendChild(dayElement);
        }
    }

    // Listener de eventos para el botón de mes anterior
    prevMonthBtn.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        renderCalendar();
    });

    // Listener de eventos para el botón de mes siguiente
    nextMonthBtn.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        renderCalendar();
    });

    // Renderizado inicial del calendario (será re-renderizado por onSnapshot más tarde)
    // No llamamos a renderCalendar aquí directamente, onAuthStateChanged lo hará
    // después de configurar el listener de Firestore.

    // --- Lógica para conectar el calendario con tu input de fecha y la funcionalidad de administrador ---
    const fechaPrincipalInput = document.getElementById('fechaPrincipal');
    const formularioReservas = document.getElementById('formularioReservas');
    const fechaHiddenInput = document.getElementById('fecha');

    daysGrid.addEventListener('click', async (event) => {
        const clickedDay = event.target.closest('.day');
        if (!clickedDay || clickedDay.classList.contains('empty')) {
            formularioReservas.style.display = 'none'; // Oculta el formulario si se hace clic en un día vacío
            return;
        }

        const selectedDateString = clickedDay.dataset.date;
        const isCurrentlyUnavailable = clickedDay.classList.contains('unavailable');

        // Lógica de edición solo si es administrador
        if (isAdmin && userId) {
            if (isCurrentlyUnavailable) {
                // Marcar como disponible (eliminar de Firestore)
                try {
                    const docRef = doc(db, `artifacts/${appId}/public/data/unavailable_dates`, selectedDateString);
                    await deleteDoc(docRef);
                    console.log(`Fecha ${selectedDateString} marcada como DISPONIBLE por admin ${userId}`);
                } catch (e) {
                    console.error("Error al marcar fecha como disponible:", e);
                }
            } else {
                // Marcar como no disponible (añadir a Firestore)
                try {
                    const docRef = doc(db, `artifacts/${appId}/public/data/unavailable_dates`, selectedDateString);
                    await setDoc(docRef, { date: selectedDateString, unavailableBy: userId });
                    console.log(`Fecha ${selectedDateString} marcada como NO DISPONIBLE por admin ${userId}`);
                } catch (e) {
                    console.error("Error al marcar fecha como no disponible:", e);
                }
            }
            // No es necesario re-renderizar manualmente, onSnapshot lo manejará
            formularioReservas.style.display = 'none'; // Ocultar formulario después de la acción de administrador
        } else { // Usuario regular o modo admin DESACTIVADO
            if (isCurrentlyUnavailable) {
                console.log('Esta fecha no está disponible para reservas.');
                formularioReservas.style.display = 'none';
            } else {
                // Usuario regular: seleccionar la fecha y mostrar el formulario
                document.querySelectorAll('.day.selected').forEach(day => day.classList.remove('selected'));
                clickedDay.classList.add('selected');

                fechaPrincipalInput.value = selectedDateString;
                fechaHiddenInput.value = selectedDateString;
                formularioReservas.style.display = 'block';
            }
        }
    });

    // Opcional: Si el usuario cambia la fecha en el input nativo, actualizar el calendario
    fechaPrincipalInput.addEventListener('change', () => {
        const selectedDate = new Date(fechaPrincipalInput.value);
        if (!isNaN(selectedDate.getTime())) { // Verificar si la fecha es válida
            currentDate = selectedDate;
            renderCalendar();
            formularioReservas.style.display = 'block'; // Mostrar formulario al seleccionar desde el input
            fechaHiddenInput.value = fechaPrincipalInput.value;
        } else {
            formularioReservas.style.display = 'none';
        }
    });

    // Ocultar el formulario al cargar la página si no hay fecha seleccionada
    formularioReservas.style.display = 'none';
});
