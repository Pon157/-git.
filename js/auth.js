// Функции авторизации и регистрации
function showAuthTab(tabName) {
    console.log('Переключение на таб:', tabName);
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
        console.error('Элементы формы входа не найдены!');
        showNotification('Ошибка формы!', 'error');
        return;
    }

    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();

    console.log('Данные для входа:', { username, password });

    if (!username || !password) {
        showNotification('Заполните все поля!', 'error');
        return;
    }

    // Показываем загрузку
    const loginBtn = document.getElementById('loginBtn');
    let originalText = '';
    if (loginBtn) {
        originalText = loginBtn.innerHTML;
        loginBtn.innerHTML = 'Вход...';
        loginBtn.disabled = true;
    }

    if (socket && socket.connected) {
        console.log('Отправка запроса на вход...');
        socket.emit('login', { username, password });
    } else {
        console.error('Сокет не подключен!');
        showNotification('Нет соединения с сервером', 'error');
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
        console.error('Элементы формы регистрации не найдены!');
        showNotification('Ошибка формы!', 'error');
        return;
    }

    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();
    const passwordConfirm = passwordConfirmInput.value.trim();

    console.log('Данные для регистрации:', { username, password });

    if (!username || !password || !passwordConfirm) {
        showNotification('Заполните все поля!', 'error');
        return;
    }

    if (password !== passwordConfirm) {
        showNotification('Пароли не совпадают!', 'error');
        return;
    }

    if (password.length < 6) {
        showNotification('Пароль должен быть не менее 6 символов!', 'error');
        return;
    }

    // Показываем загрузку
    const registerBtn = document.getElementById('registerBtn');
    let originalText = '';
    if (registerBtn) {
        originalText = registerBtn.innerHTML;
        registerBtn.innerHTML = 'Регистрация...';
        registerBtn.disabled = true;
    }

    if (socket && socket.connected) {
        console.log('Отправка запроса на регистрацию...');
        socket.emit('register', { 
            username, 
            password,
            role: 'user'
        });
    } else {
        console.error('Сокет не подключен!');
        showNotification('Нет соединения с сервером', 'error');
        if (registerBtn) {
            registerBtn.innerHTML = originalText;
            registerBtn.disabled = false;
        }
    }
}

// ФУНКЦИИ ПОКАЗА ИНТЕРФЕЙСОВ
function showUserInterface() {
    console.log('Показ интерфейса пользователя');
    hideAllInterfaces();
    document.getElementById('userInterface').style.display = 'block';
    
    // Обновляем информацию пользователя
    document.getElementById('userDisplayName').textContent = currentUser.displayName || currentUser.username;
    document.getElementById('userRole').textContent = getRoleDisplayName(currentUser.role);
    document.getElementById('userAvatar').textContent = currentUser.avatar || '👤';
    
    // Загружаем данные
    loadListenerCards();
    
    showNotification('Добро пожаловать в интерфейс пользователя!', 'success');
}

function showListenerInterface() {
    console.log('Показ интерфейса слушателя');
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
    
    showNotification('Добро пожаловать в интерфейс слушателя!', 'success');
}

function showAdminPanel() {
    console.log('Показ админ панели');
    hideAllInterfaces();
    document.getElementById('adminPanel').style.display = 'block';
    
    // Обновляем информацию администратора
    document.getElementById('adminDisplayName').textContent = currentUser.displayName || currentUser.username;
    document.getElementById('adminRole').textContent = getRoleDisplayName(currentUser.role);
    
    // Загружаем данные
    updateAdminData();
    
    showNotification('Добро пожаловать в панель администратора!', 'success');
}
