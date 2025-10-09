const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const multer = require('multer');

const app = express();
const server = http.createServer(app);

// Настройки для Render.com
const PORT = process.env.PORT || 3000;

// Улучшенные настройки CORS
app.use(cors({
    origin: function(origin, callback) {
        const allowedOrigins = [
            'https://support-chat-hyv4.onrender.com',
            'http://localhost:3000',
            'http://127.0.0.1:3000',
            undefined
        ];
        
        if (process.env.NODE_ENV === 'development' || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Статические файлы
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Настройка multer для загрузки файлов
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB
    },
    fileFilter: function (req, file, cb) {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'video/mov', 'video/avi'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type'));
        }
    }
});

// Улучшенные настройки Socket.IO
const io = socketIo(server, {
    cors: {
        origin: function(origin, callback) {
            const allowedOrigins = [
                'https://support-chat-hyv4.onrender.com',
                'http://localhost:3000',
                'http://127.0.0.1:3000',
                undefined
            ];
            
            if (process.env.NODE_ENV === 'development' || allowedOrigins.indexOf(origin) !== -1) {
                callback(null, true);
            } else {
                callback(new Error('Not allowed by CORS'));
            }
        },
        methods: ["GET", "POST"],
        credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000,
    transports: ['websocket', 'polling'],
    allowEIO3: true
});

// Файлы для хранения данных
const DATA_DIR = './permanent_data';
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const CHATS_FILE = path.join(DATA_DIR, 'chats.json');
const RATINGS_FILE = path.join(DATA_DIR, 'ratings.json');
const NOTIFICATIONS_FILE = path.join(DATA_DIR, 'notifications.json');
const MODERATION_FILE = path.join(DATA_DIR, 'moderation.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');
const SYSTEM_LOGS_FILE = path.join(DATA_DIR, 'system_logs.json');

// Создание директории данных если её нет
function ensureDataDirectory() {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
        console.log(`✅ Создана директория данных: ${DATA_DIR}`);
    }
}

// Создание файлов если их нет
function initializeFiles() {
    ensureDataDirectory();
    
    const files = [
        { name: USERS_FILE, default: [] },
        { name: CHATS_FILE, default: [] },
        { name: RATINGS_FILE, default: [] },
        { name: NOTIFICATIONS_FILE, default: [] },
        { name: MODERATION_FILE, default: [] },
        { name: SYSTEM_LOGS_FILE, default: [] },
        { name: SETTINGS_FILE, default: {
            fileUploads: true,
            maxFileSize: 10,
            allowedFileTypes: ['jpg', 'jpeg', 'png', 'gif', 'mp4', 'mov', 'avi'],
            stickers: ['😊', '😂', '😍', '😎', '😢', '😡', '🤔', '🎉', '❤️', '🔥', '👍', '👎'],
            systemName: 'Чат-система',
            welcomeMessage: 'Добро пожаловать в чат!',
            maxChatDuration: 60,
            autoEndChat: true
        }}
    ];

    files.forEach(file => {
        if (!fs.existsSync(file.name)) {
            fs.writeFileSync(file.name, JSON.stringify(file.default, null, 2));
            console.log(`✅ Создан файл: ${file.name}`);
        }
    });
}

// Загрузка данных из файлов
function loadData(filename, defaultValue = []) {
    try {
        if (fs.existsSync(filename)) {
            const data = fs.readFileSync(filename, 'utf8');
            return data ? JSON.parse(data) : defaultValue;
        }
    } catch (error) {
        console.error(`❌ Ошибка загрузки ${filename}:`, error);
    }
    return defaultValue;
}

// Сохранение данных в файлы
function saveData(filename, data) {
    try {
        fs.writeFileSync(filename, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error(`❌ Ошибка сохранения ${filename}:`, error);
        return false;
    }
}

// Загрузка данных
function getUsers() {
    return loadData(USERS_FILE, []);
}

function getChats() {
    return loadData(CHATS_FILE, []);
}

function getRatings() {
    return loadData(RATINGS_FILE, []);
}

function getNotifications() {
    return loadData(NOTIFICATIONS_FILE, []);
}

function getModerationHistory() {
    return loadData(MODERATION_FILE, []);
}

function getSettings() {
    return loadData(SETTINGS_FILE, {});
}

function getSystemLogs() {
    return loadData(SYSTEM_LOGS_FILE, []);
}

// Сохранение данных
function saveUsers(users) {
    return saveData(USERS_FILE, users);
}

function saveChats(chats) {
    return saveData(CHATS_FILE, chats);
}

function saveRatings(ratings) {
    return saveData(RATINGS_FILE, ratings);
}

function saveNotifications(notifications) {
    return saveData(NOTIFICATIONS_FILE, notifications);
}

function saveModerationHistory(history) {
    return saveData(MODERATION_FILE, history);
}

function saveSettings(settings) {
    return saveData(SETTINGS_FILE, settings);
}

function saveSystemLogs(logs) {
    return saveData(SYSTEM_LOGS_FILE, logs);
}

// Функция для логирования действий системы
function addSystemLog(action, userId, details = {}) {
    const logs = getSystemLogs();
    const log = {
        id: generateId(),
        action,
        userId,
        timestamp: new Date().toISOString(),
        details
    };
    logs.push(log);
    saveSystemLogs(logs);
    return log;
}

// 🔄 ФУНКЦИИ СИНХРОНИЗАЦИИ
function broadcastToAll(event, data) {
    io.emit(event, data);
}

function broadcastToAdmins(event, data) {
    const users = getUsers();
    const admins = users.filter(u => (u.role === 'admin' || u.role === 'owner') && u.socketId);
    
    admins.forEach(admin => {
        const socket = io.sockets.sockets.get(admin.socketId);
        if (socket) {
            socket.emit(event, data);
        }
    });
}

function broadcastToRole(role, event, data) {
    const users = getUsers();
    const targetUsers = users.filter(u => u.role === role && u.socketId);
    
    targetUsers.forEach(user => {
        const socket = io.sockets.sockets.get(user.socketId);
        if (socket) {
            socket.emit(event, data);
        }
    });
}

function syncUsers() {
    const users = getUsers();
    const publicUsers = users.map(user => {
        const { password, socketId, ...publicUser } = user;
        return publicUser;
    });
    broadcastToAll('users_list', { users: publicUsers });
}

function syncChats() {
    const chats = getChats();
    broadcastToAll('chats_list', { chats });
}

function syncRatings() {
    const ratings = getRatings();
    broadcastToAll('ratings_list', { ratings });
}

function syncNotifications() {
    const notifications = getNotifications();
    broadcastToAll('notifications_list', { notifications });
}

function syncModerationHistory() {
    const history = getModerationHistory();
    broadcastToAll('moderation_history', { history });
}

// Создание владельца и демо-пользователей
function initializeUsers() {
    let users = getUsers();
    
    const defaultUsers = [
        {
            id: 'owner-001',
            username: 'owner',
            password: 'owner2024',
            role: 'owner',
            displayName: 'Владелец Системы',
            avatar: '👑',
            rating: 5.0,
            ratingCount: 0,
            isOnline: false,
            socketId: null,
            createdAt: new Date().toISOString(),
            lastSeen: new Date().toISOString(),
            isPermanent: true,
            permissions: ['all']
        },
        {
            id: 'admin-001',
            username: 'admin',
            password: 'admin123',
            role: 'admin',
            displayName: 'Главный Администратор',
            avatar: '⚙️',
            rating: 5.0,
            ratingCount: 0,
            isOnline: false,
            socketId: null,
            createdAt: new Date().toISOString(),
            lastSeen: new Date().toISOString(),
            isPermanent: true
        },
        {
            id: 'user-001',
            username: 'user',
            password: '123456',
            role: 'user',
            displayName: 'Тестовый Пользователь',
            avatar: '👤',
            rating: 0,
            ratingCount: 0,
            isOnline: false,
            socketId: null,
            createdAt: new Date().toISOString(),
            lastSeen: new Date().toISOString()
        },
        {
            id: 'listener-001',
            username: 'listener',
            password: '123456',
            role: 'listener',
            displayName: 'Анна Слушатель',
            avatar: '🎧',
            rating: 4.8,
            ratingCount: 15,
            isOnline: false,
            socketId: null,
            createdAt: new Date().toISOString(),
            lastSeen: new Date().toISOString()
        }
    ];

    let hasChanges = false;
    
    defaultUsers.forEach(defaultUser => {
        const exists = users.find(u => u.username === defaultUser.username);
        if (!exists) {
            users.push(defaultUser);
            hasChanges = true;
            console.log(`✅ Добавлен пользователь: ${defaultUser.username}`);
        }
    });

    if (hasChanges) {
        saveUsers(users);
    }
}

// Инициализация
console.log('🔄 Инициализация системы...');
initializeFiles();
initializeUsers();

// Генерация ID
function generateId() {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

// Получение пользователя по socketId
function getUserBySocketId(socketId) {
    const users = getUsers();
    return users.find(u => u.socketId === socketId);
}

// Получение пользователя по ID
function getUserById(userId) {
    const users = getUsers();
    return users.find(u => u.id === userId);
}

// Обновление пользователя
function updateUser(userId, updates) {
    const users = getUsers();
    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex !== -1) {
        users[userIndex] = { ...users[userIndex], ...updates };
        saveUsers(users);
        return users[userIndex];
    }
    return null;
}

// Функция для очистки старых файлов
function cleanupOldFiles() {
    const uploadsDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadsDir)) return;

    const files = fs.readdirSync(uploadsDir);
    const now = Date.now();
    const twelveHours = 12 * 60 * 60 * 1000;

    files.forEach(file => {
        const filePath = path.join(uploadsDir, file);
        const stats = fs.statSync(filePath);
        
        if (now - stats.mtimeMs > twelveHours) {
            fs.unlinkSync(filePath);
            console.log(`🗑️ Удален старый файл: ${file}`);
        }
    });
}

