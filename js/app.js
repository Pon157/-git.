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
function initSocket() {
    socket = io();

    socket.on('connect', () => {
        console.log('✅ Подключено к серверу');
        showNotification('Подключено к серверу', 'success');
        tryRestoreSession();
    });

    socket.on('disconnect', () => {
        console.log('❌ Отключено от сервера');
        showNotification('Потеряно соединение', 'error');
    });

    socket.on('connect_error', (error) => {
        console.error('❌ Ошибка подключения:', error);
        showNotification('Ошибка подключения к серверу', 'error');
    });

    // Авторизация
    socket.on('login_success', handleAuthSuccess);
    socket.on('registration_success', handleAuthSuccess);
    socket.on('session_restored', (data) => {
        if (data.success) {
            handleAuthSuccess(data);
        } else {
            console.log('❌ Сессия не восстановлена');
            localStorage.removeItem('currentUserId');
            localStorage.removeItem('currentUser');
        }
    });
    
    socket.on('login_error', (error) => {
        console.error('Ошибка входа:', error);
        showNotification(error, 'error');
        resetAuthButtons();
    });
    
    socket.on('registration_error', (error) => {
        console.error('Ошибка регистрации:', error);
        showNotification(error, 'error');
        resetAuthButtons();
    });

    // Данные
    socket.on('users_list', (data) => {
        console.log('📊 Получены пользователи:', data.users.length);
        users = data.users;
        updateInterfaces();
    });

    socket.on('chats_list', (data) => {
        console.log('💬 Получены чаты:', data.chats.length);
        chats = data.chats;
        updateChatsDisplay();
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
        showChatInterface();
        loadChatMessages();
        startChatTimer();
    });

    socket.on('chat_exists', (data) => {
        console.log('💬 Чат уже существует');
        activeChat = data.chat;
        showChatInterface();
        loadChatMessages();
        startChatTimer();
    });

    socket.on('new_message', handleNewMessage);
    
    socket.on('chat_ended', (data) => {
        console.log('🔚 Чат завершен:', data.chatId);
        if (activeChat && activeChat.id === data.chatId) {
            endChat();
        }
        updateChatsDisplay();
    });

    socket.on('message_error', (error) => {
        showNotification(error, 'error');
    });

    socket.on('chat_error', (error) => {
        showNotification(error, 'error');
    });

    // Пользователи
    socket.on('user_connected', (data) => {
        console.log('👤 Пользователь подключился:', data.user.username);
        updateUserInList(data.user);
        updateInterfaces();
    });

    socket.on('user_disconnected', (data) => {
        console.log('👤 Пользователь отключился:', data.userId);
        updateUserInList({ id: data.userId, isOnline: false });
        updateInterfaces();
    });

    socket.on('user_updated', (data) => {
        console.log('👤 Данные пользователя обновлены:', data.user.username);
        updateUserInList(data.user);
        updateInterfaces();
    });

    // Админка
    socket.on('staff_added', (data) => {
        console.log('➕ Персонал добавлен:', data.user.username);
        showNotification('Персонал успешно добавлен', 'success');
        socket.emit('get_users');
    });

    socket.on('staff_add_error', (error) => {
        showNotification(error, 'error');
    });

    socket.on('role_changed', (data) => {
        console.log('🎭 Роль изменена:', data.userId, data.newRole);
        showNotification(`Роль пользователя изменена на ${getRoleDisplayName(data.newRole)}`, 'success');
        socket.emit('get_users');
    });

    socket.on('role_change_error', (error) => {
        showNotification(error, 'error');
    });

    // Уведомления
    socket.on('new_notification', (data) => {
        console.log('📢 Новое уведомление:', data.notification.title);
        showNotification(`${data.notification.title}: ${data.notification.text}`, 'info');
        updateNotificationsUI();
    });

    socket.on('notification_sent', (data) => {
        if (data.success) {
            showNotification('Уведомление отправлено', 'success');
            updateNotificationsUI();
        }
    });

    // Настройки
    socket.on('system_settings_updated', (data) => {
        console.log('⚙️ Настройки системы обновлены');
        systemSettings = data.settings;
        applySystemSettings();
        showNotification('Настройки системы обновлены', 'success');
    });

    socket.on('system_settings_changed', (data) => {
        console.log('⚙️ Настройки системы изменены');
        systemSettings = data.settings;
        applySystemSettings();
    });

    socket.on('settings_update_error', (error) => {
        console.error('❌ Ошибка обновления настроек:', error);
        showNotification(error, 'error');
    });

    // Профиль
    socket.on('profile_updated', (data) => {
        console.log('👤 Профиль обновлен');
        currentUser = data.user;
        updateUserProfileUI();
        showNotification('Профиль обновлен', 'success');
    });

    socket.on('profile_update_error', (error) => {
        console.error('❌ Ошибка обновления профиля:', error);
        showNotification(error, 'error');
    });

    // Рейтинги
    socket.on('rating_submitted', (data) => {
        console.log('⭐ Оценка отправлена');
        showNotification('Спасибо за вашу оценку!', 'success');
        updateRatingsUI();
    });

    socket.on('rating_received', (data) => {
        console.log('⭐ Получена новая оценка');
        showNotification(`Новый отзыв: ${data.rating} звезд`, 'info');
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

// Обработка успешной авторизации
function handleAuthSuccess(data) {
    if (data.error) {
        console.error('Ошибка сессии:', data.error);
        localStorage.removeItem('currentUserId');
        localStorage.removeItem('currentUser');
        return;
    }

    currentUser = data.user;
    localStorage.setItem('currentUserId', currentUser.id);
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    
    if (data.settings) {
        systemSettings = data.settings;
        applySystemSettings();
    }
    
    console.log('🎉 Авторизован:', currentUser.username);
    showNotification(`Добро пожаловать, ${currentUser.displayName || currentUser.username}!`, 'success');
    
    resetAuthButtons();
    showUserInterface();
    startOnlineTimer();
    
    // Принудительный переход для владельца
    if (currentUser.role === 'owner') {
        setTimeout(forceAdminForOwner, 100);
    }
}

function forceAdminForOwner() {
    if (currentUser && currentUser.role === 'owner') {
        console.log('👑 Принудительный показ админ панели для владельца');
        showAdminPanel();
    }
}

// Показать интерфейс пользователя
function showUserInterface() {
    hideAllInterfaces();
    
    if (currentUser.role === 'user') {
        document.getElementById('userInterface').style.display = 'block';
        showUserTab('listeners');
        updateUserProfileUI();
    } else if (currentUser.role === 'listener') {
        document.getElementById('listenerInterface').style.display = 'block';
        showListenerTab('chats');
        updateListenerProfileUI();
    } else if (currentUser.role === 'admin' || currentUser.role === 'owner') {
        document.getElementById('adminPanel').style.display = 'block';
        showAdminSection('dashboard');
        updateAdminProfileUI();
    }
}

// Скрыть все разделы
function hideAllInterfaces() {
    const interfaces = [
        'authScreen',
        'userInterface', 
        'listenerInterface',
        'adminPanel'
    ];
    
    interfaces.forEach(id => {
        const element = document.getElementById(id);
        if (element) element.style.display = 'none';
    });
}

// Обновление интерфейсов
function updateInterfaces() {
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
        // Сохраняем тему в localStorage
        localStorage.setItem('theme', systemSettings.theme);
    }
}

// Утилиты
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
    if (!container) {
        // Создаем контейнер если его нет
        const newContainer = document.createElement('div');
        newContainer.id = 'notificationsContainer';
        newContainer.className = 'notifications-container';
        document.body.appendChild(newContainer);
        container = newContainer;
    }
    
    container.appendChild(notification);
    
    // Автоматическое удаление через 5 секунд
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
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

function resetAuthButtons() {
    const loginBtn = document.getElementById('loginBtn');
    const registerBtn = document.getElementById('registerBtn');
    
    if (loginBtn) {
        loginBtn.innerHTML = '🚪 Войти';
        loginBtn.disabled = false;
    }
    if (registerBtn) {
        registerBtn.innerHTML = '📝 Зарегистрироваться';
        registerBtn.disabled = false;
    }
}

function showAuthScreen() {
    hideAllInterfaces();
    document.getElementById('authScreen').style.display = 'flex';
}

// Глобальные функции
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
        initSocket();
    }, 1000);
};

// Инициализация
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Инициализация приложения...');
    
    // Применяем тему из localStorage
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.body.setAttribute('data-theme', savedTheme);
    
    // Создаем контейнер для уведомлений
    if (!document.getElementById('notificationsContainer')) {
        const container = document.createElement('div');
        container.id = 'notificationsContainer';
        container.className = 'notifications-container';
        document.body.appendChild(container);
    }
    
    initSocket();
    
    console.log('✅ Приложение инициализировано');
});
