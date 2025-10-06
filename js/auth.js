// Модуль аутентификации
const auth = {
    // Инициализация модуля
    init() {
        console.log('🔧 Инициализация модуля аутентификации...');
        this.setupEventListeners();
    },

    // Настройка обработчиков событий
    setupEventListeners() {
        console.log('🔧 Настройка обработчиков аутентификации...');
        
        // Делегирование событий для табов
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('tab')) {
                const tabName = e.target.getAttribute('data-tab');
                this.showAuthTab(tabName);
            }
        });

        // Обработчики для кнопок входа и регистрации
        document.addEventListener('click', (e) => {
            if (e.target.id === 'loginBtn' || e.target.closest('#loginBtn')) {
                e.preventDefault();
                e.stopPropagation();
                console.log('🖱️ Кнопка входа нажата');
                this.login();
            }
            
            if (e.target.id === 'registerBtn' || e.target.closest('#registerBtn')) {
                e.preventDefault();
                e.stopPropagation();
                console.log('🖱️ Кнопка регистрации нажата');
                this.register();
            }
        });

        // Обработчики Enter
        document.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                if (e.target.id === 'authPassword') {
                    e.preventDefault();
                    this.login();
                }
                if (e.target.id === 'regPasswordConfirm') {
                    e.preventDefault();
                    this.register();
                }
            }
        });

        // Кнопки выхода
        document.addEventListener('click', (e) => {
            if (e.target.id === 'userLogoutBtn' || e.target.id === 'listenerLogoutBtn' || e.target.id === 'adminLogoutBtn') {
                this.logout();
            }
        });
    },

    // Показать таб авторизации
    showAuthTab(tabName) {
        console.log('🔀 Переключение на таб:', tabName);
        document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.toggle('active', tab.getAttribute('data-tab') === tabName);
        });

        if (tabName === 'login') {
            document.getElementById('loginForm').classList.remove('hidden');
            document.getElementById('registerForm').classList.add('hidden');
        } else {
            document.getElementById('loginForm').classList.add('hidden');
            document.getElementById('registerForm').classList.remove('hidden');
        }
    },

    // Вход в систему
    login() {
        console.log('=== ВЫЗВАНА ФУНКЦИЯ LOGIN ===');
        
        const usernameInput = document.getElementById('authUsername');
        const passwordInput = document.getElementById('authPassword');
        
        if (!usernameInput || !passwordInput) {
            console.error('❌ Элементы формы входа не найдены!');
            utils.showNotification('❌ Ошибка формы!', 'error');
            return;
        }

        const username = usernameInput.value.trim();
        const password = passwordInput.value.trim();

        console.log('📝 Данные для входа:', { username, password: '***' });

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
        }

        if (socket && socket.connected) {
            console.log('📤 Отправка запроса на вход...');
            socket.emit('login', { username, password });
        } else {
            console.error('❌ Сокет не подключен!');
            utils.showNotification('❌ Нет соединения с сервером', 'error');
            
            // Восстанавливаем кнопку
            if (loginBtn) {
                loginBtn.innerHTML = originalText;
                loginBtn.disabled = false;
            }
        }
    },

    // Регистрация
    register() {
        console.log('=== ВЫЗВАНА ФУНКЦИЯ REGISTER ===');
        
        const usernameInput = document.getElementById('regUsername');
        const passwordInput = document.getElementById('regPassword');
        const passwordConfirmInput = document.getElementById('regPasswordConfirm');
        
        if (!usernameInput || !passwordInput || !passwordConfirmInput) {
            console.error('❌ Элементы формы регистрации не найдены!');
            utils.showNotification('❌ Ошибка формы!', 'error');
            return;
        }

        const username = usernameInput.value.trim();
        const password = passwordInput.value.trim();
        const passwordConfirm = passwordConfirmInput.value.trim();

        console.log('📝 Данные для регистрации:', { username, password: '***' });

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
            utils.showNotification('❌ Нет соединения с сервером', 'error');
            
            // Восстанавливаем кнопку
            if (registerBtn) {
                registerBtn.innerHTML = originalText;
                registerBtn.disabled = false;
            }
        }
    },

    // Обработка успешного входа
    handleLoginSuccess(user) {
        console.log('🎉 Успешный вход, пользователь:', user);
        currentUser = user;
        
        // Сохраняем сессию
        localStorage.setItem('currentUserId', user.id);
        localStorage.setItem('currentUser', JSON.stringify(user));
        
        utils.showNotification(`✅ Добро пожаловать, ${user.displayName || user.username}!`, 'success');
        
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
        console.log('👤 Показ интерфейса пользователя');
        utils.hideAllInterfaces();
        const userInterface = document.getElementById('userInterface');
        if (userInterface) {
            userInterface.style.display = 'block';
        }
        
        utils.updateElementText('userDisplayName', currentUser.displayName || currentUser.username);
        utils.updateElementText('userRole', utils.getRoleDisplayName(currentUser.role));
        utils.updateElementText('userAvatar', currentUser.avatar || '👤');
        
        userSettings.showThemeSettings();
        listeners.loadCards();
        notifications.updateUserNotifications();
    },

    // Показать интерфейс слушателя
    showListenerInterface() {
        console.log('🎧 Показ интерфейса слушателя');
        utils.hideAllInterfaces();
        const listenerInterface = document.getElementById('listenerInterface');
        if (listenerInterface) {
            listenerInterface.style.display = 'block';
        }
        
        utils.updateElementText('listenerDisplayName', currentUser.displayName || currentUser.username);
        utils.updateElementText('listenerRole', utils.getRoleDisplayName(currentUser.role));
        utils.updateElementText('listenerAvatar', currentUser.avatar || '👤');
        utils.updateElementText('listenerRatingValue', (currentUser.rating || 0).toFixed(1));
        utils.updateElementText('listenerRatingCount', currentUser.ratingCount || 0);
        
        listenerSettings.showThemeSettings();
        chat.updateListenerChatsList();
        chat.updateListenerReviewsData();
        chat.updateListenerStats();
        notifications.updateListenerNotifications();
        
        this.startOnlineTimer();
    },

    // Показать админ панель
    showAdminPanel() {
        console.log('👑 Показ админ панели');
        utils.hideAllInterfaces();
        const adminPanel = document.getElementById('adminPanel');
        if (adminPanel) {
            adminPanel.style.display = 'block';
        }
        
        utils.updateElementText('adminDisplayName', currentUser.displayName || currentUser.username);
        utils.updateElementText('adminRole', utils.getRoleDisplayName(currentUser.role));
        
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
        console.log('🚪 Выход из системы');
        if (socket) {
            socket.disconnect();
        }
        localStorage.removeItem('currentUserId');
        localStorage.removeItem('currentUser');
        currentUser = null;
        
        clearInterval(chatTimer);
        clearInterval(onlineTimer);
        
        utils.hideAllInterfaces();
        const authScreen = document.getElementById('authScreen');
        if (authScreen) {
            authScreen.style.display = 'flex';
        }
        utils.showNotification('👋 До свидания! Возвращайтесь скорее!', 'success');
    }
};