// Запускаем очистку каждые 6 часов
setInterval(cleanupOldFiles, 6 * 60 * 60 * 1000);

// 🔄 ОСНОВНЫЕ ОБРАБОТЧИКИ SOCKET.IO
io.on('connection', (socket) => {
    console.log(`🔗 Новое подключение: ${socket.id}`);

    // Отправка начальных данных новому клиенту
    const initialUsers = getUsers();
    const initialChats = getChats();
    const initialRatings = getRatings();
    const initialNotifications = getNotifications();
    const initialModerationHistory = getModerationHistory();
    const initialSettings = getSettings();

    const publicUsers = initialUsers.map(user => {
        const { password, socketId, ...publicUser } = user;
        return publicUser;
    });

    socket.emit('users_list', { users: publicUsers });
    socket.emit('chats_list', { chats: initialChats });
    socket.emit('ratings_list', { ratings: initialRatings });
    socket.emit('notifications_list', { notifications: initialNotifications });
    socket.emit('moderation_history', { history: initialModerationHistory });
    socket.emit('settings_updated', { settings: initialSettings });

    // ВОССТАНОВЛЕНИЕ СЕССИИ
    socket.on('restore_session', (data) => {
        console.log(`🔄 Попытка восстановления сессии:`, data);
        
        const user = getUserById(data.userId);
        
        if (user) {
            updateUser(user.id, {
                isOnline: true,
                socketId: socket.id,
                lastSeen: new Date().toISOString()
            });
            
            socket.emit('session_restored', { 
                success: true,
                user: user 
            });
            
            socket.broadcast.emit('user_connected', { user });
            syncUsers();
            
            console.log(`🔄 Сессия восстановлена: ${user.username}`);
        } else {
            socket.emit('session_restored', { 
                success: false,
                error: 'Пользователь не найден'
            });
        }
    });

    // ВХОД
    socket.on('login', (data) => {
        console.log(`🚪 Запрос на вход:`, data);
        
        const users = getUsers();
        const { username, password } = data;
        
        if (!username || !password) {
            socket.emit('login_error', 'Логин и пароль обязательны');
            return;
        }
        
        const user = users.find(u => u.username === username && u.password === password);
        if (!user) {
            socket.emit('login_error', 'Неверный логин или пароль');
            return;
        }

        if (user.isBlocked) {
            socket.emit('login_error', 'Аккаунт заблокирован');
            return;
        }

        updateUser(user.id, {
            isOnline: true,
            socketId: socket.id,
            lastSeen: new Date().toISOString()
        });

        socket.emit('login_success', { user });
        socket.broadcast.emit('user_connected', { user });
        syncUsers();
        
        addSystemLog('user_login', user.id, { username: user.username });
        
        console.log(`✅ Успешный вход: ${username}`);
    });

    // РЕГИСТРАЦИЯ
    socket.on('register', (data) => {
        console.log(`📝 Запрос на регистрацию:`, data);
        
        const users = getUsers();
        const { username, password, role = 'user', displayName } = data;
        
        if (!username || !password) {
            socket.emit('registration_error', 'Логин и пароль обязательны');
            return;
        }

        if (password.length < 6) {
            socket.emit('registration_error', 'Пароль должен быть не менее 6 символов');
            return;
        }

        const existingUser = users.find(u => u.username === username);
        if (existingUser) {
            socket.emit('registration_error', 'Пользователь с таким логином уже существует');
            return;
        }

        const newUser = {
            id: generateId(),
            username,
            password,
            role: role || 'user',
            displayName: displayName || username,
            avatar: '👤',
            rating: 0,
            ratingCount: 0,
            isOnline: true,
            socketId: socket.id,
            createdAt: new Date().toISOString(),
            lastSeen: new Date().toISOString()
        };

        users.push(newUser);
        const saved = saveUsers(users);
        
        if (saved) {
            socket.emit('registration_success', { user: newUser });
            socket.broadcast.emit('user_connected', { user: newUser });
            broadcastToAdmins('new_user_registered', { user: newUser });
            syncUsers();
            
            addSystemLog('user_registered', newUser.id, { username: newUser.username });
            
            console.log(`✅ Новый пользователь: ${username}`);
        } else {
            socket.emit('registration_error', 'Ошибка сохранения пользователя');
        }
    });

    // 🔄 ОБНОВЛЕНИЕ ПРОФИЛЯ
    socket.on('update_profile', (data) => {
        console.log(`📝 Обновление профиля:`, data);
        
        const { userId, displayName, avatar, password } = data;
        const user = getUserById(userId);
        
        if (!user) {
            socket.emit('profile_update_error', 'Пользователь не найден');
            return;
        }

        const updates = {};
        if (displayName) updates.displayName = displayName;
        if (avatar) updates.avatar = avatar;
        if (password) {
            if (password.length < 6) {
                socket.emit('profile_update_error', 'Пароль должен быть не менее 6 символов');
                return;
            }
            updates.password = password;
        }

        const updatedUser = updateUser(userId, updates);
        
        if (updatedUser) {
            socket.emit('profile_updated', { user: updatedUser });
            socket.broadcast.emit('user_updated', { user: updatedUser });
            syncUsers();
            
            addSystemLog('profile_updated', user.id);
        } else {
            socket.emit('profile_update_error', 'Ошибка обновления профиля');
        }
    });

    // 🔄 ДОБАВЛЕНИЕ СОТРУДНИКА
    socket.on('register_staff', (data) => {
        console.log(`➕ Добавление сотрудника:`, data);
        
        const users = getUsers();
        const { username, password, displayName, role } = data;

        if (!username || !password || !displayName) {
            socket.emit('staff_register_error', 'Все поля обязательны');
            return;
        }

        if (password.length < 6) {
            socket.emit('staff_register_error', 'Пароль должен быть не менее 6 символов');
            return;
        }

        const existingUser = users.find(u => u.username === username);
        if (existingUser) {
            socket.emit('staff_register_error', 'Пользователь с таким логином уже существует');
            return;
        }

        const newStaff = {
            id: generateId(),
            username,
            password,
            role: role || 'listener',
            displayName: displayName || username,
            avatar: role === 'admin' ? '⚙️' : '🎧',
            rating: 0,
            ratingCount: 0,
            isOnline: false,
            socketId: null,
            createdAt: new Date().toISOString(),
            lastSeen: new Date().toISOString()
        };

        users.push(newStaff);
        const saved = saveUsers(users);
        
        if (saved) {
            socket.emit('staff_registered', { user: newStaff });
            socket.broadcast.emit('user_connected', { user: newStaff });
            syncUsers();
            
            addSystemLog('staff_registered', newStaff.id, { role: newStaff.role });
        } else {
            socket.emit('staff_register_error', 'Ошибка сохранения сотрудника');
        }
    });

    // 🔄 ИЗМЕНЕНИЕ РОЛИ
    socket.on('change_role', (data) => {
        console.log(`🎭 Изменение роли:`, data);
        
        const { userId, newRole } = data;
        const user = getUserById(userId);
        
        if (!user) {
            socket.emit('role_change_error', 'Пользователь не найден');
            return;
        }

        const updatedUser = updateUser(userId, { 
            role: newRole,
            avatar: newRole === 'admin' ? '⚙️' : newRole === 'listener' ? '🎧' : '👤'
        });
        
        if (updatedUser) {
            socket.emit('role_changed', { userId, newRole, user: updatedUser });
            socket.broadcast.emit('user_updated', { user: updatedUser });
            syncUsers();
            
            addSystemLog('role_changed', user.id, { newRole });
        } else {
            socket.emit('role_change_error', 'Ошибка изменения роли');
        }
    });

    // 🔄 ОТПРАВКА УВЕДОМЛЕНИЯ
    socket.on('send_technical_notification', (data) => {
        console.log(`📢 Отправка уведомления:`, data);
        
        const notifications = getNotifications();
        const { title, text, type, recipients } = data;
        
        if (!title || !text) {
            socket.emit('notification_error', 'Заголовок и текст обязательны');
            return;
        }

        const newNotification = {
            id: generateId(),
            title,
            text,
            type,
            recipients,
            timestamp: new Date().toISOString(),
            readBy: []
        };

        notifications.push(newNotification);
        saveNotifications(notifications);

        switch (recipients) {
            case 'all':
                broadcastToAll('new_notification', { notification: newNotification });
                break;
            case 'users':
                broadcastToRole('user', 'new_notification', { notification: newNotification });
                break;
            case 'listeners':
                broadcastToRole('listener', 'new_notification', { notification: newNotification });
                break;
            case 'admins':
                broadcastToAdmins('new_notification', { notification: newNotification });
                break;
        }

        socket.emit('notification_sent', { success: true });
        syncNotifications();
        
        addSystemLog('notification_sent', socket.id, { recipients, type });
    });

    // 🔄 МОДЕРАЦИЯ ПОЛЬЗОВАТЕЛЕЙ
    socket.on('apply_moderation', (data) => {
        console.log(`⚖️ Применение модерации:`, data);
        
        const { userId, action, reason, duration, moderatorId } = data;
        const user = getUserById(userId);
        const moderator = getUserById(moderatorId);
        
        if (!user || !moderator) {
            socket.emit('moderation_error', 'Пользователь не найден');
            return;
        }

        if (!reason) {
            socket.emit('moderation_error', 'Укажите причину');
            return;
        }

        const moderationRecord = {
            id: generateId(),
            userId,
            userName: user.displayName,
            action,
            reason,
            duration,
            moderatorId,
            moderatorName: moderator.displayName,
            timestamp: new Date().toISOString()
        };

        const history = getModerationHistory();
        history.push(moderationRecord);
        saveModerationHistory(history);

        let userUpdates = {};
        switch (action) {
            case 'block':
                userUpdates = { 
                    isBlocked: true,
                    blockUntil: new Date(Date.now() + duration * 24 * 60 * 60 * 1000).toISOString()
                };
                break;
            case 'unblock':
                userUpdates = { 
                    isBlocked: false,
                    blockUntil: null
                };
                break;
            case 'vacation':
                userUpdates = { 
                    isOnVacation: true,
                    vacationUntil: new Date(Date.now() + duration * 24 * 60 * 60 * 1000).toISOString()
                };
                break;
            case 'end_vacation':
                userUpdates = { 
                    isOnVacation: false,
                    vacationUntil: null
                };
                break;
        }

        if (Object.keys(userUpdates).length > 0) {
            updateUser(userId, userUpdates);
        }

        socket.emit('moderation_applied', { record: moderationRecord });
        broadcastToAdmins('moderation_action_applied', { 
            record: moderationRecord,
            user: getUserById(userId)
        });
        
        if (user.socketId) {
            const userSocket = io.sockets.sockets.get(user.socketId);
            if (userSocket) {
                userSocket.emit('user_moderated', {
                    action,
                    reason,
                    duration
                });
            }
        }
        
        syncUsers();
        syncModerationHistory();
        
        addSystemLog('moderation_applied', moderatorId, { action, targetUser: userId });
    });

    // 🔄 СОЗДАНИЕ ЧАТА
    socket.on('create_chat', (data) => {
        console.log(`💬 Создание чата:`, data);
        
        const users = getUsers();
        const chats = getChats();
        const { user1, user2 } = data;
        
        const user1Data = getUserById(user1);
        const user2Data = getUserById(user2);
        
        if (!user1Data || !user2Data) {
            socket.emit('chat_create_error', 'Пользователь не найден');
            return;
        }

        if (user2Data.isBlocked || user2Data.isOnVacation) {
            socket.emit('chat_create_error', 'Слушатель временно недоступен');
            return;
        }

        const existingChat = chats.find(chat => 
            chat.isActive && 
            ((chat.user1 === user1 && chat.user2 === user2) || 
             (chat.user1 === user2 && chat.user2 === user1))
        );

        if (existingChat) {
            socket.emit('chat_exists', { chat: existingChat });
            return;
        }

        const newChat = {
            id: generateId(),
            user1,
            user2, 
            messages: [],
            startTime: new Date().toISOString(),
            isActive: true,
            createdAt: new Date().toISOString()
        };

        chats.push(newChat);
        saveChats(chats);

        socket.emit('chat_created', { 
            chat: newChat, 
            listenerName: user2Data.displayName 
        });
        
        if (user2Data.socketId) {
            const listenerSocket = io.sockets.sockets.get(user2Data.socketId);
            if (listenerSocket) {
                listenerSocket.emit('chat_created', { 
                    chat: newChat, 
                    userName: user1Data.displayName 
                });
            }
        }
        
        broadcastToAdmins('new_chat_created', { 
            chat: newChat,
            user1: user1Data,
            user2: user2Data
        });
        
        syncChats();
        
        addSystemLog('chat_created', user1, { withUser: user2 });
    });

    // 🔄 ОТПРАВКА СООБЩЕНИЯ
    socket.on('send_message', (data) => {
        console.log(`📨 Отправка сообщения:`, data);
        
        const chats = getChats();
        const { chatId, message } = data;
        
        const chat = chats.find(c => c.id === chatId);
        if (!chat) {
            socket.emit('message_error', 'Чат не найден');
            return;
        }

        if (!chat.isActive) {
            socket.emit('message_error', 'Чат завершен');
            return;
        }

        if (!chat.messages) chat.messages = [];
        
        const newMessage = {
            id: generateId(),
            text: message.text,
            senderId: message.senderId,
            timestamp: new Date().toISOString(),
            type: message.type || 'text',
            fileUrl: message.fileUrl
        };

        chat.messages.push(newMessage);
        chat.lastActivity = new Date().toISOString();
        saveChats(chats);

        const targetUserId = message.senderId === chat.user1 ? chat.user2 : chat.user1;
        const targetUser = getUserById(targetUserId);
        
        if (targetUser && targetUser.socketId) {
            const targetSocket = io.sockets.sockets.get(targetUser.socketId);
            if (targetSocket) {
                targetSocket.emit('new_message', { chatId, message: newMessage });
            }
        }
        
        broadcastToAdmins('new_chat_message', {
            chatId,
            message: newMessage,
            chat
        });
        
        syncChats();
    });

    // 🔄 ОЦЕНКА СЛУШАТЕЛЯ
    socket.on('submit_rating', (data) => {
        console.log(`⭐ Оценка:`, data);
        
        const ratings = getRatings();
        const { listenerId, rating, comment, userId } = data;
        
        if (!listenerId || !rating) {
            socket.emit('rating_error', 'Заполните все обязательные поля');
            return;
        }

        const newRating = {
            id: generateId(),
            listenerId,
            userId,
            rating,
            comment,
            timestamp: new Date().toISOString()
        };

        ratings.push(newRating);
        saveRatings(ratings);

        const listenerRatings = ratings.filter(r => r.listenerId === listenerId);
        const totalRating = listenerRatings.reduce((sum, r) => sum + r.rating, 0);
        const avgRating = totalRating / listenerRatings.length;

        const listener = getUserById(listenerId);
        if (listener) {
            updateUser(listenerId, {
                rating: avgRating,
                ratingCount: listenerRatings.length
            });
        }

        socket.emit('rating_submitted', {
            listenerId,
            newRating: avgRating,
            ratingCount: listenerRatings.length
        });

        if (listener && listener.socketId) {
            const listenerSocket = io.sockets.sockets.get(listener.socketId);
            if (listenerSocket) {
                listenerSocket.emit('rating_received', {
                    listenerId,
                    newRating: avgRating, 
                    ratingCount: listenerRatings.length,
                    rating,
                    comment
                });
            }
        }
        
        syncRatings();
        syncUsers();
        
        addSystemLog('rating_submitted', userId, { listenerId, rating });
    });

    // 🔄 ЗАВЕРШЕНИЕ ЧАТА
    socket.on('end_chat', (data) => {
        console.log(`🔚 Завершение чата:`, data);
        
        const chats = getChats();
        const { chatId } = data;
        
        const chat = chats.find(c => c.id === chatId);
        if (!chat) {
            socket.emit('chat_error', 'Чат не найден');
            return;
        }

        chat.isActive = false;
        chat.endTime = new Date().toISOString();
        saveChats(chats);

        socket.emit('chat_ended', { chatId });
        
        const user2 = getUserById(chat.user2);
        if (user2 && user2.socketId) {
            const targetSocket = io.sockets.sockets.get(user2.socketId);
            if (targetSocket) {
                targetSocket.emit('chat_ended', { chatId });
            }
        }
        
        broadcastToAdmins('chat_ended', { chatId, chat });
        syncChats();
        
        addSystemLog('chat_ended', socket.id, { chatId });
    });

    // 🔄 СТАТУС НАБОРА ТЕКСТА
    socket.on('typing_start', (data) => {
        const { chatId, userId } = data;
        const chat = getChats().find(c => c.id === chatId);
        if (chat) {
            const targetUserId = userId === chat.user1 ? chat.user2 : chat.user1;
            const targetUser = getUserById(targetUserId);
            if (targetUser && targetUser.socketId) {
                const targetSocket = io.sockets.sockets.get(targetUser.socketId);
                if (targetSocket) {
                    targetSocket.emit('user_typing', { chatId, userId });
                }
            }
        }
    });

    socket.on('typing_stop', (data) => {
        const { chatId, userId } = data;
        const chat = getChats().find(c => c.id === chatId);
        if (chat) {
            const targetUserId = userId === chat.user1 ? chat.user2 : chat.user1;
            const targetUser = getUserById(targetUserId);
            if (targetUser && targetUser.socketId) {
                const targetSocket = io.sockets.sockets.get(targetUser.socketId);
                if (targetSocket) {
                    targetSocket.emit('user_stopped_typing', { chatId, userId });
                }
            }
        }
    });

    // 🔄 ОБНОВЛЕНИЕ НАСТРОЕК
    socket.on('update_settings', (data) => {
        console.log(`⚙️ Обновление настроек:`, data);
        
        const settings = getSettings();
        const updatedSettings = { ...settings, ...data.settings };
        
        if (saveSettings(updatedSettings)) {
            socket.emit('settings_updated', { settings: updatedSettings });
            broadcastToAll('settings_updated', { settings: updatedSettings });
            
            addSystemLog('settings_updated', socket.id);
        } else {
            socket.emit('settings_error', 'Ошибка сохранения настроек');
        }
    });

    // 🔄 ЗАПРОС СИСТЕМНЫХ ЛОГОВ
    socket.on('get_system_logs', () => {
        const logs = getSystemLogs();
        socket.emit('system_logs', { logs });
    });

    // 🔄 СОЗДАНИЕ РЕЗЕРВНОЙ КОПИИ
    socket.on('create_backup', () => {
        try {
            const backupDir = './backups';
            if (!fs.existsSync(backupDir)) {
                fs.mkdirSync(backupDir, { recursive: true });
            }

            const backupFile = path.join(backupDir, `backup-${Date.now()}.json`);
            const backupData = {
                users: getUsers(),
                chats: getChats(),
                ratings: getRatings(),
                notifications: getNotifications(),
                moderation: getModerationHistory(),
                settings: getSettings(),
                timestamp: new Date().toISOString()
            };

            fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));
            socket.emit('backup_created', { file: backupFile });
            
            addSystemLog('backup_created', socket.id);
        } catch (error) {
            socket.emit('backup_error', 'Ошибка создания резервной копии');
        }
    });

    // 🔄 ОТКЛЮЧЕНИЕ
    socket.on('disconnect', (reason) => {
        console.log(`🔌 Отключение: ${socket.id} (${reason})`);
        
        const user = getUserBySocketId(socket.id);
        if (user) {
            updateUser(user.id, {
                isOnline: false,
                socketId: null,
                lastSeen: new Date().toISOString()
            });
            
            socket.broadcast.emit('user_disconnected', { userId: user.id });
            syncUsers();
        }
    });

    // 🔄 ЗАПРОСЫ ДАННЫХ
    socket.on('get_users', () => {
        syncUsers();
    });

    socket.on('get_chats', () => {
        syncChats();
    });

    socket.on('get_ratings', () => {
        syncRatings();
    });

    socket.on('get_notifications', () => {
        syncNotifications();
    });

    socket.on('get_moderation_history', () => {
        syncModerationHistory();
    });

    socket.on('get_settings', () => {
        const settings = getSettings();
        socket.emit('settings_updated', { settings });
    });
});

