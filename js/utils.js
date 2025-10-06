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
let connectionRetries = 0;
const MAX_RETRIES = 5;

// Используем тот же URL что и сервер
const SERVER_URL = window.location.origin;

// Утилитарные функции
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

function forceAdminForOwner() {
    if (currentUser && (currentUser.role === 'owner' || currentUser.role === 'admin')) {
        console.log('🔧 Принудительный переход в админку для:', currentUser.role);
        showAdminPanel();
        return true;
    }
    return false;
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
