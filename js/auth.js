// Функции авторизации и регистрации
function showAuthTab(tabName) {
    console.log('🔀 Переключение на таб:', tabName);
    document.querySelectorAll('.auth-tab').forEach(tab => {
        tab.classList.toggle('active', tab.getAttribute('data-tab') === tabName);
    });

    document.getElementById('loginForm').classList.toggle('hidden', tabName !== 'login');
    document.getElementById('registerForm').classList.toggle('hidden', tabName !== 'register');
}

function login() {
    console.log('=== ВХОД В СИСТЕМУ ===');
    
    const usernameInput = document.getElementById('authUsername');
    const passwordInput = document.getElementById('authPassword');
    
    if (!usernameInput || !passwordInput) {
        console.error('❌ Элементы формы входа не найдены!');
        showNotification('❌ Ошибка формы!', 'error');
        return;
    }

    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();

    console.log('📝 Данные для входа:', { username });

    if (!username || !password) {
        showNotification('❌ Заполните все поля!', 'error');
        return;
    }

    // Показываем загрузку
    const loginBtn = document.getElementById('loginBtn');
    let originalText = '';
    if (loginBtn) {
        originalText = loginBtn.innerHTML;
        loginBtn.innerHTML = '<div class="loading-spinner"></div><span>Вход...</span>';
        loginBtn.disabled = true;
    }

    if (socket && socket.connected) {
        console.log('📤 Отправка запроса на вход...');
        socket.emit('login', { username, password });
        
        // Автоматическое восстановление кнопки через 5 секунд
        setTimeout(() => {
            if (loginBtn && loginBtn.disabled) {
                loginBtn.innerHTML = originalText;
                loginBtn.disabled = false;
                showNotification('⚠️ Превышено время ожидания ответа от сервера', 'error');
            }
        }, 5000);
    } else {
        console.error('❌ Сокет не подключен!');
        showNotification('❌ Нет соединения с сервером', 'error');
        if (loginBtn) {
            loginBtn.innerHTML = originalText;
            loginBtn.disabled = false;
        }
    }
}

function register() {
    console.log('=== РЕГИСТРАЦИЯ ===');
    
    const usernameInput = document.getElementById('regUsername');
    const passwordInput = document.getElementById('regPassword');
    const passwordConfirmInput = document.getElementById('regPasswordConfirm');
    const displayNameInput = document.getElementById('regDisplayName');
    const emailInput = document.getElementById('regEmail');
    
    if (!usernameInput || !passwordInput || !passwordConfirmInput) {
        console.error('❌ Элементы формы регистрации не найдены!');
        showNotification('❌ Ошибка формы!', 'error');
        return;
    }

    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();
    const passwordConfirm = passwordConfirmInput.value.trim();
    const displayName = displayNameInput ? displayNameInput.value.trim() : '';
    const email = emailInput ? emailInput.value.trim() : '';

    console.log('📝 Данные для регистрации:', { username, email, displayName });

    if (!username || !password || !passwordConfirm) {
        showNotification('❌ Заполните обязательные поля!', 'error');
        return;
    }

    if (password !== passwordConfirm) {
        showNotification('❌ Пароли не совпадают!', 'error');
        return;
    }

    if (password.length < 6) {
        showNotification('❌ Пароль должен быть не менее 6 символов!', 'error');
        return;
    }

    if (username.length < 3) {
        showNotification('❌ Логин должен быть не менее 3 символов!', 'error');
        return;
    }

    // Показываем загрузку
    const registerBtn = document.getElementById('registerBtn');
    let originalText = '';
    if (registerBtn) {
        originalText = registerBtn.innerHTML;
        registerBtn.innerHTML = '<div class="loading-spinner"></div><span>Регистрация...</span>';
        registerBtn.disabled = true;
    }

    if (socket && socket.connected) {
        console.log('📤 Отправка запроса на регистрацию...');
        socket.emit('register', { 
            username, 
            password,
            displayName,
            email,
            role: 'user'
        });
        
        // Автоматическое восстановление кнопки через 5 секунд
        setTimeout(() => {
            if (registerBtn && registerBtn.disabled) {
                registerBtn.innerHTML = originalText;
                registerBtn.disabled = false;
                showNotification('⚠️ Превышено время ожидания ответа от сервера', 'error');
            }
        }, 5000);
    } else {
        console.error('❌ Сокет не подключен!');
        showNotification('❌ Нет соединения с сервером', 'error');
        if (registerBtn) {
            registerBtn.innerHTML = originalText;
            registerBtn.disabled = false;
        }
    }
}

