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
        console.error('❌ Элемент уведомления не найден!');
        return;
    }
    
    notification.textContent = message;
    notification.className = `notification ${type} show`;
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 4000);
}

function hideAllInterfaces() {
    console.log('🎯 Скрытие всех интерфейсов');
    
    // Скрываем все интерфейсы
    const interfaces = ['userInterface', 'listenerInterface', 'adminPanel'];
    interfaces.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.style.display = 'none';
            element.classList.add('hidden');
        }
    });
    
    // Показываем только авторизацию
    const authScreen = document.getElementById('authScreen');
    if (authScreen) {
        authScreen.style.display = 'flex';
        authScreen.classList.remove('hidden');
    }
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
    showNotification('👋 До свидания! Возвращайтесь скорее!', 'success');
}

function saveUserPreferences(theme, font, fontSize) {
    localStorage.setItem('theme', theme);
    localStorage.setItem('font', font);
    localStorage.setItem('fontSize', fontSize);
}

function loadUserPreferences() {
    const theme = localStorage.getItem('theme') || 'light';
    const font = localStorage.getItem('font') || 'default';
    const fontSize = localStorage.getItem('fontSize') || 'normal';
    
    return { theme, font, fontSize };
}

function updateRatingStars(rating) {
    const stars = document.querySelectorAll('.rating-star');
    stars.forEach((star, index) => {
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

// Функции показа интерфейсов
function showUserInterface() {
    console.log('👤 Показ интерфейса пользователя');
    hideAllInterfaces();
    const userInterface = document.getElementById('userInterface');
    if (userInterface) {
        userInterface.style.display = 'block';
        userInterface.classList.remove('hidden');
    }
    
    updateUserInterface();
    showUserThemeSettings();
    loadListenerCards();
    updateUserNotifications();
}

function showListenerInterface() {
    console.log('🎧 Показ интерфейса слушателя');
    hideAllInterfaces();
    const listenerInterface = document.getElementById('listenerInterface');
    if (listenerInterface) {
        listenerInterface.style.display = 'block';
        listenerInterface.classList.remove('hidden');
    }
    
    updateListenerInterface();
    showListenerThemeSettings();
    updateListenerChatsList();
    updateListenerReviewsData();
    updateListenerStats();
    updateListenerNotifications();
    startOnlineTimer();
}

function showAdminPanel() {
    console.log('👑 Показ админ панели');
    hideAllInterfaces();
    const adminPanel = document.getElementById('adminPanel');
    if (adminPanel) {
        adminPanel.style.display = 'block';
        adminPanel.classList.remove('hidden');
    }
    
    updateAdminInterface();
    updateAdminData();
    showAdminThemeSettings();
}

function updateUserInterface() {
    if (!currentUser) return;
    
    const displayName = document.getElementById('userDisplayName');
    const role = document.getElementById('userRole');
    const avatar = document.getElementById('userAvatar');
    
    if (displayName) displayName.textContent = currentUser.displayName || currentUser.username;
    if (role) role.textContent = getRoleDisplayName(currentUser.role);
    if (avatar) avatar.textContent = currentUser.avatar || '👤';
}

function updateListenerInterface() {
    if (!currentUser) return;
    
    const displayName = document.getElementById('listenerDisplayName');
    const role = document.getElementById('listenerRole');
    const avatar = document.getElementById('listenerAvatar');
    const ratingValue = document.getElementById('listenerRatingValue');
    const ratingCount = document.getElementById('listenerRatingCount');
    
    if (displayName) displayName.textContent = currentUser.displayName || currentUser.username;
    if (role) role.textContent = getRoleDisplayName(currentUser.role);
    if (avatar) avatar.textContent = currentUser.avatar || '👤';
    if (ratingValue) ratingValue.textContent = (currentUser.rating || 0).toFixed(1);
    if (ratingCount) ratingCount.textContent = currentUser.ratingCount || 0;
}

function updateAdminInterface() {
    if (!currentUser) return;
    
    const displayName = document.getElementById('adminDisplayName');
    const role = document.getElementById('adminRole');
    
    if (displayName) displayName.textContent = currentUser.displayName || currentUser.username;
    if (role) role.textContent = getRoleDisplayName(currentUser.role);
}
