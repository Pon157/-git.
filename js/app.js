// Глобальные переменные
let socket = null;
let currentUser = null;
let users = [];
let chats = [];
let ratings = [];
let notifications = [];
let activeChat = null;

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

    // Авторизация
    socket.on('login_success', handleAuthSuccess);
    socket.on('registration_success', handleAuthSuccess);
    socket.on('session_restored', handleAuthSuccess);
    
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
        console.log('Получены пользователи:', data.users.length);
        users = data.users;
        updateInterfaces();
    });

    socket.on('chats_list', (data) => {
        console.log('Получены чаты:', data.chats.length);
        chats = data.chats;
        updateChatsDisplay();
    });

    socket.on('ratings_list', (data) => {
        ratings = data.ratings;
    });

    socket.on('notifications_list', (data) => {
        notifications = data.notifications;
    });

    // Чат
    socket.on('chat_created', (data) => {
        console.log('Чат создан:', data.chat);
        activeChat = data.chat;
        showChatInterface();
        loadChatMessages();
    });

    socket.on('chat_exists', (data) => {
        console.log('Чат уже существует');
        activeChat = data.chat;
        showChatInterface();
        loadChatMessages();
    });

    socket.on('new_message', (data) => {
        console.log('Новое сообщение:', data.message);
        if (activeChat && activeChat.id === data.chatId) {
            if (!activeChat.messages) activeChat.messages = [];
            activeChat.messages.push(data.message);
            displayMessage(data.message);
        }
    });

    // Пользователи
    socket.on('user_connected', (data) => {
        console.log('Пользователь подключился:', data.user.username);
        updateUserInList(data.user);
        updateInterfaces();
    });

    socket.on('user_disconnected', (data) => {
        console.log('Пользователь отключился:', data.userId);
        updateUserInList({ id: data.userId, isOnline: false });
        updateInterfaces();
    });

    // Админка
    socket.on('staff_added', (data) => {
        console.log('Персонал добавлен:', data.user.username);
        showNotification('Персонал добавлен', 'success');
        socket.emit('get_users');
    });

    socket.on('staff_add_error', (error) => {
        showNotification(error, 'error');
    });
}

// Восстановление сессии
function tryRestoreSession() {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        const user = JSON.parse(savedUser);
        console.log('Восстановление сессии:', user.username);
        socket.emit('restore_session', { userId: user.id });
    }
}

// Обработка успешной авторизации
function handleAuthSuccess(data) {
    if (data.error) {
        console.error('Ошибка сессии:', data.error);
        localStorage.removeItem('currentUser');
        return;
    }

    currentUser = data.user;
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    
    console.log('Авторизован:', currentUser.username);
    showNotification(`Добро пожаловать, ${currentUser.displayName}!`, 'success');
    
    resetAuthButtons();
    showUserInterface();
}

// Показать интерфейс пользователя
function showUserInterface() {
    hideAllSections();
    
    if (currentUser.role === 'user') {
        document.getElementById('userInterface').style.display = 'block';
        loadListenerCards();
    } else if (currentUser.role === 'listener') {
        document.getElementById('listenerInterface').style.display = 'block';
        updateListenerChats();
    } else if (currentUser.role === 'admin' || currentUser.role === 'owner') {
        document.getElementById('adminPanel').style.display = 'block';
        loadAdminData();
    }
}

// Скрыть все разделы
function hideAllSections() {
    const sections = [
        'authScreen',
        'userInterface', 
        'listenerInterface',
        'adminPanel'
    ];
    
    sections.forEach(id => {
        const element = document.getElementById(id);
        if (element) element.style.display = 'none';
    });
}

// Обновление интерфейсов
function updateInterfaces() {
    if (!currentUser) return;
    
    if (currentUser.role === 'user') {
        loadListenerCards();
    } else if (currentUser.role === 'listener') {
        updateListenerChats();
    } else if (currentUser.role === 'admin' || currentUser.role === 'owner') {
        loadAdminData();
    }
}

// Загрузка карточек слушателей
function loadListenerCards() {
    const container = document.getElementById('listenerCards');
    if (!container) return;

    const listeners = users.filter(u => u.isOnline && (u.role === 'listener' || u.role === 'admin'));
    
    if (listeners.length === 0) {
        container.innerHTML = '<div class="empty-state">Нет доступных слушателей</div>';
        return;
    }

    container.innerHTML = listeners.map(listener => `
        <div class="listener-card" onclick="startChat('${listener.id}')">
            <div class="listener-avatar">${listener.avatar}</div>
            <div class="listener-info">
                <h3>${listener.displayName}</h3>
                <div class="listener-rating">
                    ★ ${(listener.rating || 0).toFixed(1)} (${listener.ratingCount || 0})
                </div>
                <div class="listener-status online">● Онлайн</div>
            </div>
            <button class="btn" onclick="event.stopPropagation(); startChat('${listener.id}')">
                💬 Чат
            </button>
        </div>
    `).join('');
}

// Начать чат
function startChat(listenerId) {
    console.log('Начало чата с:', listenerId);
    socket.emit('create_chat', { listenerId });
}

// Показать интерфейс чата
function showChatInterface() {
    if (currentUser.role === 'user') {
        document.getElementById('listenersTab').style.display = 'none';
        document.getElementById('userChatSection').style.display = 'block';
    } else if (currentUser.role === 'listener') {
        document.getElementById('listenerChatsTab').style.display = 'none';
        document.getElementById('listenerChatSection').style.display = 'block';
    }
}

