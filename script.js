// Firebase configuration and initialization (MANDATORY)
// **IMPORTANTE:** Reemplaza los valores de firebaseConfig con los de tu propio proyecto de Firebase.
// Puedes encontrar esta configuración en la Consola de Firebase -> Configuración del proyecto -> Tus aplicaciones.
const firebaseConfig = {
    apiKey: "AIzaSyBokVu0scSUp98zAkIaR_wzlOHehro_PKA",
    authDomain: "terraza-bustillos.firebaseapp.com",
    projectId: "terraza-bustillos",
    storageBucket: "terraza-bustillos.firebasestorage.app",
    messagingSenderId: "555984411834",
    appId: "1:555984411834:web:94cb62c019a49a374ff683",
    measurementId: "G-JM6GH3RC16" // measurementId es opcional, pero está bien incluirlo
};

// El appId se puede extraer directamente de firebaseConfig si lo incluyes allí
const appId = firebaseConfig.appId; // Usamos el appId de tu configuración real

// Firebase imports
import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js';
import { getFirestore, doc, setDoc, deleteDoc, collection, onSnapshot } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js';

let app, db, auth;
let userId = null; // Will store the current user's ID
let isAdmin = false; // Flag to determine if the current user is an admin (for demo purposes)

document.addEventListener('DOMContentLoaded', async () => {
    // Initialize Firebase
    try {
        app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        auth = getAuth(app);

        // Sign in the user (using custom token if available, otherwise anonymously)
        // Nota: __initial_auth_token es específico de Canvas. Para Vercel,
        // necesitarías implementar tu propio sistema de autenticación inicial
        // o permitir el inicio de sesión anónimo por defecto.
        // Para este ejemplo, eliminamos la dependencia de __initial_auth_token.
        await signInAnonymously(auth);

    } catch (error) {
        console.error("Error initializing Firebase or signing in:", error);
        // Display a user-friendly message in the UI if Firebase fails to initialize
        const firebaseStatusDiv = document.getElementById('firebaseStatus');
        if (firebaseStatusDiv) {
            firebaseStatusDiv.textContent = 'Error al conectar con Firebase. Algunas funcionalidades podrían no estar disponibles.';
            firebaseStatusDiv.style.color = 'red';
        }
        return; // Stop execution if Firebase setup fails
    }

    // Listen for auth state changes to get the userId and set up Firestore listener
    onAuthStateChanged(auth, (user) => {
        if (user) {
            userId = user.uid;
            console.log("User ID:", userId);
            // Display user ID in the UI
            const userIdDisplay = document.getElementById('userIdDisplay');
            if (userIdDisplay) {
                userIdDisplay.textContent = `ID de Usuario: ${userId}`;
            }

            // For demonstration: A simple way to make a user an admin.
            // In a real application, you'd manage roles in Firestore or a backend.
            // Example: If a specific user ID is admin, or if a toggle is active.
            // For now, let's allow a toggle button to simulate admin access.
            const adminToggleBtn = document.getElementById('adminToggleBtn');
            if (adminToggleBtn) {
                adminToggleBtn.addEventListener('click', () => {
                    isAdmin = !isAdmin;
                    adminToggleBtn.textContent = isAdmin ? 'Modo Admin: ON' : 'Modo Admin: OFF';
                    adminToggleBtn.classList.toggle('bg-green-500', isAdmin);
                    adminToggleBtn.classList.toggle('bg-gray-500', !isAdmin);
                    console.log("Admin Mode:", isAdmin);
                    renderCalendar(); // Re-render to reflect admin view
                });
            }

            // Setup Firestore listener for unavailable dates
            setupUnavailableDatesListener();

        } else {
            userId = null;
            console.log("No user signed in.");
            const userIdDisplay = document.getElementById('userIdDisplay');
            if (userIdDisplay) {
                userIdDisplay.textContent = 'ID de Usuario: No autenticado';
            }
            // Clear unavailable dates if no user
            unavailableDatesFirestore = [];
            renderCalendar();
        }
    });


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
    let unavailableDatesFirestore = []; // This will store dates from Firestore

    // Function to set up real-time listener for unavailable dates
    function setupUnavailableDatesListener() {
        if (!db || !userId) {
            console.warn("Firestore not initialized or user not authenticated. Cannot set up listener.");
            return;
        }

        // Collection path for public data: /artifacts/{appId}/public/data/{your_collection_name}
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
            renderCalendar(); // Re-render calendar with updated data
        }, (error) => {
            console.error("Error getting unavailable dates:", error);
        });
    }

    // Function to render the calendar
    function renderCalendar() {
        daysGrid.innerHTML = ''; // Clear previous days

        monthYearDisplay.textContent = currentDate.toLocaleString('es-ES', {
            month: 'long',
            year: 'numeric'
        });

        const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
        const firstDayOfWeek = firstDayOfMonth.getDay();

        const today = new Date();
        const isCurrentMonth = today.getFullYear() === currentDate.getFullYear() && today.getMonth() === currentDate.getMonth();

        // Add empty cells for days before the first day of the month
        for (let i = 0; i < firstDayOfWeek; i++) {
            const emptyDay = document.createElement('div');
            emptyDay.classList.add('day', 'empty');
            daysGrid.appendChild(emptyDay);
        }

        // Add days of the month
        for (let day = 1; day <= daysInMonth; day++) {
            const dayElement = document.createElement('div');
            dayElement.classList.add('day', 'current-month');
            dayElement.textContent = day;

            const fullDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
            // Format date as YYYY-MM-DD for consistent comparison with Firestore data
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

            // Store the formatted date as a data attribute for easy access
            dayElement.dataset.date = formattedDate;

            daysGrid.appendChild(dayElement);
        }
    }

    // Event listener for previous month button
    prevMonthBtn.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        renderCalendar();
    });

    // Event listener for next month button
    nextMonthBtn.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        renderCalendar();
    });

    // Initial render of the calendar (will be re-rendered by onSnapshot later)
    renderCalendar();


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

        const selectedDateString = clickedDay.dataset.date; // Get the YYYY-MM-DD date string
        const isCurrentlyUnavailable = clickedDay.classList.contains('unavailable');

        if (isAdmin && userId) { // Only if admin mode is ON and user is authenticated
            if (isCurrentlyUnavailable) {
                // Mark as available (delete from Firestore)
                try {
                    const docRef = doc(db, `artifacts/${appId}/public/data/unavailable_dates`, selectedDateString);
                    await deleteDoc(docRef);
                    console.log(`Fecha ${selectedDateString} marcada como DISPONIBLE por admin ${userId}`);
                } catch (e) {
                    console.error("Error al marcar fecha como disponible:", e);
                }
            } else {
                // Mark as unavailable (add to Firestore)
                try {
                    const docRef = doc(db, `artifacts/${appId}/public/data/unavailable_dates`, selectedDateString);
                    await setDoc(docRef, { date: selectedDateString, unavailableBy: userId });
                    console.log(`Fecha ${selectedDateString} marcada como NO DISPONIBLE por admin ${userId}`);
                } catch (e) {
                    console.error("Error al marcar fecha como no disponible:", e);
                }
            }
            // No need to manually re-render, onSnapshot will handle it
            formularioReservas.style.display = 'none'; // Hide form after admin action
        } else { // Regular user or admin mode OFF
            if (isCurrentlyUnavailable) {
                console.log('Esta fecha no está disponible para reservas.');
                formularioReservas.style.display = 'none';
            } else {
                // Regular user: select the date and show the form
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
        if (!isNaN(selectedDate.getTime())) { // Check if date is valid
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