// API маршруты для загрузки файлов
app.post('/api/upload', upload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Файл не загружен' });
        }

        const fileUrl = `/uploads/${req.file.filename}`;
        res.json({ 
            success: true, 
            fileUrl: fileUrl,
            fileName: req.file.originalname,
            fileSize: req.file.size
        });
    } catch (error) {
        console.error('Ошибка загрузки файла:', error);
        res.status(500).json({ error: 'Ошибка загрузки файла' });
    }
});

app.get('/api/users', (req, res) => {
    const users = getUsers();
    res.json(users);
});

app.get('/api/chats', (req, res) => {
    const chats = getChats();
    res.json(chats);
});

app.get('/api/ratings', (req, res) => {
    const ratings = getRatings();
    res.json(ratings);
});

app.get('/api/notifications', (req, res) => {
    const notifications = getNotifications();
    res.json(notifications);
});

app.get('/api/moderation', (req, res) => {
    const history = getModerationHistory();
    res.json(history);
});

app.get('/api/settings', (req, res) => {
    const settings = getSettings();
    res.json(settings);
});

app.get('/api/stats', (req, res) => {
    const users = getUsers();
    const chats = getChats();
    
    const stats = {
        totalUsers: users.length,
        totalListeners: users.filter(u => u.role === 'listener').length,
        activeChats: chats.filter(c => c.isActive).length,
        onlineUsers: users.filter(u => u.isOnline).length,
        totalMessages: chats.reduce((sum, chat) => sum + (chat.messages?.length || 0), 0),
        avgRating: users.filter(u => u.role === 'listener').reduce((sum, u) => sum + (u.rating || 0), 0) / users.filter(u => u.role === 'listener').length || 0
    };
    res.json(stats);
});

