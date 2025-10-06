// Основной файл приложения - инициализация и обработчики событий
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Инициализация приложения...');
    initializeApp();
});

function initializeApp() {
    setupEventListeners();
    loadUserPreferences();
    connectToServer();
}

function setupEventListeners() {
    console.log('🔧 Настройка обработчиков событий...');
    
    // Табы авторизации
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', function() {
            const tabName = this.getAttribute('data-tab');
            showAuthTab(tabName);
        });
    });

    // Табы пользователя
    document.querySelectorAll('#userInterface .tab').forEach(tab => {
        tab.addEventListener('click', function() {
            const tabName = this.getAttribute('data-tab');
            showUserTab(tabName);
        });
    });

    // Табы слушателя
    document.querySelectorAll('#listenerInterface .tab').forEach(tab => {
        tab.addEventListener('click', function() {
            const tabName = this.getAttribute('data-tab');
            showListenerTab(tabName);
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

    // Навигация в админке
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function() {
            const section = this.getAttribute('data-section');
            showSection(section);
        });
    });

    // Рейтинг
    document.querySelectorAll('.rating-star').forEach(star => {
        star.addEventListener('click', function() {
            selectedRating = parseInt(this.getAttribute('data-rating'));
            updateRatingStars(selectedRating);
        });
    });

    // Обработчики Enter
    const authPassword = document.getElementById('authPassword');
    const userMessageInput = document.getElementById('userMessageInput');
    const listenerMessageInput = document.getElementById('listenerMessageInput');
    const regPasswordConfirm = document.getElementById('regPasswordConfirm');
    
    if (authPassword) {
        authPassword.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                login();
            }
        });
    }
    
    if (userMessageInput) {
        userMessageInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                sendUserMessage();
            }
        });
    }

    if (listenerMessageInput) {
        listenerMessageInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                sendListenerMessage();
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

    console.log('✅ Обработчики событий настроены');
}

