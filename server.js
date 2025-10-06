const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// Настройка CORS для Socket.IO
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
        credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000,
    transports: ['websocket', 'polling']
});

// Middleware
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Файлы для хранения данных
const DATA_DIR = './data';
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const CHATS_FILE = path.join(DATA_DIR, 'chats.json');
const RATINGS_FILE = path.join(DATA_DIR, 'ratings.json');
const NOTIFICATIONS_FILE = path.join(DATA_DIR, 'notifications.json');
const LOGS_FILE = path.join(DATA_DIR, 'logs.json');
const WARNINGS_FILE = path.join(DATA_DIR, 'warnings.json');

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
        { name: LOGS_FILE, default: [] },
        { name: WARNINGS_FILE, default: [] }
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

function getLogs() {
    return loadData(LOGS_FILE, []);
}

function getWarnings() {
    return loadData(WARNINGS_FILE, []);
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

function saveLogs(logs) {
    return saveData(LOGS_FILE, logs);
}

function saveWarnings(warnings) {
    return saveData(WARNINGS_FILE, warnings);
}

// Создание владельца и демо-пользователей
function initializeUsers() {
    let users = getUsers();
    
    const defaultUsers = [
        {
            id: 'user-1',
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
            isSuperAdmin: true,
            isBanned: false
        },
        {
            id: 'user-2',
            username: 'admin',
            password: 'admin123',
            role: 'admin',
            displayName: 'Администратор',
            avatar: '⚙️',
            rating: 5.0,
            ratingCount: 0,
            isOnline: false,
            socketId: null,
            createdAt: new Date().toISOString(),
            isBanned: false
        },
        {
            id: 'user-3',
            username: 'listener1',
            password: '123456',
            role: 'listener',
            displayName: 'Анна Слушатель',
            avatar: '🎧',
            rating: 4.8,
            ratingCount: 15,
            isOnline: false,
            socketId: null,
            createdAt: new Date().toISOString(),
            isBanned: false,
            isAvailable: true
        },
        {
            id: 'user-4',
            username: 'listener2', 
            password: '123456',
            role: 'listener',
            displayName: 'Максим Психолог',
            avatar: '🧠',
            rating: 4.9,
            ratingCount: 22,
            isOnline: false,
            socketId: null,
            createdAt: new Date().toISOString(),
            isBanned: false,
            isAvailable: true
        },
        {
            id: 'user-5',
            username: 'user1',
            password: '123456',
            role: 'user',
            displayName: 'Тестовый Пользователь',
            avatar: '👤',
            rating: 0,
            ratingCount: 0,
            isOnline: false,
            socketId: null,
            createdAt: new Date().toISOString(),
            isBanned: false
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

// Получение пользователя по username
function getUserByUsername(username) {
    const users = getUsers();
    return users.find(u => u.username === username);
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

// Логирование действий
function addSystemLog(action, userId, targetUserId = null, details = '') {
    const logs = getLogs();
    const logEntry = {
        id: generateId(),
        action,
        userId,
        targetUserId,
        details,
        timestamp: new Date().toISOString(),
        ip: '127.0.0.1' // В реальной системе получать из запроса
    };
    
    logs.push(logEntry);
    saveLogs(logs);
    console.log(`📝 Лог: ${action} - ${details}`);
}

// Добавление предупреждения
function addUserWarning(userId, warnedBy, reason, details = '') {
    const warnings = getWarnings();
    const warning = {
        id: generateId(),
        userId,
        warnedBy,
        reason,
        details,
        timestamp: new Date().toISOString(),
        isActive: true
    };
    
    warnings.push(warning);
    saveWarnings(warnings);
    
    // Отправляем уведомление пользователю
    const user = getUserById(userId);
    if (user && user.socketId) {
        const userSocket = io.sockets.sockets.get(user.socketId);
        if (userSocket) {
            userSocket.emit('user_warned', { warning });
        }
    }
    
    return warning;
}

// Socket.IO соединения
io.on('connection', (socket) => {
    console.log(`🔗 Новое подключение: ${socket.id}`);

    // ВОССТАНОВЛЕНИЕ СЕССИИ
    socket.on('restore_session', (data) => {
        console.log(`🔄 Попытка восстановления сессии:`, data);
        
        const user = getUserById(data.userId);
        
        if (user && !user.isBanned) {
            updateUser(user.id, {
                isOnline: true,
                socketId: socket.id
            });
            
            const currentUsers = getUsers();
            const currentChats = getChats();
            const currentRatings = getRatings();
            const currentNotifications = getNotifications();
            const userWarnings = getWarnings().filter(w => w.userId === user.id && w.isActive);
            
            socket.emit('session_restored', { 
                success: true,
                user: user 
            });
            
            socket.emit('users_list', { 
                users: currentUsers.filter(u => u.id !== user.id) 
            });
            
            // Отправляем только релевантные чаты
            if (user.role === 'admin' || user.role === 'owner') {
                socket.emit('chats_list', { 
                    chats: currentChats 
                });
            } else if (user.role === 'listener') {
                const listenerChats = currentChats.filter(chat => 
                    chat.user2 === user.id && chat.isActive
                );
                socket.emit('chats_list', { 
                    chats: listenerChats 
                });
            } else {
                const userChats = currentChats.filter(chat => 
                    (chat.user1 === user.id || chat.user2 === user.id) && chat.isActive
                );
                socket.emit('chats_list', { 
                    chats: userChats 
                });
            }
            
            socket.emit('ratings_list', { 
                ratings: currentRatings 
            });

            socket.emit('notifications_list', {
                notifications: currentNotifications
            });

            // Отправляем предупреждения пользователю
            if (userWarnings.length > 0) {
                socket.emit('user_warnings', { warnings: userWarnings });
            }
            
            socket.broadcast.emit('user_connected', { user });
            
            addSystemLog('SESSION_RESTORE', user.id, null, `Пользователь ${user.username} восстановил сессию`);
            console.log(`🔄 Сессия восстановлена: ${user.username} (${user.role})`);
        } else {
            socket.emit('session_restored', { 
                success: false,
                error: user && user.isBanned ? 'Аккаунт заблокирован' : 'Пользователь не найден'
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

        if (user.isBanned) {
            socket.emit('login_error', 'Ваш аккаунт заблокирован');
            return;
        }

        updateUser(user.id, {
            isOnline: true,
            socketId: socket.id
        });

        const currentUsers = getUsers();
        const currentChats = getChats();
        const currentRatings = getRatings();
        const currentNotifications = getNotifications();
        const userWarnings = getWarnings().filter(w => w.userId === user.id && w.isActive);

        socket.emit('login_success', { user });
        
        socket.emit('users_list', { 
            users: currentUsers.filter(u => u.id !== user.id) 
        });
        
        // Отправляем только релевантные чаты
        if (user.role === 'admin' || user.role === 'owner') {
            socket.emit('chats_list', { 
                chats: currentChats 
            });
        } else if (user.role === 'listener') {
            const listenerChats = currentChats.filter(chat => 
                chat.user2 === user.id && chat.isActive
            );
            socket.emit('chats_list', { 
                chats: listenerChats 
            });
        } else {
            const userChats = currentChats.filter(chat => 
                (chat.user1 === user.id || chat.user2 === user.id) && chat.isActive
            );
            socket.emit('chats_list', { 
                chats: userChats 
            });
        }
        
        socket.emit('ratings_list', { 
            ratings: currentRatings 
        });

        socket.emit('notifications_list', {
            notifications: currentNotifications
        });

        // Отправляем предупреждения пользователю
        if (userWarnings.length > 0) {
            socket.emit('user_warnings', { warnings: userWarnings });
        }
        
        socket.broadcast.emit('user_connected', { user });
        
        addSystemLog('LOGIN', user.id, null, `Пользователь ${user.username} вошел в систему`);
        console.log(`✅ Успешный вход: ${username} (${user.role})`);
    });

    // РЕГИСТРАЦИЯ (только как пользователь)
    socket.on('register', (data) => {
        console.log(`📝 Запрос на регистрацию:`, data);
        
        const users = getUsers();
        const { username, password, displayName } = data;
        
        if (!username || !password) {
            socket.emit('registration_error', 'Логин и пароль обязательны');
            return;
        }

        const existingUser = users.find(u => u.username === username);
        if (existingUser) {
            socket.emit('registration_error', 'Пользователь с таким логином уже существует');
            return;
        }

        // Проверка сложности пароля
        if (password.length < 6) {
            socket.emit('registration_error', 'Пароль должен содержать минимум 6 символов');
            return;
        }

        const newUser = {
            id: generateId(),
            username,
            password,
            role: 'user', // Только пользователь может зарегистрироваться
            displayName: displayName || username,
            avatar: '👤',
            rating: 0,
            ratingCount: 0,
            isOnline: true,
            socketId: socket.id,
            createdAt: new Date().toISOString(),
            isBanned: false
        };

        users.push(newUser);
        const saved = saveUsers(users);
        
        if (saved) {
            socket.emit('registration_success', { user: newUser });
            
            const currentUsers = getUsers();
            const currentChats = getChats();
            const currentRatings = getRatings();
            
            socket.emit('users_list', { 
                users: currentUsers.filter(u => u.id !== newUser.id) 
            });
            
            socket.emit('chats_list', { 
                chats: currentChats 
            });
            
            socket.emit('ratings_list', { 
                ratings: currentRatings 
            });
            
            socket.broadcast.emit('user_connected', { user: newUser });
            
            addSystemLog('REGISTRATION', newUser.id, null, `Зарегистрирован новый пользователь: ${newUser.username}`);
            console.log(`✅ Новый пользователь: ${username}`);
        } else {
            socket.emit('registration_error', 'Ошибка сохранения пользователя');
        }
    });

    // ОБНОВЛЕНИЕ ПРОФИЛЯ
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
                socket.emit('profile_update_error', 'Пароль должен содержать минимум 6 символов');
                return;
            }
            updates.password = password;
        }

        const updatedUser = updateUser(userId, updates);
        
        if (updatedUser) {
            socket.emit('profile_updated', { user: updatedUser });
            socket.broadcast.emit('user_updated', { user: updatedUser });
            
            addSystemLog('PROFILE_UPDATE', user.id, null, `Пользователь обновил профиль`);
        } else {
            socket.emit('profile_update_error', 'Ошибка обновления профиля');
        }
    });

    // ДОБАВЛЕНИЕ СОТРУДНИКА (только владелец)
    socket.on('register_staff', (data) => {
        console.log(`➕ Добавление сотрудника:`, data);
        
        const currentUser = getUserBySocketId(socket.id);
        if (!currentUser || currentUser.role !== 'owner') {
            socket.emit('staff_add_error', 'Недостаточно прав');
            return;
        }

        const users = getUsers();
        const { username, password, displayName, role } = data;

        const existingUser = users.find(u => u.username === username);
        if (existingUser) {
            socket.emit('staff_add_error', 'Пользователь с таким логином уже существует');
            return;
        }

        if (password.length < 6) {
            socket.emit('staff_add_error', 'Пароль должен содержать минимум 6 символов');
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
            isBanned: false
        };

        // Для слушателей добавляем поле доступности
        if (role === 'listener') {
            newStaff.isAvailable = true;
        }

        users.push(newStaff);
        const saved = saveUsers(users);
        
        if (saved) {
            socket.emit('staff_added', { user: newStaff });
            socket.broadcast.emit('user_connected', { user: newStaff });
            
            addSystemLog('STAFF_ADDED', currentUser.id, newStaff.id, `Добавлен новый сотрудник: ${newStaff.username} (${newStaff.role})`);
        } else {
            socket.emit('staff_add_error', 'Ошибка сохранения сотрудника');
        }
    });

    // ИЗМЕНЕНИЕ РОЛИ ПОЛЬЗОВАТЕЛЯ
    socket.on('change_user_role', (data) => {
        console.log(`🎭 Изменение роли:`, data);
        
        const currentUser = getUserBySocketId(socket.id);
        if (!currentUser || (currentUser.role !== 'owner' && currentUser.role !== 'admin')) {
            socket.emit('role_change_error', 'Недостаточно прав');
            return;
        }

        const { userId, newRole } = data;
        const user = getUserById(userId);
        
        if (!user) {
            socket.emit('role_change_error', 'Пользователь не найден');
            return;
        }

        // Только владелец может назначать администраторов
        if (newRole === 'admin' && currentUser.role !== 'owner') {
            socket.emit('role_change_error', 'Только владелец может назначать администраторов');
            return;
        }

        const updates = { 
            role: newRole,
            avatar: newRole === 'admin' ? '⚙️' : newRole === 'listener' ? '🎧' : '👤'
        };

        // Для слушателей добавляем поле доступности
        if (newRole === 'listener') {
            updates.isAvailable = true;
        }

        const updatedUser = updateUser(userId, updates);
        
        if (updatedUser) {
            socket.emit('role_changed', { userId, newRole, user: updatedUser });
            socket.broadcast.emit('user_updated', { user: updatedUser });
            
            addSystemLog('ROLE_CHANGE', currentUser.id, userId, `Смена роли пользователя ${user.username} на ${newRole}`);
        } else {
            socket.emit('role_change_error', 'Ошибка изменения роли');
        }
    });

    // БЛОКИРОВКА ПОЛЬЗОВАТЕЛЯ
    socket.on('ban_user', (data) => {
        console.log(`🚫 Блокировка пользователя:`, data);
        
        const currentUser = getUserBySocketId(socket.id);
        if (!currentUser || (currentUser.role !== 'owner' && currentUser.role !== 'admin')) {
            socket.emit('ban_error', 'Недостаточно прав');
            return;
        }

        const users = getUsers();
        const { userId, reason, duration, comment } = data;
        
        const user = getUserById(userId);
        if (!user) {
            socket.emit('ban_error', 'Пользователь не найден');
            return;
        }

        // Нельзя блокировать владельца
        if (user.role === 'owner') {
            socket.emit('ban_error', 'Нельзя заблокировать владельца системы');
            return;
        }

        // Администраторы не могут блокировать других администраторов
        if (user.role === 'admin' && currentUser.role !== 'owner') {
            socket.emit('ban_error', 'Только владелец может блокировать администраторов');
            return;
        }

        const banInfo = {
            bannedBy: currentUser.id,
            reason,
            duration,
            comment,
            bannedAt: new Date().toISOString(),
            expiresAt: duration === 'permanent' ? null : new Date(Date.now() + duration * 24 * 60 * 60 * 1000).toISOString()
        };

        updateUser(userId, {
            isBanned: true,
            banInfo,
            isOnline: false,
            socketId: null
        });

        // Отключаем пользователя если он онлайн
        const userSocket = io.sockets.sockets.get(user.socketId);
        if (userSocket) {
            userSocket.emit('user_banned', { banInfo });
            userSocket.disconnect();
        }

        socket.emit('user_banned_success', { userId });
        socket.broadcast.emit('user_banned', { user, banInfo });
        
        addSystemLog('USER_BANNED', currentUser.id, userId, `Пользователь ${user.username} заблокирован. Причина: ${reason}`);
    });

    // РАЗБЛОКИРОВКА ПОЛЬЗОВАТЕЛЯ
    socket.on('unban_user', (data) => {
        console.log(`🔓 Разблокировка пользователя:`, data);
        
        const currentUser = getUserBySocketId(socket.id);
        if (!currentUser || (currentUser.role !== 'owner' && currentUser.role !== 'admin')) {
            socket.emit('unban_error', 'Недостаточно прав');
            return;
        }

        const { userId } = data;
        const user = getUserById(userId);
        
        if (!user) {
            socket.emit('unban_error', 'Пользователь не найден');
            return;
        }

        updateUser(userId, {
            isBanned: false,
            banInfo: null
        });

        socket.emit('user_unbanned_success', { userId });
        socket.broadcast.emit('user_unbanned', { user });
        
        addSystemLog('USER_UNBANNED', currentUser.id, userId, `Пользователь ${user.username} разблокирован`);
    });

    // ВЫДАЧА ПРЕДУПРЕЖДЕНИЯ
    socket.on('warn_user', (data) => {
        console.log(`⚠️ Выдача предупреждения:`, data);
        
        const currentUser = getUserBySocketId(socket.id);
        if (!currentUser || (currentUser.role !== 'owner' && currentUser.role !== 'admin')) {
            socket.emit('warn_error', 'Недостаточно прав');
            return;
        }

        const { userId, reason, details } = data;
        const user = getUserById(userId);
        
        if (!user) {
            socket.emit('warn_error', 'Пользователь не найден');
            return;
        }

        const warning = addUserWarning(userId, currentUser.id, reason, details);

        socket.emit('user_warned_success', { userId, warning });
        
        addSystemLog('USER_WARNED', currentUser.id, userId, `Пользователю ${user.username} выдано предупреждение. Причина: ${reason}`);
    });

    // ОТПРАВКА ТЕХНИЧЕСКОГО УВЕДОМЛЕНИЯ
    socket.on('send_technical_notification', (data) => {
        console.log(`📢 Отправка уведомления:`, data);
        
        const currentUser = getUserBySocketId(socket.id);
        if (!currentUser || (currentUser.role !== 'owner' && currentUser.role !== 'admin')) {
            socket.emit('notification_error', 'Недостаточно прав');
            return;
        }

        const notifications = getNotifications();
        const { title, text, type, recipients } = data;
        
        const newNotification = {
            id: generateId(),
            title,
            text,
            type,
            recipients,
            createdBy: currentUser.id,
            timestamp: new Date().toISOString(),
            readBy: []
        };

        notifications.push(newNotification);
        saveNotifications(notifications);

        const users = getUsers();
        let targetUsers = [];

        switch (recipients) {
            case 'all':
                targetUsers = users;
                break;
            case 'users':
                targetUsers = users.filter(u => u.role === 'user');
                break;
            case 'listeners':
                targetUsers = users.filter(u => u.role === 'listener');
                break;
            case 'admins':
                targetUsers = users.filter(u => u.role === 'admin' || u.role === 'owner');
                break;
        }

        targetUsers.forEach(user => {
            if (user.socketId) {
                const userSocket = io.sockets.sockets.get(user.socketId);
                if (userSocket) {
                    userSocket.emit('new_notification', { notification: newNotification });
                }
            }
        });

        socket.emit('notification_sent', { success: true });
        
        addSystemLog('NOTIFICATION_SENT', currentUser.id, null, `Отправлено уведомление: ${title}`);
    });

    // ОБНОВЛЕНИЕ СТАТУСА ДОСТУПНОСТИ СЛУШАТЕЛЯ
    socket.on('update_availability', (data) => {
        console.log(`🟢 Обновление статуса доступности:`, data);
        
        const user = getUserBySocketId(socket.id);
        if (!user || user.role !== 'listener') {
            socket.emit('availability_error', 'Недостаточно прав');
            return;
        }

        const { isAvailable } = data;
        const updatedUser = updateUser(user.id, { isAvailable });
        
        if (updatedUser) {
            socket.emit('availability_updated', { isAvailable });
            socket.broadcast.emit('user_updated', { user: updatedUser });
            
            addSystemLog('AVAILABILITY_UPDATE', user.id, null, `Слушатель ${user.username} ${isAvailable ? 'доступен' : 'не доступен'}`);
        } else {
            socket.emit('availability_error', 'Ошибка обновления статуса');
        }
    });

    // ПОЛУЧЕНИЕ ДАННЫХ
    socket.on('get_users', () => {
        const users = getUsers();
        socket.emit('users_list', { users });
    });

    socket.on('get_chats', () => {
        const user = getUserBySocketId(socket.id);
        const chats = getChats();
        
        if (user && (user.role === 'admin' || user.role === 'owner')) {
            socket.emit('chats_list', { chats });
        } else if (user && user.role === 'listener') {
            const listenerChats = chats.filter(chat => 
                chat.user2 === user.id && chat.isActive
            );
            socket.emit('chats_list', { chats: listenerChats });
        } else if (user) {
            const userChats = chats.filter(chat => 
                (chat.user1 === user.id || chat.user2 === user.id) && chat.isActive
            );
            socket.emit('chats_list', { chats: userChats });
        } else {
            socket.emit('chats_list', { chats: [] });
        }
    });

    socket.on('get_ratings', () => {
        const ratings = getRatings();
        socket.emit('ratings_list', { ratings });
    });

    socket.on('get_notifications', () => {
        const notifications = getNotifications();
        socket.emit('notifications_list', { notifications });
    });

    socket.on('get_system_logs', () => {
        const currentUser = getUserBySocketId(socket.id);
        if (!currentUser || (currentUser.role !== 'owner' && currentUser.role !== 'admin')) {
            socket.emit('logs_error', 'Недостаточно прав');
            return;
        }

        const logs = getLogs();
        socket.emit('system_logs', { logs });
    });

    socket.on('get_user_warnings', (data) => {
        const currentUser = getUserBySocketId(socket.id);
        if (!currentUser || (currentUser.role !== 'owner' && currentUser.role !== 'admin')) {
            socket.emit('warnings_error', 'Недостаточно прав');
            return;
        }

        const { userId } = data;
        const warnings = getWarnings().filter(w => w.userId === userId);
        socket.emit('user_warnings_list', { warnings });
    });

    // СОЗДАНИЕ ЧАТА
    socket.on('create_chat', (data) => {
        console.log(`💬 Создание чата:`, data);
        
        const users = getUsers();
        const chats = getChats();
        const { user1, user2 } = data;
        
        const user1Data = getUserById(user1);
        const user2Data = getUserById(user2);
        
        if (!user1Data || !user2Data) {
            socket.emit('chat_error', 'Пользователь не найден');
            return;
        }

        // Проверяем, что user2 - слушатель
        if (user2Data.role !== 'listener') {
            socket.emit('chat_error', 'Можно начать чат только со слушателем');
            return;
        }

        // Проверяем, что слушатель доступен
        if (!user2Data.isAvailable) {
            socket.emit('chat_error', 'Этот слушатель сейчас не доступен');
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
            lastActivity: new Date().toISOString()
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
                    listenerName: user1Data.displayName 
                });
            }
        }
        
        addSystemLog('CHAT_CREATED', user1, user2, `Создан чат между ${user1Data.username} и ${user2Data.username}`);
    });

    // ОТПРАВКА СООБЩЕНИЯ
    socket.on('send_message', (data) => {
        console.log(`📨 Отправка сообщения:`, data);
        
        const chats = getChats();
        const { chatId, message } = data;
        
        const chat = chats.find(c => c.id === chatId);
        if (!chat) {
            socket.emit('message_error', 'Чат не найден');
            return;
        }

        const sender = getUserBySocketId(socket.id);
        if (!sender || (sender.id !== chat.user1 && sender.id !== chat.user2)) {
            socket.emit('message_error', 'Нет доступа к этому чату');
            return;
        }

        if (!chat.messages) chat.messages = [];
        
        const newMessage = {
            id: generateId(),
            text: message.text,
            senderId: message.senderId,
            timestamp: new Date().toISOString()
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
        
        addSystemLog('MESSAGE_SENT', sender.id, targetUserId, `Отправлено сообщение в чате ${chatId}`);
    });

    // ОЦЕНКА СЛУШАТЕЛЯ
    socket.on('submit_rating', (data) => {
        console.log(`⭐ Оценка слушателя:`, data);
        
        const ratings = getRatings();
        const { listenerId, rating, comment, userId } = data;
        
        const listener = getUserById(listenerId);
        const user = getUserById(userId);
        
        if (!listener || listener.role !== 'listener') {
            socket.emit('rating
