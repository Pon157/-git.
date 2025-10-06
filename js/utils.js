// Глобальные переменные
let currentUser = null;
let socket = null;
let users = [];
let chats = [];
let ratings = [];
let notifications = [];
let activeChat = null;
let currentListener = null;
let chatStartTime = null;
let chatTimer = null;
let selectedRating = 0;
let currentSection = 'dashboard';
let onlineTimeStart = null;
let onlineTimer = null;
let messageIds = new Set();

const SERVER_URL = window.location.hostname === 'localhost' ? 'http://localhost:3000' : 'https://your-server-url.com';

// Утилиты
function getRoleDisplayName(role) {
    const roles = {
        'admin': '👑 Администратор',
        'listener': '🎧 Слушатель', 
        'user': '👤 Пользователь'
    };
    return roles[role] || role;
}

function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    if (!notification) {
        // Создаем элемент уведомления если его нет
        const notificationEl = document.createElement('div');
        notificationEl.id = 'notification';
        notificationEl.className = 'notification';
        document.body.appendChild(notificationEl);
    }
    
    const notificationElement = document.getElementById('notification');
    notificationElement.textContent = message;
    notificationElement.className = `notification ${type} show`;
    
    setTimeout(() => {
        notificationElement.classList.remove('show');
    }, 4000);
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
            element.classList.add('hidden');
        }
    });
}

function logout() {
    console.log('🚪 Выход из системы');
    if (socket) {
        socket.disconnect();
    }
    localStorage.removeItem('currentUserId');
    localStorage.removeItem('currentUser');
    currentUser = null;
    
    clearInterval(chatTimer);
    clearInterval(onlineTimer);
    
    hideAllInterfaces();
    const authScreen = document.getElementById('authScreen');
    if (authScreen) {
        authScreen.classList.remove('hidden');
    }
    showNotification('👋 До свидания! Возвращайтесь скорее!', 'success');
}

function saveUserPreferences(theme, font, fontSize) {
    localStorage.setItem('theme', theme);
    localStorage.setItem('font', font);
    localStorage.setItem('fontSize', fontSize);
}

function loadUserPreferences() {
    const theme = localStorage.getItem('theme') || 'sunrise';
    const font = localStorage.getItem('font') || 'default';
    const fontSize = localStorage.getItem('fontSize') || 'normal';
    
    return { theme, font, fontSize };
}

function updateRatingStars(rating) {
    document.querySelectorAll('.rating-star').forEach((star, index) => {
        star.classList.toggle('active', index < rating);
    });
}

function getNotificationTypeDisplay(type) {
    const types = {
        'info': 'ℹ️ Информация',
        'warning': '⚠️ Предупреждение', 
        'error': '🔴 Важное'
    };
    return types[type] || type;
}

function getRecipientsDisplay(recipients) {
    const recipientsMap = {
        'all': '👋 Все пользователи',
        'users': '👤 Только пользователи',
        'listeners': '🎧 Только слушатели',
        'admins': '👑 Администрация'
    };
    return recipientsMap[recipients] || recipients;
}

function startOnlineTimer() {
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
}

function startChatTimer() {
    clearInterval(chatTimer);
    chatTimer = setInterval(() => {
        if (!chatStartTime) return;
        const now = new Date();
        const diff = Math.floor((now - chatStartTime) / 1000);
        const minutes = Math.floor(diff / 60);
        const seconds = diff % 60;
        const durationElement = document.getElementById('chatDuration');
        if (durationElement) {
            durationElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }
    }, 1000);
}

function updateMessageCount() {
    if (activeChat && activeChat.messages) {
        const messageCountElement = document.getElementById('messageCount');
        if (messageCountElement) {
            messageCountElement.textContent = activeChat.messages.length;
        }
    }
}

function forceAdminForOwner() {
    if (currentUser && (currentUser.username === 'owner' || currentUser.role === 'admin')) {
        console.log('🔧 Принудительный переход в админку для:', currentUser.role);
        showAdminPanel();
        return true;
    }
    return false;
}
