// Функции авторизации и регистрации
function setupAuthEventListeners() {
    console.log('🔧 Настройка обработчиков авторизации...');
    
    // Табы авторизации
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', function() {
            const tabName = this.getAttribute('data-tab');
            showAuthTab(tabName);
        });
    });

    // Кнопки авторизации
    const loginBtn = document.getElementById('loginBtn');
    const registerBtn = document.getElementById('registerBtn');
    
    if (loginBtn) {
        loginBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('🖱️ Кнопка входа нажата');
            login();
        });
    }
    
    if (registerBtn) {
        registerBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('🖱️ Кнопка регистрации нажата');
            register();
        });
    }

    // Обработчики Enter
    const authPassword = document.getElementById('authPassword');
    const regPasswordConfirm = document.getElementById('regPasswordConfirm');
    
    if (authPassword) {
        authPassword.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                login();
            }
        });
    }
    
    if (regPasswordConfirm) {
        regPasswordConfirm.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                register();
            }
        });
    }

    console.log('✅ Обработчики авторизации настроены');
}

function showAuthTab(tabName) {
    console.log('🔀 Переключение на таб:', tabName);
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.toggle('active', tab.getAttribute('data-tab') === tabName);
    });

    document.getElementById('loginForm').classList.toggle('hidden', tabName !== 'login');
    document.getElementById('registerForm').classList.toggle('hidden', tabName !== 'register');
}

function login() {
    console.log('=== ВЫЗВАНА ФУНКЦИЯ LOGIN ===');
    
    const usernameInput = document.getElementById('authUsername');
    const passwordInput = document.getElementById('authPassword');
    
    if (!usernameInput || !passwordInput) {
        console.error('❌ Элементы формы входа не найдены!');
        showNotification('❌ Ошибка формы!', 'error');
        return;
    }

    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();

    console.log('📝 Данные для входа:', { username, password });

    if (!username || !password) {
        showNotification('❌ Заполните все поля!', 'error');
        return;
    }

    // Показываем загрузку
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) {
        const originalText = loginBtn.innerHTML;
        loginBtn.innerHTML = '<div class="loading"></div><span>Вход...</span>';
        loginBtn.disabled = true;
        
        // Авто-восстановление кнопки через 5 секунд
        setTimeout(() => {
            loginBtn.innerHTML = originalText;
            loginBtn.disabled = false;
        }, 5000);
    }

    if (socket && socket.connected) {
        console.log('📤 Отправка запроса на вход...');
        socket.emit('login', { username, password });
    } else {
        console.error('❌ Сокет не подключен!');
        showNotification('❌ Нет соединения с сервером', 'error');
        if (loginBtn) {
            loginBtn.innerHTML = '<span>🚪 Войти</span>';
            loginBtn.disabled = false;
        }
    }
}

function register() {
    console.log('=== ВЫЗВАНА ФУНКЦИЯ REGISTER ===');
    
    const usernameInput = document.getElementById('regUsername');
    const passwordInput = document.getElementById('regPassword');
    const passwordConfirmInput = document.getElementById('regPasswordConfirm');
    
    if (!usernameInput || !passwordInput || !passwordConfirmInput) {
        console.error('❌ Элементы формы регистрации не найдены!');
        showNotification('❌ Ошибка формы!', 'error');
        return;
    }

    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();
    const passwordConfirm = passwordConfirmInput.value.trim();

    console.log('📝 Данные для регистрации:', { username, password });

    if (!username || !password || !passwordConfirm) {
        showNotification('❌ Заполните все поля!', 'error');
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

    // Показываем загрузку
    const registerBtn = document.getElementById('registerBtn');
    if (registerBtn) {
        const originalText = registerBtn.innerHTML;
        registerBtn.innerHTML = '<div class="loading"></div><span>Регистрация...</span>';
        registerBtn.disabled = true;
        
        // Авто-восстановление кнопки через 5 секунд
        setTimeout(() => {
            registerBtn.innerHTML = originalText;
            registerBtn.disabled = false;
        }, 5000);
    }

    if (socket && socket.connected) {
        console.log('📤 Отправка запроса на регистрацию...');
        socket.emit('register', { 
            username, 
            password,
            role: 'user'
        });
    } else {
        console.error('❌ Сокет не подключен!');
        showNotification('❌ Нет соединения с сервером', 'error');
        if (registerBtn) {
            registerBtn.innerHTML = '<span>📝 Зарегистрироваться</span>';
            registerBtn.disabled = false;
        }
    }
}

function handleLoginSuccess(user) {
    console.log('🎉 Успешный вход, пользователь:', user);
    currentUser = user;
    
    // Сохраняем сессию
    localStorage.setItem('currentUserId', user.id);
    localStorage.setItem('currentUser', JSON.stringify(user));
    
    showNotification(`✅ Добро пожаловать, ${user.displayName || user.username}!`, 'success');
    
    // Запускаем отсчет времени онлайн
    startOnlineTimer();
    
    // Определяем интерфейс по роли
    if (user.role === 'user') {
        showUserInterface();
    } else if (user.role === 'listener') {
        showListenerInterface();
    } else if (user.role === 'admin') {
        showAdminPanel();
    }
    
    // Принудительный переход в админку для владельца
    setTimeout(forceAdminForOwner, 100);
}
