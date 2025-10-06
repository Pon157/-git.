// Глобальные переменные
let socket = null;
let currentUser = null;
let users = [];
let chats = [];
let ratings = [];
let notifications = [];
let systemSettings = {};
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

    // Данные
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

    socket.on('system_settings', (data) => {
        console.log('⚙️ Получены настройки системы');
        systemSettings = data.settings;
        applySystemSettings();
    });

    // Чат
    socket.on('chat_created', (data) => {
        console.log('💬 Чат создан:', data.chat);
        activeChat = data.chat;
        currentListener = data.partner;
        updateChatsUI();
        showNotification(`💬 Чат начат с ${data.partner.displayName}`, 'success');
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

    // Настройки
    socket.on('system_settings_updated', (data) => {
        console.log('⚙️ Настройки системы обновлены');
        systemSettings = data.settings;
        applySystemSettings();
        showNotification('✅ Настройки системы обновлены', 'success');
    });

    socket.on('system_settings_changed', (data) => {
        console.log('⚙️ Настройки системы изменены');
        systemSettings = data.settings;
        applySystemSettings();
    });

    socket.on('settings_update_error', (error) => {
        console.error('❌ Ошибка обновления настроек:', error);
        showNotification(`❌ ${error}`, 'error');
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

// Сброс кнопок авторизации
function resetAuthButtons() {
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
}

// Показ экрана авторизации
function showAuthScreen() {
    hideAllInterfaces();
    document.getElementById('authScreen').style.display = 'flex';
}

// Скрытие всех интерфейсов
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

// Обновление интерфейсов пользователей
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

// Обновление пользователя в списке
function updateUserInList(updatedUser) {
    const index = users.findIndex(u => u.id === updatedUser.id);
    if (index !== -1) {
        users[index] = { ...users[index], ...updatedUser };
    } else {
        users.push(updatedUser);
    }
}

// Применение системных настроек
function applySystemSettings() {
    if (systemSettings.siteTitle) {
        document.title = systemSettings.siteTitle;
        const titleElement = document.getElementById('systemTitle');
        if (titleElement) {
            titleElement.textContent = systemSettings.siteTitle;
        }
    }
    
    if (systemSettings.theme) {
        document.body.setAttribute('data-theme', systemSettings.theme);
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

function showNotification(message, type = 'info') {
    console.log(`📢 Уведомление [${type}]: ${message}`);
    
    // Создаем элемент уведомления
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <span class="notification-message">${message}</span>
            <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
        </div>
    `;
    
    // Добавляем в контейнер
    const container = document.getElementById('notificationsContainer');
    if (container) {
        container.appendChild(notification);
        
        // Автоматическое удаление через 5 секунд
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }
}

// Запуск таймера онлайн времени
function startOnlineTimer() {
    clearInterval(onlineTimer);
    const startTime = new Date();
    
    onlineTimer = setInterval(() => {
        if (!currentUser) return;
        
        const now = new Date();
        const diff = Math.floor((now - startTime) / 1000);
        const hours = Math.floor(diff / 3600);
        const minutes = Math.floor((diff % 3600) / 60);
        const seconds = diff % 60;
        
        const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        // Обновляем время в интерфейсе
        const onlineTimeElement = document.getElementById('onlineTime');
        if (onlineTimeElement) {
            onlineTimeElement.textContent = timeString;
        }
    }, 1000);
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Инициализация приложения...');
    connectToServer();
    
    // Добавляем контейнер для уведомлений если его нет
    if (!document.getElementById('notificationsContainer')) {
        const container = document.createElement('div');
        container.id = 'notificationsContainer';
        container.className = 'notifications-container';
        document.body.appendChild(container);
    }
    
    // Применяем тему из localStorage
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.body.setAttribute('data-theme', savedTheme);
    
    console.log('✅ Приложение инициализировано');
});

// Глобальные функции для HTML
window.forceRefreshData = function() {
    if (socket && socket.connected) {
        socket.emit('force_refresh_data');
        showNotification('🔄 Обновление данных...', 'info');
    }
};

window.logout = function() {
    console.log('🚪 Выход из системы');
    
    if (socket) {
        socket.disconnect();
    }
    
    // Очищаем данные
    localStorage.removeItem('currentUserId');
    localStorage.removeItem('currentUser');
    currentUser = null;
    users = [];
    chats = [];
    ratings = [];
    notifications = [];
    activeChat = null;
    currentListener = null;
    
    // Останавливаем таймеры
    clearInterval(chatTimer);
    clearInterval(onlineTimer);
    
    // Показываем экран авторизации
    hideAllInterfaces();
    document.getElementById('authScreen').style.display = 'flex';
    
    showNotification('👋 До свидания! Возвращайтесь скорее!', 'success');
    
    // Переподключаемся
    setTimeout(() => {
        connectToServer();
    }, 1000);
};