// Загрузка сообщений чата
function loadChatMessages() {
    const container = currentUser.role === 'user' 
        ? document.getElementById('userMessagesContainer')
        : document.getElementById('listenerMessagesContainer');
    
    if (!container || !activeChat) return;

    container.innerHTML = '';
    
    if (activeChat.messages && activeChat.messages.length > 0) {
        activeChat.messages.forEach(message => displayMessage(message));
    } else {
        container.innerHTML = '<div class="empty-state">Чат начат</div>';
    }
}

// Отображение сообщения
function displayMessage(message) {
    const container = currentUser.role === 'user' 
        ? document.getElementById('userMessagesContainer')
        : document.getElementById('listenerMessagesContainer');
    
    if (!container) return;

    const isOwn = message.senderId === currentUser.id;
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isOwn ? 'own-message' : 'other-message'}`;
    messageDiv.innerHTML = `
        <div class="message-text">${message.text}</div>
        <div class="message-time">${new Date(message.timestamp).toLocaleTimeString()}</div>
    `;
    
    container.appendChild(messageDiv);
    container.scrollTop = container.scrollHeight;
}

// Отправка сообщения
function sendMessage() {
    const input = currentUser.role === 'user'
        ? document.getElementById('userMessageInput')
        : document.getElementById('listenerMessageInput');
    
    const text = input.value.trim();
    if (!text || !activeChat) return;

    socket.emit('send_message', {
        chatId: activeChat.id,
        message: { text }
    });

    input.value = '';
}

// Админка
function loadAdminData() {
    updateUsersTable();
    updateStaffTable();
    updateAdminChats();
}

function updateUsersTable() {
    const tbody = document.querySelector('#usersTable tbody');
    if (!tbody) return;

    const regularUsers = users.filter(u => u.role === 'user');
    
    tbody.innerHTML = regularUsers.map(user => `
        <tr>
            <td>${user.username}</td>
            <td>${user.displayName}</td>
            <td>${user.email}</td>
            <td>${user.isOnline ? '● Онлайн' : '○ Офлайн'}</td>
            <td>
                <button class="btn btn-small" onclick="promoteToListener('${user.id}')">
                    🎧 Слушатель
                </button>
            </td>
        </tr>
    `).join('');
}

function updateStaffTable() {
    const tbody = document.querySelector('#staffTable tbody');
    if (!tbody) return;

    const staff = users.filter(u => u.role === 'listener' || u.role === 'admin');
    
    tbody.innerHTML = staff.map(staff => `
        <tr>
            <td>${staff.username}</td>
            <td>${staff.displayName}</td>
            <td>${staff.role === 'admin' ? '⚙️ Админ' : '🎧 Слушатель'}</td>
            <td>${staff.isOnline ? '● Онлайн' : '○ Офлайн'}</td>
            <td>★ ${(staff.rating || 0).toFixed(1)}</td>
        </tr>
    `).join('');
}

function updateAdminChats() {
    const container = document.getElementById('adminChatsList');
    if (!container) return;

    container.innerHTML = chats.map(chat => {
        const user1 = users.find(u => u.id === chat.user1);
        const user2 = users.find(u => u.id === chat.user2);
        
        return `
            <div class="chat-item">
                <strong>${user1?.displayName} ↔ ${user2?.displayName}</strong>
                <div>Сообщений: ${chat.messages?.length || 0}</div>
                <div>${chat.isActive ? '● Активен' : '○ Завершен'}</div>
            </div>
        `;
    }).join('');
}

function updateListenerChats() {
    const container = document.getElementById('listenerChatsList');
    if (!container) return;

    const listenerChats = chats.filter(chat => chat.user2 === currentUser.id && chat.isActive);
    
    container.innerHTML = listenerChats.map(chat => {
        const user = users.find(u => u.id === chat.user1);
        return `
            <div class="chat-item" onclick="selectListenerChat('${chat.id}')">
                <strong>${user?.displayName}</strong>
                <div>Сообщений: ${chat.messages?.length || 0}</div>
            </div>
        `;
    }).join('');
}

function selectListenerChat(chatId) {
    activeChat = chats.find(chat => chat.id === chatId);
    showChatInterface();
    loadChatMessages();
}

function updateChatsDisplay() {
    if (currentUser.role === 'listener') {
        updateListenerChats();
    } else if (currentUser.role === 'admin' || currentUser.role === 'owner') {
        updateAdminChats();
    }
}

function updateUserInList(updatedUser) {
    const index = users.findIndex(u => u.id === updatedUser.id);
    if (index !== -1) {
        users[index] = { ...users[index], ...updatedUser };
    }
}

// Утилиты
function showNotification(message, type = 'info') {
    console.log('Уведомление:', message);
    // Простая реализация уведомлений
    alert(`[${type.toUpperCase()}] ${message}`);
}

function resetAuthButtons() {
    const buttons = ['loginBtn', 'registerBtn'];
    buttons.forEach(btnId => {
        const btn = document.getElementById(btnId);
        if (btn) {
            btn.innerHTML = btn.textContent;
            btn.disabled = false;
        }
    });
}

// Глобальные функции
window.logout = function() {
    localStorage.removeItem('currentUser');
    currentUser = null;
    users = [];
    chats = [];
    activeChat = null;
    hideAllSections();
    document.getElementById('authScreen').style.display = 'flex';
    
    if (socket) {
        socket.disconnect();
        socket = null;
    }
    
    setTimeout(initSocket, 100);
};

// Инициализация
document.addEventListener('DOMContentLoaded', function() {
    initSocket();
});
