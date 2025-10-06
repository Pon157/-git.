// Модуль аутентификации
const auth = {
    // Инициализация модуля
    init() {
        this.setupEventListeners();
    },

    // Настройка обработчиков событий
    setupEventListeners() {
        // Табы авторизации
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', function() {
                const tabName = this.getAttribute('data-tab');
                auth.showAuthTab(tabName);
            });
        });

        // Кнопки авторизации
        const loginBtn = document.getElementById('loginBtn');
        const registerBtn = document.getElementById('registerBtn');
        
        if (loginBtn) {
            loginBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                auth.login();
            });
        }
        
        if (registerBtn) {
            registerBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                auth.register();
            });
        }

        // Обработчики Enter
        const authPassword = document.getElementById('authPassword');
        const regPasswordConfirm = document.getElementById('regPasswordConfirm');
        
        if (authPassword) {
            authPassword.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    auth.login();
                }
            });
        }

        if (regPasswordConfirm) {
            regPasswordConfirm.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    auth.register();
                }
            });
        }
    },

    // Показать таб авторизации
    showAuthTab(tabName) {
        document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.toggle('active', tab.getAttribute('data-tab') === tabName);
        });

        document.getElementById('loginForm').classList.toggle('hidden', tabName !== 'login');
        document.getElementById('registerForm').classList.toggle('hidden', tabName !== 'register');
    },

    // Вход в систему
    login() {
        const usernameInput = document.getElementById('authUsername');
        const passwordInput = document.getElementById('authPassword');
        
        if (!usernameInput || !passwordInput) {
            utils.showNotification('❌ Ошибка формы!', 'error');
            return;
        }

        const username = usernameInput.value.trim();
        const password = passwordInput.value.trim();

        if (!username || !password) {
            utils.showNotification('❌ Заполните все поля!', 'error');
            return;
        }

        // Показываем загрузку
        const loginBtn = document.getElementById('loginBtn');
        if (loginBtn) {
            const originalText = loginBtn.innerHTML;
            loginBtn.innerHTML = '<div class="loading"></div><span>Вход...</span>';
            loginBtn.disabled = true;
            
            setTimeout(() => {
                loginBtn.innerHTML = originalText;
                loginBtn.disabled = false;
            }, 3000);
        }

        if (socket && socket.connected) {
            socket.emit('login', { username, password });
        } else {
            utils.showNotification('❌ Нет соединения с сервером', 'error');
        }
    },

    // Регистрация
    register() {
        const usernameInput = document.getElementById('regUsername');
        const passwordInput = document.getElementById('regPassword');
        const passwordConfirmInput = document.getElementById('regPasswordConfirm');
        
        if (!usernameInput || !passwordInput || !passwordConfirmInput) {
            utils.showNotification('❌ Ошибка формы!', 'error');
            return;
        }

        const username = usernameInput.value.trim();
        const password = passwordInput.value.trim();
        const passwordConfirm = passwordConfirmInput.value.trim();

        if (!username || !password || !passwordConfirm) {
            utils.showNotification('❌ Заполните все поля!', 'error');
            return;
        }

        if (password !== passwordConfirm) {
            utils.showNotification('❌ Пароли не совпадают!', 'error');
            return;
        }

        if (password.length < 6) {
            utils.showNotification('❌ Пароль должен быть не менее 6 символов!', 'error');
            return;
        }

        // Показываем загрузку
        const registerBtn = document.getElementById('registerBtn');
        if (registerBtn) {
            const originalText = registerBtn.innerHTML;
            registerBtn.innerHTML = '<div class="loading"></div><span>Регистрация...</span>';
            registerBtn.disabled = true;
            
            setTimeout(() => {
                registerBtn.innerHTML = originalText;
                registerBtn.disabled = false;
            }, 3000);
        }

        if (socket && socket.connected) {
            socket.emit('register', { 
                username, 
                password,
                role: 'user'
            });
        } else {
            utils.showNotification('❌ Нет соединения с сервером', 'error');
        }
    },

    // Обработка успешного входа
    handleLoginSuccess(user) {
        currentUser = user;
        
        // Сохраняем сессию
        localStorage.setItem('currentUserId', user.id);
        localStorage.setItem('currentUser', JSON.stringify(user));
        
        utils.showNotification(`✅ Добро пожаловать, ${user.displayName || user.username}!`, 'success');
        
        // Запускаем отсчет времени онлайн
        this.startOnlineTimer();
        
        // Определяем интерфейс по роли
        if (user.role === 'user') {
            this.showUserInterface();
        } else if (user.role === 'listener') {
            this.showListenerInterface();
        } else if (user.role === 'admin') {
            this.showAdminPanel();
        }
    },

    // Показать интерфейс пользователя
    showUserInterface() {
        utils.hideAllInterfaces();
        document.getElementById('userInterface').style.display = 'block';
        
        document.getElementById('userDisplayName').textContent = currentUser.displayName || currentUser.username;
        document.getElementById('userRole').textContent = utils.getRoleDisplayName(currentUser.role);
        document.getElementById('userAvatar').textContent = currentUser.avatar || '👤';
        
        userSettings.showThemeSettings();
        listeners.loadCards();
        notifications.updateUserNotifications();
    },

    // Показать интерфейс слушателя
    showListenerInterface() {
        utils.hideAllInterfaces();
        document.getElementById('listenerInterface').style.display = 'block';
        
        document.getElementById('listenerDisplayName').textContent = currentUser.displayName || currentUser.username;
        document.getElementById('listenerRole').textContent = utils.getRoleDisplayName(currentUser.role);
        document.getElementById('listenerAvatar').textContent = currentUser.avatar || '👤';
        document.getElementById('listenerRatingValue').textContent = (currentUser.rating || 0).toFixed(1);
        document.getElementById('listenerRatingCount').textContent = currentUser.ratingCount || 0;
        
        listenerSettings.showThemeSettings();
        chat.updateListenerChatsList();
        chat.updateListenerReviewsData();
        chat.updateListenerStats();
        notifications.updateListenerNotifications();
        
        this.startOnlineTimer();
    },

    // Показать админ панель
    showAdminPanel() {
        utils.hideAllInterfaces();
        document.getElementById('adminPanel').style.display = 'block';
        
        document.getElementById('adminDisplayName').textContent = currentUser.displayName || currentUser.username;
        document.getElementById('adminRole').textContent = utils.getRoleDisplayName(currentUser.role);
        
        admin.updateData();
        adminSettings.showThemeSettings();
    },

    // Запуск таймера онлайн времени
    startOnlineTimer() {
        onlineTimeStart = new Date();
        clearInterval(onlineTimer);
        onlineTimer = setInterval(() => {
            if (onlineTimeStart) {
                const now = new Date();
                const diff = Math.floor((now - onlineTimeStart) / 1000 / 60 / 60);
                const onlineTimeElement = document.getElementById('listenerOnlineTime');
                if (onlineTimeElement) {
                    onlineTimeElement.textContent = diff + 'ч';
                }
            }
        }, 60000);
    },

    // Выход из системы
    logout() {
        if (socket) {
            socket.disconnect();
        }
        localStorage.removeItem('currentUserId');
        localStorage.removeItem('currentUser');
        currentUser = null;
        
        clearInterval(chatTimer);
        clearInterval(onlineTimer);
        
        utils.hideAllInterfaces();
        document.getElementById('authScreen').style.display = 'flex';
        utils.showNotification('👋 До свидания! Возвращайтесь скорее!', 'success');
    }
};
