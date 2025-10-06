// Конфигурация приложения
const CONFIG = {
    SERVER_URL: window.location.hostname === 'localhost' ? 'http://localhost:3000' : 'https://support-chat-hyv4.onrender.com',
    MAX_RETRIES: 5,
    RECONNECTION_DELAY: 2000,
    MESSAGE_TIMEOUT: 10000
};

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
