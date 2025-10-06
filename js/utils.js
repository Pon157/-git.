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

const SERVER_URL = window.location.hostname === 'localhost' ? 'http://localhost:3000' : 'https://support-chat-hyv4.onrender.com';

// Утилитарные функции
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
    notification.textContent = message;
    notification.className = `notification ${type} show`;
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 4000);
}

function hideAllInterfaces() {
    document.getElementById('authScreen').style.display = 'none';
    document.getElementById('userInterface').style.display = 'none';
    document.getElementById('listenerInterface').style.display = 'none';
    document.getElementById('adminPanel').style.display = 'none';
}

function forceAdminForOwner() {
    if (currentUser && (currentUser.role === 'owner' || currentUser.role === 'admin')) {
        console.log('🔧 Принудительный переход в админку для:', currentUser.role);
        showAdminPanel();
        return true;
    }
    return false;
}
