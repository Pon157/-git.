// Модуль аутентификации
const auth = {
    // Показать таб авторизации
    showAuthTab(tabName) {
        console.log('🔀 Переключение на таб:', tabName);
        
        // Обновляем активные табы
        document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.toggle('active', tab.getAttribute('data-tab') === tabName);
        });

        // Показываем/скрываем формы
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
            utils.showNotification('❌ Ошибка формы!', 'error');
            return;
        }

        const username = usernameInput.value.trim();
        const password = passwordInput.value.trim();

        console.log('📝 Данные для входа:', { username, password: password ? '***' : 'empty' });

        if (!username || !password) {
            utils.showNotification('❌ Заполните все поля!', 'error');
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
        } else {
            console.error('❌ Сокет не подключен!');
            utils.showNotification('❌ Нет соединения с сервером', 'error');
            
            // Восстанавливаем кнопку
            if (loginBtn) {
                setTimeout(() => {
                    loginBtn.innerHTML = originalText;
                    loginBtn.disabled = false;
                }, 2000);
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
            utils.showNotification('❌ Ошибка формы!', 'error');
            return;
        }

        const username = usernameInput.value.trim();
        const password = passwordInput.value.trim();
        const passwordConfirm = passwordConfirmInput.value.trim();

        console.log('📝 Данные для регистрации:', { username, password: password ? '***' : 'empty' });

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
        } else {
            console.error('❌ Сокет не подключен!');
            utils.showNotification('❌ Нет соединения с сервером', 'error');
            
            // Восстанавливаем кнопку
            if (registerBtn) {
                setTimeout(() => {
                    registerBtn.innerHTML = originalText;
                    registerBtn.disabled = false;
                }, 2000);
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
        this.restoreAuthButtons();
        
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

    // Восстановить кнопки аутентификации
    restoreAuthButtons() {
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
    },

    // Показать интерфейс пользователя
    showUserInterface() {
        console.log('👤 Показ интерфейса пользователя');
        utils.hideAllInterfaces();
        document.getElementById('userInterface').style.display = 'block';
        
        document.getElementById('userDisplayName').textContent = currentUser.displayName || currentUser.username;
        document.getElementById('userRole').textContent = utils.getRoleDisplayName(currentUser.role);
        document.getElementById('userAvatar').textContent = currentUser.avatar || '👤';
        
        userSettings.showThemeSettings();
        listeners.loadCards();
        notifications.updateUserNotifications();
        
        // Показываем вкладку слушателей по умолчанию
        this.showUserTab('listeners');
    },

    // Показать интерфейс слушателя
    showListenerInterface() {
        console.log('🎧 Показ интерфейса слушателя');
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
        
        // Показываем вкладку чатов по умолчанию
        this.showListenerTab('chats');
        
        this.startOnlineTimer();
    },

    // Показать админ панель
    showAdminPanel() {
        console.log('👑 Показ админ панели');
        utils.hideAllInterfaces();
        document.getElementById('adminPanel').style.display = 'block';
        
        document.getElementById('adminDisplayName').textContent = currentUser.displayName || currentUser.username;
        document.getElementById('adminRole').textContent = utils.getRoleDisplayName(currentUser.role);
        
        admin.updateData();
        adminSettings.showThemeSettings();
        
        // Показываем dashboard по умолчанию
        admin.showSection('dashboard');
    },

    // Показать таб пользователя
    showUserTab(tabName) {
        console.log('👤 Переключение на таб пользователя:', tabName);
        document.querySelectorAll('#userInterface .tab').forEach(tab => {
            tab.classList.toggle('active', tab.getAttribute('data-tab') === tabName);
        });

        document.getElementById('listenersTab').classList.toggle('hidden', tabName !== 'listeners');
        document.getElementById('userNotificationsTab').classList.toggle('hidden', tabName !== 'notifications');
        document.getElementById('userSettings').classList.add('hidden');
        document.getElementById('userChatSection').classList.add('hidden');
    },

    // Показать таб слушателя
    showListenerTab(tabName) {
        console.log('🎧 Переключение на таб слушателя:', tabName);
        document.querySelectorAll('#listenerInterface .tab').forEach(tab => {
            tab.classList.toggle('active', tab.getAttribute('data-tab') === tabName);
        });

        document.getElementById('listenerChatsTab').classList.toggle('hidden', tabName !== 'chats');
        document.getElementById('listenerReviewsTab').classList.toggle('hidden', tabName !== 'reviews');
        document.getElementById('listenerStatsTab').classList.toggle('hidden', tabName !== 'stats');
        document.getElementById('listenerNotificationsTab').classList.toggle('hidden', tabName !== 'notifications');
        document.getElementById('listenerSettings').classList.add('hidden');
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
        document.getElementById('authScreen').style.display = 'flex';
        utils.showNotification('👋 До свидания! Возвращайтесь скорее!', 'success');
    }
};
