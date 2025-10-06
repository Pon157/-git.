// Функции авторизации и регистрации
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
    let originalText = '';
    if (loginBtn) {
        originalText = loginBtn.innerHTML;
        loginBtn.innerHTML = '<div class="loading"></div><span>Вход...</span>';
        loginBtn.disabled = true;
    }

    if (socket && socket.connected) {
        console.log('📤 Отправка запроса на вход...');
        socket.emit('login', { username, password });
        
        // Автоматическое восстановление кнопки через 5 секунд на всякий случай
        setTimeout(() => {
            if (loginBtn && loginBtn.innerHTML.includes('loading')) {
                loginBtn.innerHTML = originalText;
                loginBtn.disabled = false;
                showNotification('⚠️ Превышено время ожидания ответа от сервера', 'error');
            }
        }, 5000);
    } else {
        console.error('❌ Сокет не подключен!');
        showNotification('❌ Нет соединения с сервером', 'error');
        // Восстанавливаем кнопку
        if (loginBtn) {
            loginBtn.innerHTML = originalText;
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
    let originalText = '';
    if (registerBtn) {
        originalText = registerBtn.innerHTML;
        registerBtn.innerHTML = '<div class="loading"></div><span>Регистрация...</span>';
        registerBtn.disabled = true;
    }

    if (socket && socket.connected) {
        console.log('📤 Отправка запроса на регистрацию...');
        socket.emit('register', { 
            username, 
            password,
            role: 'user'
        });
        
        // Автоматическое восстановление кнопки через 5 секунд
        setTimeout(() => {
            if (registerBtn && registerBtn.innerHTML.includes('loading')) {
                registerBtn.innerHTML = originalText;
                registerBtn.disabled = false;
                showNotification('⚠️ Превышено время ожидания ответа от сервера', 'error');
            }
        }, 5000);
    } else {
        console.error('❌ Сокет не подключен!');
        showNotification('❌ Нет соединения с сервером', 'error');
        // Восстанавливаем кнопку
        if (registerBtn) {
            registerBtn.innerHTML = originalText;
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
    
    // Восстанавливаем кнопки
    const loginBtn = document.getElementById('loginBtn');
    const registerBtn = document.getElementById('registerBtn');
    if (loginBtn) {
        loginBtn.innerHTML = '<span>🚪 Войти</span>';
        loginBtn.disabled = false;
    }
    if (registerBtn) {
        registerBtn.innerHTML = '<span>📝 Зарегистрироваться</span>';
        registerBtn.disabled = false;
    }
    
    // Запускаем отсчет времени онлайн
    startOnlineTimer();
    
    // Определяем интерфейс по роли
    if (user.role === 'user') {
        showUserInterface();
    } else if (user.role === 'listener') {
        showListenerInterface();
    } else if (user.role === 'admin' || user.role === 'owner') {
        showAdminPanel();
    }
    
    // Принудительный переход для владельца
    setTimeout(forceAdminForOwner, 100);
}

function forceAdminForOwner() {
    if (currentUser && currentUser.role === 'owner') {
        console.log('👑 Принудительный показ админ панели для владельца');
        showAdminPanel();
        
        // Принудительное обновление данных
        setTimeout(() => {
            if (socket && socket.connected) {
                socket.emit('force_refresh_data');
            }
        }, 500);
    }
}

// ФУНКЦИИ ПОКАЗА ИНТЕРФЕЙСОВ
function showUserInterface() {
    console.log('👤 Показ интерфейса пользователя');
    hideAllInterfaces();
    document.getElementById('userInterface').style.display = 'block';
    
    // Обновляем информацию пользователя
    document.getElementById('userDisplayName').textContent = currentUser.displayName || currentUser.username;
    document.getElementById('userRole').textContent = getRoleDisplayName(currentUser.role);
    document.getElementById('userAvatar').textContent = currentUser.avatar || '👤';
    
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
    document.getElementById('listenerDisplayName').textContent = currentUser.displayName || currentUser.username;
    document.getElementById('listenerRole').textContent = getRoleDisplayName(currentUser.role);
    document.getElementById('listenerAvatar').textContent = currentUser.avatar || '🎧';
    document.getElementById('listenerRatingValue').textContent = (currentUser.rating || 0).toFixed(1);
    document.getElementById('listenerRatingCount').textContent = currentUser.ratingCount || 0;
    
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
    document.getElementById('adminDisplayName').textContent = currentUser.displayName || currentUser.username;
    document.getElementById('adminRole').textContent = getRoleDisplayName(currentUser.role);
    
    // Загружаем данные
    updateAdminData();
    
    showNotification('👑 Добро пожаловать в панель администратора!', 'success');
}

function logout() {
    console.log('🚪 Выход из системы');
    if (socket) {
        socket.disconnect();
    }
    localStorage.removeItem('currentUserId');
    localStorage.removeItem('currentUser');
    currentUser = null;
    
    clearInterval(chatTimer);
    clearInterval(onlineTimer);
    
    hideAllInterfaces();
    document.getElementById('authScreen').style.display = 'flex';
    showNotification('👋 До свидания! Возвращайтесь скорее!', 'success');
    
    // Переподключаем сокет для нового входа
    setTimeout(() => {
        connectToServer();
    }, 1000);
}
