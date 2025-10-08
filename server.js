const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const multer = require('multer');
const sharp = require('sharp');

const app = express();
const server = http.createServer(app);

// Настройки для  Render.com
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
        const uploadDir = './uploads';
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
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'video/avi', 'video/mov'];
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
const DATA_DIR = './data';
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const CHATS_FILE = path.join(DATA_DIR, 'chats.json');
const RATINGS_FILE = path.join(DATA_DIR, 'ratings.json');
const NOTIFICATIONS_FILE = path.join(DATA_DIR, 'notifications.json');
const MODERATION_FILE = path.join(DATA_DIR, 'moderation.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

// Создание директорий
function ensureDirectories() {
    const directories = [DATA_DIR, './uploads'];
    directories.forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
            console.log(`✅ Создана директория: ${dir}`);
        }
    });
}

// Инициализация файлов
function initializeFiles() {
    ensureDirectories();
    
    const files = [
        { name: USERS_FILE, default: [] },
        { name: CHATS_FILE, default: [] },
        { name: RATINGS_FILE, default: [] },
        { name: NOTIFICATIONS_FILE, default: [] },
        { name: MODERATION_FILE, default: [] },
        { name: SETTINGS_FILE, default: {
            systemName: "Чат система",
            welcomeMessage: "Добро пожаловать в чат систему!",
            fileUploadsEnabled: true,
            maxFileSize: 10,
            maxChatDuration: 60,
            autoEndChat: true,
            stickers: ['😊', '😂', '😍', '😎', '😢', '😡', '🤔', '🎉', '❤️', '🔥', '👍', '👎'],
            stickerPacks: []
        }}
    ];

    files.forEach(file => {
        if (!fs.existsSync(file.name)) {
            fs.writeFileSync(file.name, JSON.stringify(file.default, null, 2));
            console.log(`✅ Создан файл: ${file.name}`);
        }
    });
}

// Загрузка данных
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

// Сохранение данных
function saveData(filename, data) {
    try {
        fs.writeFileSync(filename, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error(`❌ Ошибка сохранения ${filename}:`, error);
        return false;
    }
}

// Загрузка конкретных данных
function getUsers() { return loadData(USERS_FILE, []); }
function getChats() { return loadData(CHATS_FILE, []); }
function getRatings() { return loadData(RATINGS_FILE, []); }
function getNotifications() { return loadData(NOTIFICATIONS_FILE, []); }
function getModerationHistory() { return loadData(MODERATION_FILE, []); }
function getSettings() { return loadData(SETTINGS_FILE, {}); }

// Сохранение конкретных данных
function saveUsers(users) { return saveData(USERS_FILE, users); }
function saveChats(chats) { return saveData(CHATS_FILE, chats); }
function saveRatings(ratings) { return saveData(RATINGS_FILE, ratings); }
function saveNotifications(notifications) { return saveData(NOTIFICATIONS_FILE, notifications); }
function saveModerationHistory(history) { return saveData(MODERATION_FILE, history); }
function saveSettings(settings) { return saveData(SETTINGS_FILE, settings); }

// Инициализация пользователей
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
        }
    ];

    let hasChanges = false;
    
    defaultUsers.forEach(defaultUser => {
        const exists = users.find(u => u.username === defaultUser.username);
        if (!exists) {
            users.push(defaultUser);
            hasChanges = true;
        }
    });

    if (hasChanges) {
        saveUsers(users);
    }
}

