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
app.use(express.json({ limit: '50mb' })); // Увеличиваем лимит для файлов
app.use(express.urlencoded({ extended: true }));

// Файлы для хранения данных
const DATA_DIR = './data';
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const CHATS_FILE = path.join(DATA_DIR, 'chats.json');
const RATINGS_FILE = path.join(DATA_DIR, 'ratings.json');
const NOTIFICATIONS_FILE = path.join(DATA_DIR, 'notifications.json');
const MODERATION_FILE = path.join(DATA_DIR, 'moderation.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

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
        { name: SETTINGS_FILE, default: {
            fileUploads: true,
            maxFileSize: 10, // MB
            allowedFileTypes: ['jpg', 'jpeg', 'png', 'gif', 'mp4', 'mov', 'avi'],
            stickers: ['😊', '😂', '😍', '😎', '😢', '😡', '🤔', '🎉', '❤️', '🔥', '👍', '👎']
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

function getSettings() {
    return loadData(SETTINGS_FILE, {});
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
            lastSeen: new Date().toISOString()
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
            lastSeen: new Date().toISOString()
        },
        {
            id: 'user-3',
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
            id: 'user-4', 
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

// Функция для периодического сохранения данных
function startAutoSave() {
    setInterval(() => {
        console.log('💾 Автосохранение данных...');
        // Просто загружаем и сохраняем данные для поддержания актуальности
        const users = getUsers();
        const chats = getChats();
        const ratings = getRatings();
        const notifications = getNotifications();
        
        saveUsers(users);
        saveChats(chats);
        saveRatings(ratings);
        saveNotifications(notifications);
    }, 30000); // Сохраняем каждые 30 секунд
}

// Socket.IO соединения
io.on('connection', (socket) => {
    console.log(`🔗 Новое подключение: ${socket.id}`);

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
            
            const currentUsers = getUsers();
            const currentChats = getChats();
            const currentRatings = getRatings();
            const currentNotifications = getNotifications();
            const settings = getSettings();
            
            socket.emit('session_restored', { 
                success: true,
                user: user 
            });
            
            socket.emit('users_list', { 
                users: currentUsers.filter(u => u.id !== user.id) 
            });
            
            if (user.role === 'admin' || user.role === 'owner') {
                socket.emit('chats_list', { 
                    chats: currentChats 
                });
            } else {
                socket.emit('chats_list', { 
                    chats: currentChats.filter(chat => 
                        chat.user1 === user.id || chat.user2 === user.id
                    )
                });
            }
            
            socket.emit('ratings_list', { 
                ratings: currentRatings 
            });

            socket.emit('notifications_list', {
                notifications: currentNotifications
            });

            socket.emit('settings_updated', {
                settings: settings
            });
            
            socket.broadcast.emit('user_connected', { user });
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

        // Проверка блокировки
        if (user.isBlocked && user.blockedUntil && new Date(user.blockedUntil) > new Date()) {
            socket.emit('login_error', 'Аккаунт заблокирован до ' + new Date(user.blockedUntil).toLocaleDateString());
            return;
        }

        updateUser(user.id, {
            isOnline: true,
            socketId: socket.id,
            lastSeen: new Date().toISOString()
        });

        const currentUsers = getUsers();
        const currentChats = getChats();
        const currentRatings = getRatings();
        const currentNotifications = getNotifications();
        const settings = getSettings();

        socket.emit('login_success', { user });
        
        socket.emit('users_list', { 
            users: currentUsers.filter(u => u.id !== user.id) 
        });
        
        if (user.role === 'admin' || user.role === 'owner') {
            socket.emit('chats_list', { 
                chats: currentChats 
            });
        } else {
            socket.emit('chats_list', { 
                chats: currentChats.filter(chat => 
                    chat.user1 === user.id || chat.user2 === user.id
                )
            });
        }
        
        socket.emit('ratings_list', { 
            ratings: currentRatings 
        });

        socket.emit('notifications_list', {
            notifications: currentNotifications
        });

        socket.emit('settings_updated', {
            settings: settings
        });
        
        socket.broadcast.emit('user_connected', { user });
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
            createdAt: new Date().toISOString(),
            lastSeen: new Date().toISOString()
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
        if (password) updates.password = password;

        const updatedUser = updateUser(userId, updates);
        
        if (updatedUser) {
            socket.emit('profile_updated', { user: updatedUser });
            socket.broadcast.emit('user_updated', { user: updatedUser });
        } else {
            socket.emit('profile_update_error', 'Ошибка обновления профиля');
        }
    });

    // ДОБАВЛЕНИЕ СОТРУДНИКА
    socket.on('register_staff', (data) => {
        console.log(`➕ Добавление сотрудника:`, data);
        
        const users = getUsers();
        const { username, password, displayName, role } = data;

        const existingUser = users.find(u => u.username === username);
        if (existingUser) {
            socket.emit('staff_add_error', 'Пользователь с таким логином уже существует');
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
            socket.emit('staff_added', { user: newStaff });
            socket.broadcast.emit('user_connected', { user: newStaff });
        } else {
            socket.emit('staff_add_error', 'Ошибка сохранения сотрудника');
        }
    });

    // ИЗМЕНЕНИЕ РОЛИ
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
        } else {
            socket.emit('role_change_error', 'Ошибка изменения роли');
        }
    });

    // ОТПРАВКА УВЕДОМЛЕНИЯ
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
    });

    // ОБНОВЛЕНИЕ НАСТРОЕК
    socket.on('update_settings', (data) => {
        console.log(`⚙️ Обновление настроек:`, data);
        
        const { settings } = data;
        const currentSettings = getSettings();
        
        const updatedSettings = { ...currentSettings, ...settings };
        saveSettings(updatedSettings);
        
        socket.emit('settings_updated', { settings: updatedSettings });
        socket.broadcast.emit('settings_updated', { settings: updatedSettings });
        
        console.log('✅ Настройки системы обновлены');
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
        } else if (user) {
            const userChats = chats.filter(chat => 
                chat.user1 === user.id || chat.user2 === user.id
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

    socket.on('get_moderation_history', () => {
        const history = getModerationHistory();
        socket.emit('moderation_history', { history });
    });

    socket.on('get_settings', () => {
        const settings = getSettings();
        socket.emit('settings_updated', { settings });
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

        // Отправляем обаим пользователям
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

        // Обновляем список чатов для всех
        io.emit('chats_list', { chats: getChats() });
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

        if (!chat.messages) chat.messages = [];
        
        const newMessage = {
            id: generateId(),
            text: message.text,
            senderId: message.senderId,
            timestamp: new Date().toISOString(),
            type: message.type || 'text',
            fileData: message.fileData
        };

        chat.messages.push(newMessage);
        chat.lastActivity = new Date().toISOString();
        saveChats(chats);

        const targetUserId = message.senderId === chat.user1 ? chat.user2 : chat.user1;
        const targetUser = getUserById(targetUserId);
        
        // Отправляем сообщение отправителю
        socket.emit('new_message', { chatId, message: newMessage });
        
        // Отправляем сообщение получателю
        if (targetUser && targetUser.socketId) {
            const targetSocket = io.sockets.sockets.get(targetUser.socketId);
            if (targetSocket) {
                targetSocket.emit('new_message', { chatId, message: newMessage });
            }
        }

        // Обновляем список чатов для всех участников
        io.emit('chats_list', { chats: getChats() });
    });

    // ОЦЕНКА
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
    });

    // МОДЕРАЦИЯ
    socket.on('apply_moderation_action', (data) => {
        console.log(`⚖️ Применение модерации:`, data);
        
        const { userId, action, reason, moderatorId, duration } = data;
        const user = getUserById(userId);
        const moderator = getUserById(moderatorId);
        
        if (!user) {
            socket.emit('moderation_error', 'Пользователь не найден');
            return;
        }

        const updates = {};
        const history = getModerationHistory();
        
        const moderationRecord = {
            id: generateId(),
            userId,
            moderatorId,
            action,
            reason,
            timestamp: new Date().toISOString()
        };

        switch (action) {
            case 'warning':
                updates.warnings = (user.warnings || 0) + 1;
                moderationRecord.message = `Пользователь получил предупреждение: ${reason}`;
                break;
                
            case 'block':
                const blockUntil = new Date();
                blockUntil.setDate(blockUntil.getDate() + (duration || 7));
                updates.isBlocked = true;
                updates.blockedUntil = blockUntil.toISOString();
                moderationRecord.duration = duration;
                moderationRecord.message = `Пользователь заблокирован до ${blockUntil.toLocaleDateString()}: ${reason}`;
                break;
                
            case 'vacation':
                const vacationUntil = new Date();
                vacationUntil.setDate(vacationUntil.getDate() + (duration || 7));
                updates.isOnVacation = true;
                updates.vacationUntil = vacationUntil.toISOString();
                moderationRecord.duration = duration;
                moderationRecord.message = `Пользователь в отпуске до ${vacationUntil.toLocaleDateString()}: ${reason}`;
                break;
                
            case 'unblock':
                updates.isBlocked = false;
                updates.blockedUntil = null;
                moderationRecord.message = `Пользователь разблокирован: ${reason}`;
                break;
        }

        updateUser(userId, updates);
        history.push(moderationRecord);
        saveModerationHistory(history);

        socket.emit('moderation_action_applied', {
            success: true,
            message: moderationRecord.message,
            user: getUserById(userId)
        });

        // Уведомляем пользователя если он онлайн
        if (user.socketId) {
            const userSocket = io.sockets.sockets.get(user.socketId);
            if (userSocket) {
                userSocket.emit('moderation_action_received', {
                    action,
                    reason,
                    duration,
                    moderator: moderator ? moderator.displayName : 'Система'
                });
            }
        }

        // Обновляем списки
        io.emit('users_list', { users: getUsers() });
        io.emit('moderation_history', { history });
    });

    // ЗАВЕРШЕНИЕ ЧАТА
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

        // Уведомляем обоих участников
        socket.emit('chat_ended', { chatId });
        
        const user2 = getUserById(chat.user2);
        if (user2 && user2.socketId) {
            const targetSocket = io.sockets.sockets.get(user2.socketId);
            if (targetSocket) {
                targetSocket.emit('chat_ended', { chatId });
            }
        }

        // Обновляем список чатов
        io.emit('chats_list', { chats: getChats() });
    });

    // ОТКЛЮЧЕНИЕ
    socket.on('disconnect', (reason) => {
        console.log(`🔌 Отключение: ${socket.id} - ${reason}`);
        
        const user = getUserBySocketId(socket.id);
        if (user) {
            updateUser(user.id, {
                isOnline: false,
                socketId: null,
                lastSeen: new Date().toISOString()
            });
            
            socket.broadcast.emit('user_disconnected', { userId: user.id });
        }
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

app.get('/api/stats', (req, res) => {
    const users = getUsers();
    const chats = getChats();
    
    const stats = {
        totalUsers: users.length,
        totalListeners: users.filter(u => u.role === 'listener').length,
        activeChats: chats.filter(c => c.isActive).length,
        onlineUsers: users.filter(u => u.isOnline).length,
        totalMessages: chats.reduce((total, chat) => total + (chat.messages?.length || 0), 0),
        avgRating: users.filter(u => u.role === 'listener' && u.ratingCount > 0)
                      .reduce((sum, u) => sum + u.rating, 0) / 
                      users.filter(u => u.role === 'listener' && u.ratingCount > 0).length || 0
    };
    res.json(stats);
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Запускаем автосохранение
startAutoSave();

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    const users = getUsers();
    console.log(`🚀 Сервер запущен на порту ${PORT}`);
    console.log(`📊 Пользователей: ${users.length}`);
    console.log(`💾 Автосохранение данных включено`);
    console.log(`🔐 Аккаунты для входа:`);
    console.log(`   👑 Владелец: owner / owner2024`);
    console.log(`   ⚙️ Админ: admin / admin123`);
    console.log(`   👤 Пользователь: user / 123456`);
    console.log(`   🎧 Слушатель: listener / 123456`);
    console.log(`🌐 URL: http://localhost:${PORT}`);
});