// ФУНКЦИИ ПОКАЗА ИНТЕРФЕЙСОВ
function showUserInterface() {
    console.log('👤 Показ интерфейса пользователя');
    hideAllInterfaces();
    document.getElementById('userInterface').style.display = 'block';
    
    // Обновляем информацию пользователя
    updateUserProfileUI();
    
    // Загружаем данные
    loadListenerCards();
    updateUserNotifications();
    
    showNotification('👤 Добро пожаловать в интерфейс пользователя!', 'success');
}

function showListenerInterface() {
    console.log('🎧 Показ интерфейса слушателя');
    hideAllInterfaces();
    document.getElementById('listenerInterface').style.display = 'block';
    
    // Обновляем информацию слушателя
    updateListenerProfileUI();
    
    // Загружаем данные
    updateListenerChatsList();
    updateListenerReviewsData();
    updateListenerStats();
    updateListenerNotifications();
    
    showNotification('🎧 Добро пожаловать в интерфейс слушателя!', 'success');
}

function showAdminPanel() {
    console.log('👑 Показ админ панели');
    hideAllInterfaces();
    document.getElementById('adminPanel').style.display = 'block';
    
    // Обновляем информацию администратора
    updateAdminProfileUI();
    
    // Загружаем данные
    updateAdminData();
    
    showNotification('👑 Добро пожаловать в панель администратора!', 'success');
}

function updateUserProfileUI() {
    if (!currentUser) return;
    
    const elements = [
        { id: 'userDisplayName', value: currentUser.displayName || currentUser.username },
        { id: 'userRole', value: getRoleDisplayName(currentUser.role) },
        { id: 'userAvatar', value: currentUser.avatar || '👤' },
        { id: 'userEmail', value: currentUser.email || 'Не указан' },
        { id: 'userJoinDate', value: new Date(currentUser.createdAt).toLocaleDateString('ru-RU') }
    ];
    
    elements.forEach(element => {
        const el = document.getElementById(element.id);
        if (el) {
            el.textContent = element.value;
        }
    });
}

function updateListenerProfileUI() {
    if (!currentUser) return;
    
    const elements = [
        { id: 'listenerDisplayName', value: currentUser.displayName || currentUser.username },
        { id: 'listenerRole', value: getRoleDisplayName(currentUser.role) },
        { id: 'listenerAvatar', value: currentUser.avatar || '🎧' },
        { id: 'listenerRatingValue', value: (currentUser.rating || 0).toFixed(1) },
        { id: 'listenerRatingCount', value: currentUser.ratingCount || 0 },
        { id: 'listenerEmail', value: currentUser.email || 'Не указан' }
    ];
    
    elements.forEach(element => {
        const el = document.getElementById(element.id);
        if (el) {
            el.textContent = element.value;
        }
    });
}

function updateAdminProfileUI() {
    if (!currentUser) return;
    
    const elements = [
        { id: 'adminDisplayName', value: currentUser.displayName || currentUser.username },
        { id: 'adminRole', value: getRoleDisplayName(currentUser.role) },
        { id: 'adminAvatar', value: currentUser.avatar || '⚙️' },
        { id: 'adminEmail', value: currentUser.email || 'Не указан' }
    ];
    
    elements.forEach(element => {
        const el = document.getElementById(element.id);
        if (el) {
            el.textContent = element.value;
        }
    });
}

// Enter для форм
document.addEventListener('DOMContentLoaded', function() {
    // Enter в форме входа
    document.getElementById('authPassword')?.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') login();
    });

    // Enter в форме регистрации  
    document.getElementById('regPasswordConfirm')?.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') register();
    });
});
