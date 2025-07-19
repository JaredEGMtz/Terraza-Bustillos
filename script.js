// Firebase configuration and initialization (MANDATORY)
// Ahora, la configuración se obtiene de las variables de entorno de Vercel
const firebaseConfig = {
    apiKey: process.env.VITE_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.VITE_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.VITE_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.VITE_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.VITE_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.VITE_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.VITE_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// El appId se puede extraer directamente de firebaseConfig
const appId = firebaseConfig.appId;

// Firebase imports - ACTUALIZADO A LA VERSIÓN 12.0.0
import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js';
import {
    getAuth,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js';
import { getFirestore, doc, setDoc, deleteDoc, collection, onSnapshot } from 'https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js';

let app, db, auth;
let userId = null;
let isAdmin = false;

const ADMIN_UID = "r8iNai6DZ5Wn6MYsZqIyBPHCUcV2"; // Tu UID de administrador

document.addEventListener('DOMContentLoaded', async () => {
    // Inicializar Firebase
    try {
        // Verificar que las variables de entorno estén presentes
        if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
            throw new Error("Firebase configuration environment variables are missing.");
        }

        app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        auth = getAuth(app);

    } catch (error) {
        console.error("Error al inicializar Firebase:", error);
        const firebaseStatusDiv = document.getElementById('firebaseStatus');
        if (firebaseStatusDiv) {
            firebaseStatusDiv.textContent = `Error al conectar con Firebase: ${error.message}. Algunas funcionalidades podrían no estar disponibles.`;
            firebaseStatusDiv.style.color = 'red';
        }
        return;
    }

    // Resto de tu código JavaScript permanece igual...
    // ... (todo el código desde onAuthStateChanged hacia abajo) ...

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

        }
        setupUnavailableDatesListener(); // Siempre llamar para cargar fechas
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
    let unavailableDatesFirestore = [];

    function setupUnavailableDatesListener() {
        if (!db) {
            console.warn("Firestore no inicializado. No se puede configurar el listener de fechas no disponibles.");
            return;
        }

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
            renderCalendar();
        }, (error) => {
            console.error("Error al obtener fechas no disponibles:", error);
        });
    }

    function renderCalendar() {
        daysGrid.innerHTML = '';

        monthYearDisplay.textContent = currentDate.toLocaleString('es-ES', {
            month: 'long',
            year: 'numeric'
        });

        const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
        const firstDayOfWeek = firstDayOfMonth.getDay();

        const today = new Date();
        const isCurrentMonth = today.getFullYear() === currentDate.getFullYear() && today.getMonth() === currentDate.getMonth();

        for (let i = 0; i < firstDayOfWeek; i++) {
            const emptyDay = document.createElement('div');
            emptyDay.classList.add('day', 'empty');
            daysGrid.appendChild(emptyDay);
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const dayElement = document.createElement('div');
            dayElement.classList.add('day', 'current-month');
            dayElement.textContent = day;

            const fullDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
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

            dayElement.dataset.date = formattedDate;

            daysGrid.appendChild(dayElement);
        }
    }

    prevMonthBtn.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        renderCalendar();
    });

    nextMonthBtn.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        renderCalendar();
    });

    const fechaPrincipalInput = document.getElementById('fechaPrincipal');
    const formularioReservas = document.getElementById('formularioReservas');
    const fechaHiddenInput = document.getElementById('fecha');

    daysGrid.addEventListener('click', async (event) => {
        const clickedDay = event.target.closest('.day');
        if (!clickedDay || clickedDay.classList.contains('empty')) {
            formularioReservas.style.display = 'none';
            return;
        }

        const selectedDateString = clickedDay.dataset.date;
        const isCurrentlyUnavailable = clickedDay.classList.contains('unavailable');

        if (isAdmin && userId) {
            if (isCurrentlyUnavailable) {
                try {
                    const docRef = doc(db, `artifacts/${appId}/public/data/unavailable_dates`, selectedDateString);
                    await deleteDoc(docRef);
                    console.log(`Fecha ${selectedDateString} marcada como DISPONIBLE por admin ${userId}`);
                } catch (e) {
                    console.error("Error al marcar fecha como disponible:", e);
                }
            } else {
                try {
                    const docRef = doc(db, `artifacts/${appId}/public/data/unavailable_dates`, selectedDateString);
                    await setDoc(docRef, { date: selectedDateString, unavailableBy: userId });
                    console.log(`Fecha ${selectedDateString} marcada como NO DISPONIBLE por admin ${userId}`);
                } catch (e) {
                    console.error("Error al marcar fecha como no disponible:", e);
                }
            }
            formularioReservas.style.display = 'none';
        } else {
            if (isCurrentlyUnavailable) {
                console.log('Esta fecha no está disponible para reservas.');
                formularioReservas.style.display = 'none';
            } else {
                document.querySelectorAll('.day.selected').forEach(day => day.classList.remove('selected'));
                clickedDay.classList.add('selected');

                fechaPrincipalInput.value = selectedDateString;
                fechaHiddenInput.value = selectedDateString;
                formularioReservas.style.display = 'block';
            }
        }
    });

    fechaPrincipalInput.addEventListener('change', () => {
        const selectedDate = new Date(fechaPrincipalInput.value);
        if (!isNaN(selectedDate.getTime())) {
            currentDate = selectedDate;
            renderCalendar();
            formularioReservas.style.display = 'block';
            fechaHiddenInput.value = fechaPrincipalInput.value;
        } else {
            formularioReservas.style.display = 'none';
        }
    });

    formularioReservas.style.display = 'none';
});