app.get('/api/health', (req, res) => {
    const users = getUsers();
    const chats = getChats();
    
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        users: users.length,
        chats: chats.length,
        connectedSockets: io.engine.clientsCount,
        environment: process.env.NODE_ENV || 'development'
    });
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Обработка 404
app.use((req, res) => {
    res.status(404).json({ error: 'Маршрут не найден' });
});

// Обработка ошибок
app.use((err, req, res, next) => {
    console.error('❌ Ошибка сервера:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
});

server.listen(PORT, '0.0.0.0', () => {
    const users = getUsers();
    console.log(`🚀 Сервер запущен на порту ${PORT}`);
    console.log(`🌐 Доступен по адресу: https://support-chat-hyv4.onrender.com`);
    console.log(`📊 Пользователей: ${users.length}`);
    console.log(`🔐 Аккаунты для входа:`);
    console.log(`   👑 Владелец: owner / owner2024`);
    console.log(`   ⚙️ Админ: admin / admin123`);
    console.log(`   👤 Пользователь: user / 123456`);
    console.log(`   🎧 Слушатель: listener / 123456`);
    console.log(`💾 Постоянное хранилище активировано`);
    console.log(`🗑️ Автоочистка файлов каждые 12 часов`);
    console.log(`🌐 Сервер готов к работе!`);
});
