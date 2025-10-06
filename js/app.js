// Глобальные переменные
let socket = null;
let currentUser = null;
let users = [];
let chats = [];
let ratings = [];
let notifications = [];
let activeChat = null;
let currentListener = null;
let chatStartTime = null;
let chatTimer = null;
let onlineTimer = null;
let messageIds = new Set();

// Подключение к серверу
function connectToServer() {
    console.log('🔄 Подключение к серверу...');
    
    socket = io({
        transports: ['websocket', 'polling'],
        timeout: 10000
    });

    // Обработчики событий
    socket.on('connect', () => {
        console.log('✅ Подключение установлено');
        showNotification('✅ Подключено к серверу', 'success');
        tryRestoreSession();
    });

    socket.on('disconnect', (reason) => {
        console.log('❌ Отключение от сервера:', reason);
        showNotification('❌ Потеряно соединение с сервером', 'error');
    });

    socket.on('connect_error', (error) => {
        console.error('❌ Ошибка подключения:', error);
        showNotification('❌ Ошибка подключения к серверу', 'error');
    });

    // Авторизация
    socket.on('login_success', handleLoginSuccess);
    socket.on('login_error', (error) => {
        console.error('❌ Ошибка входа:', error);
        showNotification(`❌ ${error}`, 'error');
        resetAuthButtons();
    });

    socket.on('registration_success', handleLoginSuccess);
    socket.on('registration_error', (error) => {
        console.error('❌ Ошибка регистрации:', error);
        showNotification(`❌ ${error}`, 'error');
        resetAuthButtons();
    });

    socket.on('session_restored', (data) => {
        if (data.success) {
            handleLoginSuccess(data);
        } else {
            console.log('❌ Сессия не восстановлена');
            localStorage.removeItem('currentUserId');
            localStorage.removeItem('currentUser');
        }
    });

    // Данные - ИСПРАВЛЕНЫ БЕСКОНЕЧНЫЕ ЗАГРУЗКИ
    socket.on('users_list', (data) => {
        console.log('📊 Получен список пользователей:', data.users.length);
        users = data.users;
        updateUserInterfaces();
    });

    socket.on('chats_list', (data) => {
        console.log('💬 Получен список чатов:', data.chats.length);
        chats = data.chats;
        updateChatsUI();
    });

    socket.on('ratings_list', (data) => {
        console.log('⭐ Получены оценки:', data.ratings.length);
        ratings = data.ratings;
        updateRatingsUI();
    });

    socket.on('notifications_list', (data) => {
        console.log('📢 Получены уведомления:', data.notifications.length);
        notifications = data.notifications;
        updateNotificationsUI();
    });

    // Чат
    socket.on('chat_created', (data) => {
        console.log('💬 Чат создан:', data.chat);
        activeChat = data.chat;
        updateChatsUI();
        showNotification(`💬 Чат начат с ${data.listenerName}`, 'success');
    });

    socket.on('chat_exists', (data) => {
        console.log('💬 Чат уже существует');
        activeChat = data.chat;
        updateChatsUI();
        showNotification('💬 Продолжаем существующий чат', 'info');
    });

    socket.on('new_message', handleNewMessage);
    socket.on('chat_ended', (data) => {
        console.log('🔚 Чат завершен:', data.chatId);
        if (activeChat && activeChat.id === data.chatId) {
            endChat();
        }
        updateChatsUI();
    });

    // Пользователи
    socket.on('user_connected', (data) => {
        console.log('👤 Пользователь подключился:', data.user.username);
        updateUserInList(data.user);
        updateUserInterfaces();
    });

    socket.on('user_disconnected', (data) => {
        console.log('👤 Пользователь отключился:', data.userId);
        updateUserInList({ id: data.userId, isOnline: false });
        updateUserInterfaces();
    });

    socket.on('user_updated', (data) => {
        console.log('👤 Данные пользователя обновлены:', data.user.username);
        updateUserInList(data.user);
        updateUserInterfaces();
    });

    // Админка
    socket.on('staff_added', (data) => {
        console.log('➕ Добавлен сотрудник:', data.user.username);
        showNotification(`✅ Добавлен сотрудник: ${data.user.displayName}`, 'success');
        updateUserInterfaces();
    });

    socket.on('staff_add_error', (error) => {
        console.error('❌ Ошибка добавления сотрудника:', error);
        showNotification(`❌ ${error}`, 'error');
    });

    socket.on('role_changed', (data) => {
        console.log('🎭 Роль изменена:', data.userId, data.newRole);
        showNotification(`✅ Роль пользователя изменена на ${getRoleDisplayName(data.newRole)}`, 'success');
        updateUserInterfaces();
    });

    socket.on('role_change_error', (error) => {
        console.error('❌ Ошибка изменения роли:', error);
        showNotification(`❌ ${error}`, 'error');
    });

    // Уведомления
    socket.on('new_notification', (data) => {
        console.log('📢 Новое уведомление:', data.notification.title);
        showNotification(`📢 ${data.notification.title}: ${data.notification.text}`, 'info');
        updateNotificationsUI();
    });

    socket.on('notification_sent', (data) => {
        if (data.success) {
            showNotification('📢 Уведомление отправлено', 'success');
            updateNotificationsUI();
        }
    });

    // Профиль
    socket.on('profile_updated', (data) => {
        console.log('👤 Профиль обновлен');
        currentUser = data.user;
        updateUserProfileUI();
        showNotification('✅ Профиль обновлен', 'success');
    });

    socket.on('profile_update_error', (error) => {
        console.error('❌ Ошибка обновления профиля:', error);
        showNotification(`❌ ${error}`, 'error');
    });

    // Рейтинги
    socket.on('rating_submitted', (data) => {
        console.log('⭐ Оценка отправлена');
        showNotification('⭐ Спасибо за вашу оценку!', 'success');
        updateRatingsUI();
    });

    socket.on('rating_received', (data) => {
        console.log('⭐ Получена новая оценка');
        showNotification(`⭐ Новый отзыв: ${data.rating} звезд`, 'info');
        updateRatingsUI();
    });
}