function connectToServer() {
    try {
        console.log('🔌 Подключение к серверу:', SERVER_URL);
        
        socket = io(SERVER_URL, {
            transports: ['websocket', 'polling'],
            timeout: 10000,
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000
        });

        socket.on('connect', () => {
            console.log('✅ Успешно подключено к серверу');
            connectionRetries = 0;
            showNotification('✅ Подключено к серверу', 'success');
            
            // Восстанавливаем сессию если есть
            const savedUserId = localStorage.getItem('currentUserId');
            if (savedUserId) {
                console.log('🔄 Восстановление сессии для пользователя:', savedUserId);
                socket.emit('restore_session', { userId: savedUserId });
            }
        });

        socket.on('disconnect', (reason) => {
            console.log('❌ Отключено от сервера:', reason);
            if (reason === 'io server disconnect') {
                // Сервер принудительно отключил, пытаемся переподключиться
                setTimeout(() => {
                    socket.connect();
                }, 1000);
            }
        });

        socket.on('connect_error', (error) => {
            console.error('Ошибка подключения:', error);
            connectionRetries++;
            
            if (connectionRetries <= MAX_RETRIES) {
                console.log(`🔄 Попытка переподключения ${connectionRetries}/${MAX_RETRIES}`);
                setTimeout(() => {
                    socket.connect();
                }, 2000);
            } else {
                showNotification('❌ Не удалось подключиться к серверу. Проверьте интернет-соединение.', 'error');
            }
        });

        socket.on('reconnect', (attemptNumber) => {
            console.log('🔁 Переподключение успешно, попытка:', attemptNumber);
            showNotification('✅ Соединение восстановлено', 'success');
            
            const savedUserId = localStorage.getItem('currentUserId');
            if (savedUserId && currentUser) {
                socket.emit('restore_session', { userId: savedUserId });
            }
        });

        socket.on('reconnect_attempt', (attemptNumber) => {
            console.log('🔄 Попытка переподключения:', attemptNumber);
        });

        socket.on('reconnect_error', (error) => {
            console.error('Ошибка переподключения:', error);
        });

        socket.on('reconnect_failed', () => {
            console.error('❌ Не удалось переподключиться');
            showNotification('❌ Не удалось подключиться к серверу. Пожалуйста, обновите страницу.', 'error');
        });

        // ОСНОВНЫЕ ОБРАБОТЧИКИ СОБЫТИЙ
        socket.on('login_success', (data) => {
            console.log('✅ Успешный вход:', data.user);
            handleLoginSuccess(data.user);
        });

        socket.on('login_error', (error) => {
            console.error('❌ Ошибка входа:', error);
            showNotification('❌ ' + error, 'error');
        });

        socket.on('registration_success', (data) => {
            console.log('✅ Успешная регистрация:', data.user);
            showNotification('✅ Регистрация успешна!', 'success');
            handleLoginSuccess(data.user);
        });

        socket.on('registration_error', (error) => {
            console.error('❌ Ошибка регистрации:', error);
            showNotification('❌ ' + error, 'error');
        });

        socket.on('session_restored', (data) => {
            if (data.user) {
                console.log('🔄 Сессия восстановлена:', data.user);
                handleLoginSuccess(data.user);
            }
        });

        // ДАННЫЕ
        socket.on('users_list', (data) => {
            console.log('📊 Получен список пользователей:', data.users?.length);
            users = data.users || [];
            updateUsersUI();
        });

        socket.on('chats_list', (data) => {
            console.log('💬 Получен список чатов:', data.chats?.length);
            chats = data.chats || [];
            updateChatsUI();
        });

        socket.on('ratings_list', (data) => {
            console.log('⭐ Получен список рейтингов:', data.ratings?.length);
            ratings = data.ratings || [];
            updateRatingsUI();
        });

        socket.on('notifications_list', (data) => {
            console.log('📢 Получен список уведомлений:', data.notifications?.length);
            notifications = data.notifications || [];
            updateNotificationsUI();
        });

        socket.on('new_message', (data) => {
            console.log('📨 Новое сообщение:', data);
            handleNewMessage(data);
        });

        socket.on('chat_created', (data) => {
            console.log('💬 Чат создан:', data.chat);
            const existingChat = chats.find(chat => chat.id === data.chat.id);
            if (!existingChat) {
                chats.push(data.chat);
            }
            activeChat = data.chat;
            updateChatsUI();
            showNotification(`💬 Чат начат с ${data.listenerName}`, 'success');
            
            // Фокусируемся на поле ввода сообщения
            setTimeout(() => {
                const input = document.getElementById('userMessageInput');
                if (input) input.focus();
            }, 100);
        });

        socket.on('user_connected', (data) => {
            console.log('🔗 Пользователь подключился:', data.user);
            const existingIndex = users.findIndex(u => u.id === data.user.id);
            if (existingIndex !== -1) {
                users[existingIndex] = { ...users[existingIndex], ...data.user, isOnline: true };
            } else {
                users.push({ ...data.user, isOnline: true });
            }
            updateUsersUI();
        });

        socket.on('user_disconnected', (data) => {
            console.log('🔌 Пользователь отключился:', data.userId);
            const user = users.find(u => u.id === data.userId);
            if (user) {
                user.isOnline = false;
            }
            updateUsersUI();
        });

        socket.on('user_updated', (data) => {
            console.log('📝 Пользователь обновлен:', data.user);
            const existingIndex = users.findIndex(u => u.id === data.user.id);
            if (existingIndex !== -1) {
                users[existingIndex] = data.user;
            }
            updateUsersUI();
        });

        socket.on('rating_submitted', (data) => {
            console.log('⭐ Рейтинг отправлен:', data);
            showNotification('⭐ Рейтинг отправлен!', 'success');
            const listener = users.find(u => u.id === data.listenerId);
            if (listener) {
                listener.rating = data.newRating;
                listener.ratingCount = data.ratingCount;
            }
            updateUsersUI();
        });

        socket.on('rating_received', (data) => {
            console.log('⭐ Получен новый отзыв:', data);
            updateListenerReviewsData();
        });

        socket.on('staff_added', (data) => {
            console.log('➕ Сотрудник добавлен:', data);
            showNotification('✅ Сотрудник добавлен', 'success');
            socket.emit('get_users');
        });

        socket.on('staff_add_error', (error) => {
            console.error('❌ Ошибка добавления сотрудника:', error);
            showNotification('❌ ' + error, 'error');
        });

        socket.on('role_changed', (data) => {
            console.log('🎭 Роль изменена:', data);
            showNotification(`✅ Роль пользователя изменена на ${getRoleDisplayName(data.newRole)}`, 'success');
            socket.emit('get_users');
        });

        socket.on('chat_ended', (data) => {
            console.log('🚪 Чат завершен:', data.chatId);
            const chat = chats.find(c => c.id === data.chatId);
            if (chat) {
                chat.isActive = false;
            }
            if (activeChat && activeChat.id === data.chatId) {
                endChat();
            }
            updateChatsUI();
        });

        socket.on('profile_updated', (data) => {
            console.log('✅ Профиль обновлен:', data.user);
            currentUser = data.user;
            localStorage.setItem('currentUser', JSON.stringify(data.user));
            updateUserInterface();
            showNotification('✅ Профиль успешно обновлен', 'success');
        });

        socket.on('profile_update_error', (error) => {
            console.error('❌ Ошибка обновления профиля:', error);
            showNotification('❌ ' + error, 'error');
        });

        socket.on('notification_sent', (data) => {
            console.log('📢 Уведомление отправлено:', data);
            showNotification('✅ Техническое уведомление отправлено', 'success');
            socket.emit('get_notifications');
        });

        socket.on('new_notification', (data) => {
            console.log('📢 Новое уведомление:', data);
            notifications.unshift(data.notification);
            updateNotificationsUI();
            showNotification(`📢 Новое уведомление: ${data.notification.title}`, 'info');
        });

        // Запрашиваем данные после подключения
        setTimeout(() => {
            if (socket.connected) {
                socket.emit('get_users');
                socket.emit('get_chats');
                socket.emit('get_ratings');
                socket.emit('get_notifications');
            }
        }, 1000);

    } catch (error) {
        console.error('💥 Критическая ошибка при подключении:', error);
    }
}

function updateUsersUI() {
    if (!currentUser) return;

    if (currentUser.role === 'user') {
        loadListenerCards();
    } else if (currentUser.role === 'listener') {
        updateListenerChatsList();
        updateListenerReviewsData();
        updateListenerStats();
    } else if (currentUser.role === 'admin') {
        updateAdminData();
    }
}

console.log('🎉 Приложение полностью загружено и готово к работе!');
