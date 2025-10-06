// Основной файл приложения
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Инициализация приложения...');
    
    // Принудительно скрываем все интерфейсы при загрузке
    setTimeout(() => {
        hideAllInterfaces();
    }, 100);
    
    initializeApp();
});

function initializeApp() {
    setupAuthEventListeners();
    setupChatEventListeners();
    setupSettingsEventListeners();
    loadUserPreferences();
    connectToServer();
}

function loadUserPreferences() {
    const { theme, font, fontSize } = loadUserPreferences();
    changeTheme(theme, false);
    changeFont(font, false);
    changeFontSize(fontSize, false);
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
        });

        setupSocketEventListeners();

    } catch (error) {
        console.error('💥 Критическая ошибка при подключении:', error);
        showNotification('❌ Ошибка подключения к серверу', 'error');
    }
}

function setupSocketEventListeners() {
    socket.on('connect', () => {
        console.log('✅ Успешно подключено к серверу');
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
        showNotification('❌ Соединение с сервером потеряно', 'error');
    });

    socket.on('connect_error', (error) => {
        console.error('Ошибка подключения:', error);
        showNotification('❌ Ошибка подключения к серверу', 'error');
    });

    socket.on('reconnect', (attemptNumber) => {
        console.log('🔁 Переподключение успешно, попытка:', attemptNumber);
        showNotification('✅ Соединение восстановлено', 'success');
    });

    // Обработчики авторизации
    socket.on('login_success', (data) => {
        console.log('✅ Успешный вход:', data.user);
        handleLoginSuccess(data.user);
    });

    socket.on('login_error', (error) => {
        console.error('❌ Ошибка входа:', error);
        showNotification('❌ ' + error, 'error');
        const loginBtn = document.getElementById('loginBtn');
        if (loginBtn) {
            loginBtn.innerHTML = '<span>🚪 Войти</span>';
            loginBtn.disabled = false;
        }
    });

    socket.on('registration_success', (data) => {
        console.log('✅ Успешная регистрация:', data.user);
        showNotification('✅ Регистрация успешна!', 'success');
        handleLoginSuccess(data.user);
    });

    socket.on('registration_error', (error) => {
        console.error('❌ Ошибка регистрации:', error);
        showNotification('❌ ' + error, 'error');
        const registerBtn = document.getElementById('registerBtn');
        if (registerBtn) {
            registerBtn.innerHTML = '<span>📝 Зарегистрироваться</span>';
            registerBtn.disabled = false;
        }
    });

    socket.on('session_restored', (data) => {
        if (data.user) {
            console.log('🔄 Сессия восстановлена:', data.user);
            handleLoginSuccess(data.user);
        }
    });

    // Обработчики данных
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

    // Обработчики чата
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
        if (socket && socket.connected) {
            socket.emit('get_users');
            socket.emit('get_chats');
            socket.emit('get_ratings');
            socket.emit('get_notifications');
        }
    }, 1000);
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

function updateChatsUI() {
    if (currentUser) {
        if (currentUser.role === 'user' && activeChat) {
            const updatedChat = chats.find(c => c.id === activeChat.id);
            if (updatedChat) {
                activeChat = updatedChat;
                loadUserChatMessages();
            }
        } else if (currentUser.role === 'listener') {
            updateListenerChatsList();
            if (activeChat) {
                const updatedChat = chats.find(c => c.id === activeChat.id);
                if (updatedChat) {
                    activeChat = updatedChat;
                    loadListenerChatMessages();
                }
            }
        } else if (currentUser.role === 'admin') {
            updateAdminChatsList();
        }
    }
}

function updateRatingsUI() {
    if (currentUser && currentUser.role === 'listener') {
        updateListenerReviewsData();
    }
}

console.log('🎉 Приложение полностью загружено и готово к работе!');