// Восстановление сессии
function tryRestoreSession() {
    const savedUserId = localStorage.getItem('currentUserId');
    const savedUser = localStorage.getItem('currentUser');
    
    if (savedUserId && savedUser && socket.connected) {
        console.log('🔄 Попытка восстановления сессии...');
        socket.emit('restore_session', { userId: savedUserId });
    } else {
        console.log('🔐 Сессия не найдена, показ экрана авторизации');
        showAuthScreen();
    }
}

function handleLoginSuccess(data) {
    console.log('🎉 Успешная авторизация, пользователь:', data.user);
    currentUser = data.user;
    
    // Сохраняем сессию
    localStorage.setItem('currentUserId', data.user.id);
    localStorage.setItem('currentUser', JSON.stringify(data.user));
    
    showNotification(`✅ Добро пожаловать, ${data.user.displayName || data.user.username}!`, 'success');
    
    resetAuthButtons();
    startOnlineTimer();
    
    // Определяем интерфейс по роли
    if (data.user.role === 'user') {
        showUserInterface();
    } else if (data.user.role === 'listener') {
        showListenerInterface();
    } else if (data.user.role === 'admin' || data.user.role === 'owner') {
        showAdminPanel();
    }
}

function showAuthScreen() {
    hideAllInterfaces();
    document.getElementById('authScreen').style.display = 'flex';
}

function hideAllInterfaces() {
    const interfaces = [
        'authScreen',
        'userInterface', 
        'listenerInterface',
        'adminPanel'
    ];
    
    interfaces.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.style.display = 'none';
        }
    });
}

function updateUserInterfaces() {
    if (!currentUser) return;

    if (currentUser.role === 'user') {
        loadListenerCards();
        updateUserNotifications();
    } else if (currentUser.role === 'listener') {
        updateListenerChatsList();
        updateListenerReviewsData();
        updateListenerStats();
        updateListenerNotifications();
    } else if (currentUser.role === 'admin' || currentUser.role === 'owner') {
        updateAdminData();
    }
}

function updateUserInList(updatedUser) {
    const index = users.findIndex(u => u.id === updatedUser.id);
    if (index !== -1) {
        users[index] = { ...users[index], ...updatedUser };
    } else {
        users.push(updatedUser);
    }
}

// Вспомогательные функции
function getRoleDisplayName(role) {
    const roles = {
        'owner': '👑 Владелец',
        'admin': '⚙️ Администратор', 
        'listener': '🎧 Слушатель',
        'user': '👤 Пользователь'
    };
    return roles[role] || role;
}

function showNotification
