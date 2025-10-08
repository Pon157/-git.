const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// Настройки для Render.com
const PORT = process.env.PORT || 3000;

// Улучшенные настройки CORS для Render.com
app.use(cors({
    origin: function(origin, callback) {
        // Разрешаем все origins в development и для Render.com
        const allowedOrigins = [
            'https://support-chat-hyv4.onrender.com',
            'http://localhost:3000',
            'http://127.0.0.1:3000',
            undefined // для запросов без origin (например, из Postman)
        ];
        
        if (process.env.NODE_ENV === 'development' || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            console.log('Blocked origin:', origin);
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

// Улучшенные настройки Socket.IO для Render.com
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

// Обработка ошибок соединения Socket.IO
io.engine.on("connection_error", (err) => {
    console.log('❌ Ошибка соединения Socket.IO:', err.req);
    console.log('❌ Code:', err.code);
    console.log('❌ Message:', err.message);
    console.log('❌ Context:', err.context);
});

// Файлы для хранения данных
const DATA_DIR = './data';
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const CHATS_FILE = path.join(DATA_DIR, 'chats.json');
const RATINGS_FILE = path.join(DATA_DIR, 'ratings.json');
const NOTIFICATIONS_FILE = path.join(DATA_DIR, 'notifications.json');
const MODERATION_FILE = path.join(DATA_DIR, 'moderation.json');

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
        { name: MODERATION_FILE, default: [] }
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
        console.log(`💾 Данные сохранены в ${filename}`);
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

// 🔄 ФУНКЦИИ СИНХРОНИЗАЦИИ
function broadcastToAll(event, data) {
    console.log(`🔄 Broadcast: ${event}`, data);
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

function broadcastData() {
    const users = getUsers();
    const chats = getChats();
    const ratings = getRatings();
    const notifications = getNotifications();
    const moderationHistory = getModerationHistory();
    
    // Отправляем публичные данные всем
    const publicUsers = users.map(user => {
        const { password, socketId, ...publicUser } = user;
        return publicUser;
    });
    
    broadcastToAll('users_list', { users: publicUsers });
    broadcastToAll('chats_list', { chats });
    broadcastToAll('ratings_list', { ratings });
    broadcastToAll('notifications_list', { notifications });
    broadcastToAll('moderation_history', { history: moderationHistory });
}

// 🔄 Синхронизация конкретных данных
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
            id: 'owner-1',
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
            isSuperAdmin: true
        },
        {
            id: 'admin-1',
            username: 'admin',
            password: 'admin123',
            role: 'admin',
            displayName: 'Администратор',
            avatar: '⚙️',
            rating: 5.0,
            ratingCount: 0,
            isOnline: false,
            socketId: null,
            createdAt: new Date().toISOString()
        },
        {
            id: 'user-1',
            username: 'user',
            password: '123456',
            role: 'user',
            displayName: 'Тестовый Пользователь',
            avatar: '👤',
            rating: 0,
            ratingCount: 0,
            isOnline: false,
            socketId: null,
            createdAt: new Date().toISOString()
        },
        {
            id: 'listener-1', 
            username: 'listener',
            password: '123456',
            role: 'listener',
            displayName: 'Анна Слушатель',
            avatar: '🎧',
            rating: 4.8,
            ratingCount: 15,
            isOnline: false,
            socketId: null,
            createdAt: new Date().toISOString()
        },
        {
            id: 'listener-2', 
            username: 'listener2',
            password: '123456',
            role: 'listener',
            displayName: 'Максим Слушатель',
            avatar: '🎵',
            rating: 4.5,
            ratingCount: 8,
            isOnline: false,
            socketId: null,
            createdAt: new Date().toISOString()
        }
    ];

    let hasChanges = false;
    
    defaultUsers.forEach(defaultUser => {
        const exists = users.find(u => u.username === defaultUser.username);
        if (!exists) {
            users.push(defaultUser);
            hasChanges = true;
            console.log(`✅ Добавлен пользователь: ${defaultUser.username} (${defaultUser.role})`);
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

// 🔄 ОСНОВНЫЕ ОБРАБОТЧИКИ SOCKET.IO
io.on('connection', (socket) => {
    console.log(`🔗 Новое подключение: ${socket.id} from ${socket.handshake.headers.origin}`);

    // Отправка начальных данных новому клиенту
    const initialUsers = getUsers();
    const initialChats = getChats();
    const initialRatings = getRatings();
    const initialNotifications = getNotifications();
    const initialModerationHistory = getModerationHistory();

    const publicUsers = initialUsers.map(user => {
        const { password, socketId, ...publicUser } = user;
        return publicUser;
    });

    socket.emit('users_list', { users: publicUsers });
    socket.emit('chats_list', { chats: initialChats });
    socket.emit('ratings_list', { ratings: initialRatings });
    socket.emit('notifications_list', { notifications: initialNotifications });
    socket.emit('moderation_history', { history: initialModerationHistory });

    // ВОССТАНОВЛЕНИЕ СЕССИИ
    socket.on('restore_session', (data) => {
        console.log(`🔄 Попытка восстановления сессии:`, data);
        
        const user = getUserById(data.userId);
        
        if (user) {
            updateUser(user.id, {
                isOnline: true,
                socketId: socket.id
            });
            
            socket.emit('session_restored', { 
                success: true,
                user: user 
            });
            
            // 🔄 УВЕДОМЛЯЕМ ВСЕХ О ПОДКЛЮЧЕНИИ
            socket.broadcast.emit('user_connected', { user });
            
            // 🔄 СИНХРОНИЗИРУЕМ ДАННЫЕ
            syncUsers();
            
            console.log(`🔄 Сессия восстановлена: ${user.username} (${user.role})`);
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

        updateUser(user.id, {
            isOnline: true,
            socketId: socket.id
        });

        socket.emit('login_success', { user });
        
        // 🔄 УВЕДОМЛЯЕМ ВСЕХ О ПОДКЛЮЧЕНИИ
        socket.broadcast.emit('user_connected', { user });
        
        // 🔄 СИНХРОНИЗИРУЕМ ДАННЫЕ
        syncUsers();
        
        console.log(`✅ Успешный вход: ${username} (${user.role})`);
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
            createdAt: new Date().toISOString()
        };

        users.push(newUser);
        const saved = saveUsers(users);
        
        if (saved) {
            socket.emit('registration_success', { user: newUser });
            
            // 🔄 УВЕДОМЛЯЕМ ВСЕХ О НОВОМ ПОЛЬЗОВАТЕЛЕ
            socket.broadcast.emit('user_connected', { user: newUser });
            
            // 🔄 УВЕДОМЛЯЕМ АДМИНИСТРАТОРОВ О НОВОЙ РЕГИСТРАЦИИ
            broadcastToAdmins('new_user_registered', { user: newUser });
            
            // 🔄 СИНХРОНИЗИРУЕМ ДАННЫЕ
            syncUsers();
            
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
        if (password) updates.password = password;

        const updatedUser = updateUser(userId, updates);
        
        if (updatedUser) {
            socket.emit('profile_updated', { user: updatedUser });
            
            // 🔄 СИНХРОНИЗИРУЕМ ИЗМЕНЕНИЯ СО ВСЕМИ
            socket.broadcast.emit('user_updated', { user: updatedUser });
            
            // 🔄 СИНХРОНИЗИРУЕМ ДАННЫЕ
            syncUsers();
        } else {
            socket.emit('profile_update_error', 'Ошибка обновления профиля');
        }
    });

    // 🔄 ДОБАВЛЕНИЕ СОТРУДНИКА
    socket.on('register_staff', (data) => {
        console.log(`➕ Добавление сотрудника:`, data);
        
        const users = getUsers();
        const { username, password, displayName, role } = data;

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
            createdAt: new Date().toISOString()
        };

        users.push(newStaff);
        const saved = saveUsers(users);
        
        if (saved) {
            socket.emit('staff_registered', { user: newStaff });
            
            // 🔄 УВЕДОМЛЯЕМ ВСЕХ О НОВОМ СОТРУДНИКЕ
            socket.broadcast.emit('user_connected', { user: newStaff });
            
            // 🔄 СИНХРОНИЗИРУЕМ ДАННЫЕ
            syncUsers();
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
            
            // 🔄 УВЕДОМЛЯЕМ ВСЕХ ОБ ИЗМЕНЕНИИ РОЛИ
            socket.broadcast.emit('user_updated', { user: updatedUser });
            
            // 🔄 СИНХРОНИЗИРУЕМ ДАННЫЕ
            syncUsers();
        } else {
            socket.emit('role_change_error', 'Ошибка изменения роли');
        }
    });

    // 🔄 ОТПРАВКА УВЕДОМЛЕНИЯ
    socket.on('send_technical_notification', (data) => {
        console.log(`📢 Отправка уведомления:`, data);
        
        const notifications = getNotifications();
        const { title, text, type, recipients } = data;
        
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

        // 🔄 ОТПРАВЛЯЕМ УВЕДОМЛЕНИЕ ВСЕМ ЦЕЛЕВЫМ ПОЛЬЗОВАТЕЛЯМ
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
        
        // 🔄 СИНХРОНИЗИРУЕМ ДАННЫЕ
        syncNotifications();
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

        // Применяем действие
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
        
        // 🔄 УВЕДОМЛЯЕМ ВСЕХ АДМИНИСТРАТОРОВ
        broadcastToAdmins('moderation_action_applied', { 
            record: moderationRecord,
            user: getUserById(userId)
        });
        
        // 🔄 УВЕДОМЛЯЕМ ПОЛЬЗОВАТЕЛЯ О ДЕЙСТВИИ
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
        
        // 🔄 СИНХРОНИЗИРУЕМ ДАННЫЕ
        syncUsers();
        syncModerationHistory();
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
        
        // 🔄 УВЕДОМЛЯЕМ СЛУШАТЕЛЯ О НОВОМ ЧАТЕ
        if (user2Data.socketId) {
            const listenerSocket = io.sockets.sockets.get(user2Data.socketId);
            if (listenerSocket) {
                listenerSocket.emit('chat_created', { 
                    chat: newChat, 
                    userName: user1Data.displayName 
                });
            }
        }
        
        // 🔄 УВЕДОМЛЯЕМ АДМИНИСТРАТОРОВ О НОВОМ ЧАТЕ
        broadcastToAdmins('new_chat_created', { 
            chat: newChat,
            user1: user1Data,
            user2: user2Data
        });
        
        // 🔄 СИНХРОНИЗИРУЕМ ДАННЫЕ
        syncChats();
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

        if (!chat.messages) chat.messages = [];
        
        const newMessage = {
            id: generateId(),
            text: message.text,
            senderId: message.senderId,
            timestamp: new Date().toISOString(),
            type: message.type || 'text'
        };

        chat.messages.push(newMessage);
        chat.lastActivity = new Date().toISOString();
        saveChats(chats);

        const targetUserId = message.senderId === chat.user1 ? chat.user2 : chat.user1;
        const targetUser = getUserById(targetUserId);
        
        // 🔄 ОТПРАВЛЯЕМ СООБЩЕНИЕ ВТОРОМУ УЧАСТНИКУ
        if (targetUser && targetUser.socketId) {
            const targetSocket = io.sockets.sockets.get(targetUser.socketId);
            if (targetSocket) {
                targetSocket.emit('new_message', { chatId, message: newMessage });
            }
        }
        
        // 🔄 УВЕДОМЛЯЕМ АДМИНИСТРАТОРОВ О НОВОМ СООБЩЕНИИ
        broadcastToAdmins('new_chat_message', {
            chatId,
            message: newMessage,
            chat
        });
        
        // 🔄 СИНХРОНИЗИРУЕМ ДАННЫЕ
        syncChats();
    });

    // 🔄 ОЦЕНКА СЛУШАТЕЛЯ
    socket.on('submit_rating', (data) => {
        console.log(`⭐ Оценка:`, data);
        
        const ratings = getRatings();
        const { listenerId, rating, comment, userId } = data;
        
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

        // 🔄 УВЕДОМЛЯЕМ СЛУШАТЕЛЯ О НОВОЙ ОЦЕНКЕ
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
        
        // 🔄 СИНХРОНИЗИРУЕМ ДАННЫЕ
        syncRatings();
        syncUsers();
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
        
        // 🔄 УВЕДОМЛЯЕМ ВТОРОГО УЧАСТНИКА
        const user2 = getUserById(chat.user2);
        if (user2 && user2.socketId) {
            const targetSocket = io.sockets.sockets.get(user2.socketId);
            if (targetSocket) {
                targetSocket.emit('chat_ended', { chatId });
            }
        }
        
        // 🔄 УВЕДОМЛЯЕМ АДМИНИСТРАТОРОВ О ЗАВЕРШЕНИИ ЧАТА
        broadcastToAdmins('chat_ended', { chatId, chat });
        
        // 🔄 СИНХРОНИЗИРУЕМ ДАННЫЕ
        syncChats();
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

    // 🔄 ОТКЛЮЧЕНИЕ
    socket.on('disconnect', (reason) => {
        console.log(`🔌 Отключение: ${socket.id} (${reason})`);
        
        const user = getUserBySocketId(socket.id);
        if (user) {
            updateUser(user.id, {
                isOnline: false,
                socketId: null
            });
            
            // 🔄 УВЕДОМЛЯЕМ ВСЕХ ОБ ОТКЛЮЧЕНИИ
            socket.broadcast.emit('user_disconnected', { userId: user.id });
            
            // 🔄 СИНХРОНИЗИРУЕМ ДАННЫЕ
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
});

// API маршруты
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
    console.log(`   🎧 Слушатель 2: listener2 / 123456`);
    console.log(`🔄 СИНХРОНИЗАЦИЯ АКТИВИРОВАНА:`);
    console.log(`   ✅ Синхронизация пользователей`);
    console.log(`   ✅ Синхронизация чатов`);
    console.log(`   ✅ Синхронизация оценок`);
    console.log(`   ✅ Синхронизация уведомлений`);
    console.log(`   ✅ Синхронизация модерации`);
    console.log(`   ✅ Уведомления администраторов`);
    console.log(`   ✅ Уведомления о новых сообщениях`);
    console.log(`🌐 Сервер готов к работе!`);
});