// Утилиты
function generateId() {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

function getUserBySocketId(socketId) {
    const users = getUsers();
    return users.find(u => u.socketId === socketId);
}

function getUserById(userId) {
    const users = getUsers();
    return users.find(u => u.id === userId);
}

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

// Функции синхронизации
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

// Очистка старых медиафайлов
function cleanupOldMedia() {
    const uploadsDir = './uploads';
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

// Запуск очистки каждые 6 часов
setInterval(cleanupOldMedia, 6 * 60 * 60 * 1000);

// Инициализация
initializeFiles();
initializeUsers();
cleanupOldMedia();

// Socket.IO обработчики
io.on('connection', (socket) => {
    console.log(`🔗 Новое подключение: ${socket.id}`);

    // Восстановление сессии
    socket.on('restore_session', (data) => {
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
            
            broadcastToAll('users_list', { users: getUsers().map(u => {
                const { password, socketId, ...publicUser } = u;
                return publicUser;
            })});
        }
    });

    // Вход
    socket.on('login', (data) => {
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
        broadcastToAll('users_list', { users: getUsers().map(u => {
            const { password, socketId, ...publicUser } = u;
            return publicUser;
        })});
    });

    // Регистрация
    socket.on('register', (data) => {
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
        saveUsers(users);
        
        socket.emit('registration_success', { user: newUser });
        broadcastToAll('users_list', { users: users.map(u => {
            const { password, socketId, ...publicUser } = u;
            return publicUser;
        })});
    });

    // Обновление профиля
    socket.on('update_profile', (data) => {
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
            broadcastToAll('users_list', { users: getUsers().map(u => {
                const { password, socketId, ...publicUser } = u;
                return publicUser;
            })});
        }
    });

    // Добавление сотрудника
    socket.on('register_staff', (data) => {
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
        saveUsers(users);
        
        socket.emit('staff_registered', { user: newStaff });
        broadcastToAll('users_list', { users: users.map(u => {
            const { password, socketId, ...publicUser } = u;
            return publicUser;
        })});
    });

    // Смена роли
    socket.on('change_role', (data) => {
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
            broadcastToAll('users_list', { users: getUsers().map(u => {
                const { password, socketId, ...publicUser } = u;
                return publicUser;
            })});
        }
    });

    // Создание чата
    socket.on('create_chat', (data) => {
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
        
        // Уведомляем слушателя
        if (user2Data.socketId) {
            const listenerSocket = io.sockets.sockets.get(user2Data.socketId);
            if (listenerSocket) {
                listenerSocket.emit('chat_created', { 
                    chat: newChat, 
                    userName: user1Data.displayName 
                });
            }
        }
        
        broadcastToAll('chats_list', { chats });
    });

    // Отправка сообщения
    socket.on('send_message', (data) => {
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
            fileUrl: message.fileUrl
        };

        chat.messages.push(newMessage);
        chat.lastActivity = new Date().toISOString();
        saveChats(chats);

        const targetUserId = message.senderId === chat.user1 ? chat.user2 : chat.user1;
        const targetUser = getUserById(targetUserId);
        
        // Отправляем сообщение второму участнику
        if (targetUser && targetUser.socketId) {
            const targetSocket = io.sockets.sockets.get(targetUser.socketId);
            if (targetSocket) {
                targetSocket.emit('new_message', { chatId, message: newMessage });
            }
        }
        
        broadcastToAll('chats_list', { chats });
    });

    // Завершение чата
    socket.on('end_chat', (data) => {
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
        
        // Уведомляем второго участника
        const user2 = getUserById(chat.user2);
        if (user2 && user2.socketId) {
            const targetSocket = io.sockets.sockets.get(user2.socketId);
            if (targetSocket) {
                targetSocket.emit('chat_ended', { chatId });
            }
        }
        
        broadcastToAll('chats_list', { chats });
    });

    // Оценка
    socket.on('submit_rating', (data) => {
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

        broadcastToAll('ratings_list', { ratings });
        broadcastToAll('users_list', { users: getUsers().map(u => {
            const { password, socketId, ...publicUser } = u;
            return publicUser;
        })});
    });

    // Отключение
    socket.on('disconnect', () => {
        const user = getUserBySocketId(socket.id);
        if (user) {
            updateUser(user.id, {
                isOnline: false,
                socketId: null
            });
            
            broadcastToAll('users_list', { users: getUsers().map(u => {
                const { password, socketId, ...publicUser } = u;
                return publicUser;
            })});
        }
    });

    // Запросы данных
    socket.on('get_users', () => {
        socket.emit('users_list', { users: getUsers().map(u => {
            const { password, socketId, ...publicUser } = u;
            return publicUser;
        })});
    });

    socket.on('get_chats', () => {
        socket.emit('chats_list', { chats: getChats() });
    });

    socket.on('get_ratings', () => {
        socket.emit('ratings_list', { ratings: getRatings() });
    });

    socket.on('get_notifications', () => {
        socket.emit('notifications_list', { notifications: getNotifications() });
    });

    socket.on('get_moderation_history', () => {
        socket.emit('moderation_history', { history: getModerationHistory() });
    });

    socket.on('get_settings', () => {
        socket.emit('settings_data', { settings: getSettings() });
    });
});

// API для загрузки файлов
app.post('/api/upload', upload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Файл не загружен' });
        }

        const fileUrl = `/uploads/${req.file.filename}`;
        res.json({ 
            success: true, 
            fileUrl: fileUrl,
            fileName: req.file.originalname
        });
    } catch (error) {
        res.status(500).json({ error: 'Ошибка загрузки файла' });
    }
});

// API маршруты
app.get('/api/users', (req, res) => {
    res.json(getUsers());
});

app.get('/api/chats', (req, res) => {
    res.json(getChats());
});

app.get('/api/ratings', (req, res) => {
    res.json(getRatings());
});

app.get('/api/notifications', (req, res) => {
    res.json(getNotifications());
});

app.get('/api/moderation', (req, res) => {
    res.json(getModerationHistory());
});

app.get('/api/stats', (req, res) => {
    const users = getUsers();
    const chats = getChats();
    
    const stats = {
        totalUsers: users.length,
        totalListeners: users.filter(u => u.role === 'listener').length,
        activeChats: chats.filter(c => c.isActive).length,
        onlineUsers: users.filter(u => u.isOnline).length,
        totalMessages: chats.reduce((sum, chat) => sum + (chat.messages?.length || 0), 0)
    };
    res.json(stats);
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Сервер запущен на порту ${PORT}`);
});
