const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Middleware
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Файлы данных
const DATA_DIR = './data';
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const CHATS_FILE = path.join(DATA_DIR, 'chats.json');
const RATINGS_FILE = path.join(DATA_DIR, 'ratings.json');
const NOTIFICATIONS_FILE = path.join(DATA_DIR, 'notifications.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

// Инициализация файлов
function initDataFiles() {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR);
    }

    const defaultFiles = {
        [USERS_FILE]: [
            {
                id: '1',
                username: 'owner',
                password: 'owner2024',
                role: 'owner',
                displayName: 'Владелец',
                avatar: '👑',
                email: 'owner@system.com',
                rating: 5,
                ratingCount: 0,
                isOnline: false,
                socketId: null,
                createdAt: new Date().toISOString(),
                lastSeen: new Date().toISOString(),
                settings: { theme: 'light', notifications: true, sound: true }
            },
            {
                id: '2',
                username: 'admin',
                password: 'admin123',
                role: 'admin',
                displayName: 'Администратор',
                avatar: '⚙️',
                email: 'admin@system.com',
                rating: 5,
                ratingCount: 0,
                isOnline: false,
                socketId: null,
                createdAt: new Date().toISOString(),
                lastSeen: new Date().toISOString(),
                settings: { theme: 'light', notifications: true, sound: true }
            },
            {
                id: '3',
                username: 'user',
                password: '123456',
                role: 'user',
                displayName: 'Пользователь',
                avatar: '👤',
                email: 'user@test.com',
                rating: 0,
                ratingCount: 0,
                isOnline: false,
                socketId: null,
                createdAt: new Date().toISOString(),
                lastSeen: new Date().toISOString(),
                settings: { theme: 'light', notifications: true, sound: true }
            },
            {
                id: '4',
                username: 'listener',
                password: '123456',
                role: 'listener',
                displayName: 'Анна Слушатель',
                avatar: '🎧',
                email: 'listener@test.com',
                rating: 4.8,
                ratingCount: 15,
                isOnline: false,
                socketId: null,
                createdAt: new Date().toISOString(),
                lastSeen: new Date().toISOString(),
                settings: { theme: 'light', notifications: true, sound: true }
            }
        ],
        [CHATS_FILE]: [],
        [RATINGS_FILE]: [],
        [NOTIFICATIONS_FILE]: [],
        [SETTINGS_FILE]: {
            siteTitle: "Система поддержки",
            theme: "light",
            maxChatDuration: 60,
            allowUserRegistration: true
        }
    };

    Object.entries(defaultFiles).forEach(([filePath, defaultData]) => {
        if (!fs.existsSync(filePath)) {
            fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2));
            console.log(`✅ Создан файл: ${path.basename(filePath)}`);
        }
    });
}

// Функции работы с данными
function readJSON(filePath) {
    try {
        if (fs.existsSync(filePath)) {
            const data = fs.readFileSync(filePath, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error(`❌ Ошибка чтения ${filePath}:`, error);
    }
    return null;
}

function writeJSON(filePath, data) {
    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error(`❌ Ошибка записи ${filePath}:`, error);
        return false;
    }
}

// Глобальные данные
let users = [];
let chats = [];
let ratings = [];
let notifications = [];
let settings = {};

function loadAllData() {
    users = readJSON(USERS_FILE) || [];
    chats = readJSON(CHATS_FILE) || [];
    ratings = readJSON(RATINGS_FILE) || [];
    notifications = readJSON(NOTIFICATIONS_FILE) || [];
    settings = readJSON(SETTINGS_FILE) || {};
    console.log('📊 Данные загружены:', { 
        users: users.length, 
        chats: chats.length, 
        ratings: ratings.length,
        notifications: notifications.length 
    });
}

function saveAllData() {
    writeJSON(USERS_FILE, users);
    writeJSON(CHATS_FILE, chats);
    writeJSON(RATINGS_FILE, ratings);
    writeJSON(NOTIFICATIONS_FILE, notifications);
    writeJSON(SETTINGS_FILE, settings);
}

// Вспомогательные функции
function generateId() {
    return Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}

function getUserById(id) {
    return users.find(u => u.id === id);
}

function getUserBySocketId(socketId) {
    return users.find(u => u.socketId === socketId);
}

function getUserByUsername(username) {
    return users.find(u => u.username === username);
}

function updateUser(id, updates) {
    const userIndex = users.findIndex(u => u.id === id);
    if (userIndex !== -1) {
        users[userIndex] = { ...users[userIndex], ...updates };
        writeJSON(USERS_FILE, users);
        return users[userIndex];
    }
    return null;
}

function getUserChats(userId) {
    return chats.filter(chat => 
        chat.user1 === userId || chat.user2 === userId
    );
}

// Socket.IO обработчики
io.on('connection', (socket) => {
    console.log('🔗 Подключение:', socket.id);

    // Вход в систему
    socket.on('login', (data) => {
        console.log('🚪 Попытка входа:', data.username);
        
        const { username, password } = data;
        
        if (!username || !password) {
            socket.emit('login_error', 'Заполните все поля');
            return;
        }

        const user = getUserByUsername(username);
        
        // ВАЖНО: Правильная проверка пароля
        if (!user || user.password !== password) {
            console.log('❌ Неверный логин/пароль:', { username, exists: !!user });
            socket.emit('login_error', 'Неверный логин или пароль');
            return;
        }

        // Обновляем статус пользователя
        user.isOnline = true;
        user.socketId = socket.id;
        user.lastSeen = new Date().toISOString();
        writeJSON(USERS_FILE, users);

        console.log('✅ Успешный вход:', user.username);

        // Отправляем данные пользователю
        socket.emit('login_success', { 
            user: { ...user, password: undefined }, // Не отправляем пароль
            settings 
        });

        // Отправляем списки данных
        if (user.role === 'admin' || user.role === 'owner') {
            socket.emit('users_list', { users: users.filter(u => u.id !== user.id) });
            socket.emit('chats_list', { chats });
        } else {
            socket.emit('users_list', { 
                users: users.filter(u => 
                    (u.role === 'listener' || u.role === 'admin') && u.id !== user.id
                ) 
            });
            socket.emit('chats_list', { chats: getUserChats(user.id) });
        }

        socket.emit('ratings_list', { ratings });
        socket.emit('notifications_list', { notifications });

        // Уведомляем других пользователей
        socket.broadcast.emit('user_connected', { user: { ...user, password: undefined } });
    });

    // Регистрация
    socket.on('register', (data) => {
        console.log('📝 Регистрация:', data.username);
        
        const { username, password, displayName, email } = data;
        
        if (!username || !password) {
            socket.emit('registration_error', 'Заполните все поля');
            return;
        }

        if (getUserByUsername(username)) {
            socket.emit('registration_error', 'Пользователь уже существует');
            return;
        }

        const newUser = {
            id: generateId(),
            username,
            password,
            role: 'user',
            displayName: displayName || username,
            avatar: '👤',
            email: email || '',
            rating: 0,
            ratingCount: 0,
            isOnline: true,
            socketId: socket.id,
            createdAt: new Date().toISOString(),
            lastSeen: new Date().toISOString(),
            settings: { theme: 'light', notifications: true, sound: true }
        };

        users.push(newUser);
        writeJSON(USERS_FILE, users);

        console.log('✅ Новый пользователь:', username);

        socket.emit('registration_success', { 
            user: { ...newUser, password: undefined },
            settings 
        });

        // Отправляем данные
        socket.emit('users_list', { 
            users: users.filter(u => 
                (u.role === 'listener' || u.role === 'admin') && u.id !== newUser.id
            ) 
        });
        socket.emit('chats_list', { chats: getUserChats(newUser.id) });
        socket.emit('ratings_list', { ratings });
        socket.emit('notifications_list', { notifications });

        socket.broadcast.emit('user_connected', { user: { ...newUser, password: undefined } });
    });

    // Восстановление сессии
    socket.on('restore_session', (data) => {
        console.log('🔄 Восстановление сессии:', data.userId);
        
        const user = getUserById(data.userId);
        if (user) {
            user.isOnline = true;
            user.socketId = socket.id;
            user.lastSeen = new Date().toISOString();
            writeJSON(USERS_FILE, users);

            socket.emit('session_restored', { 
                user: { ...user, password: undefined },
                settings 
            });

            // Отправляем актуальные данные
            if (user.role === 'admin' || user.role === 'owner') {
                socket.emit('users_list', { users: users.filter(u => u.id !== user.id) });
                socket.emit('chats_list', { chats });
            } else {
                socket.emit('users_list', { 
                    users: users.filter(u => 
                        (u.role === 'listener' || u.role === 'admin') && u.id !== user.id
                    ) 
                });
                socket.emit('chats_list', { chats: getUserChats(user.id) });
            }

            socket.emit('ratings_list', { ratings });
            socket.emit('notifications_list', { notifications });

            socket.broadcast.emit('user_connected', { user: { ...user, password: undefined } });
        } else {
            socket.emit('session_restored', { error: 'Сессия не найдена' });
        }
    });

    // Получение данных
    socket.on('get_users', () => {
        const user = getUserBySocketId(socket.id);
        if (user) {
            if (user.role === 'admin' || user.role === 'owner') {
                socket.emit('users_list', { users: users.filter(u => u.id !== user.id) });
            } else {
                socket.emit('users_list', { 
                    users: users.filter(u => 
                        (u.role === 'listener' || u.role === 'admin') && u.id !== user.id
                    ) 
                });
            }
        }
    });

    socket.on('get_chats', () => {
        const user = getUserBySocketId(socket.id);
        if (user) {
            if (user.role === 'admin' || user.role === 'owner') {
                socket.emit('chats_list', { chats });
            } else {
                socket.emit('chats_list', { chats: getUserChats(user.id) });
            }
        }
    });

    // Создание чата
    socket.on('create_chat', (data) => {
        console.log('💬 Создание чата:', data);
        
        const user = getUserBySocketId(socket.id);
        const listener = getUserById(data.listenerId);
        
        if (!user || !listener) {
            socket.emit('chat_error', 'Пользователь не найден');
            return;
        }

        // Проверяем существующий активный чат
        const existingChat = chats.find(chat => 
            chat.isActive && 
            ((chat.user1 === user.id && chat.user2 === listener.id) || 
             (chat.user1 === listener.id && chat.user2 === user.id))
        );

        if (existingChat) {
            socket.emit('chat_exists', { chat: existingChat });
            return;
        }

        const newChat = {
            id: generateId(),
            user1: user.id,
            user2: listener.id,
            messages: [],
            startTime: new Date().toISOString(),
            isActive: true,
            lastActivity: new Date().toISOString()
        };

        chats.push(newChat);
        writeJSON(CHATS_FILE, chats);

        console.log('✅ Создан чат:', user.username, '->', listener.username);

        // Уведомляем участников
        [user, listener].forEach(participant => {
            if (participant.socketId) {
                io.to(participant.socketId).emit('chat_created', { 
                    chat: newChat,
                    partner: participant.id === user.id ? listener : user
                });
                io.to(participant.socketId).emit('chats_list', { 
                    chats: getUserChats(participant.id) 
                });
            }
        });
    });

    // Отправка сообщения
    socket.on('send_message', (data) => {
        console.log('📨 Сообщение в чат:', data.chatId);
        
        const user = getUserBySocketId(socket.id);
        const chat = chats.find(c => c.id === data.chatId);
        
        if (!user || !chat) {
            socket.emit('message_error', 'Чат не найден');
            return;
        }

        if (!chat.messages) chat.messages = [];

        const newMessage = {
            id: generateId(),
            text: data.message.text,
            senderId: user.id,
            timestamp: new Date().toISOString(),
            read: false
        };

        chat.messages.push(newMessage);
        chat.lastActivity = new Date().toISOString();
        writeJSON(CHATS_FILE, chats);

        // Отправляем сообщение участникам чата
        const participants = [chat.user1, chat.user2];
        participants.forEach(participantId => {
            const participant = getUserById(participantId);
            if (participant && participant.socketId) {
                io.to(participant.socketId).emit('new_message', {
                    chatId: chat.id,
                    message: newMessage
                });
                io.to(participant.socketId).emit('chats_list', {
                    chats: getUserChats(participant.id)
                });
            }
        });
    });

    // Добавление персонала
    socket.on('register_staff', (data) => {
        console.log('➕ Добавление персонала:', data.username);
        
        const admin = getUserBySocketId(socket.id);
        
        if (!admin || (admin.role !== 'admin' && admin.role !== 'owner')) {
            socket.emit('staff_add_error', 'Недостаточно прав');
            return;
        }

        const { username, password, displayName, role, email } = data;

        if (getUserByUsername(username)) {
            socket.emit('staff_add_error', 'Пользователь уже существует');
            return;
        }

        const newStaff = {
            id: generateId(),
            username,
            password,
            role: role || 'listener',
            displayName: displayName || username,
            avatar: role === 'admin' ? '⚙️' : '🎧',
            email: email || '',
            rating: 0,
            ratingCount: 0,
            isOnline: false,
            socketId: null,
            createdAt: new Date().toISOString(),
            lastSeen: new Date().toISOString(),
            settings: { theme: 'light', notifications: true, sound: true }
        };

        users.push(newStaff);
        writeJSON(USERS_FILE, users);

        console.log('✅ Добавлен персонал:', username);

        // Уведомляем всех администраторов
        users.filter(u => u.role === 'admin' || u.role === 'owner').forEach(adminUser => {
            if (adminUser.socketId) {
                io.to(adminUser.socketId).emit('staff_added', { user: newStaff });
                io.to(adminUser.socketId).emit('users_list', { 
                    users: users.filter(u => u.id !== adminUser.id) 
                });
            }
        });

        socket.emit('staff_added', { user: newStaff });
    });

    // Обновление профиля
    socket.on('update_profile', (data) => {
        const user = getUserBySocketId(socket.id);
        if (!user) return;

        const updates = {};
        if (data.displayName) updates.displayName = data.displayName;
        if (data.email) updates.email = data.email;
        if (data.avatar) updates.avatar = data.avatar;
        if (data.settings) updates.settings = { ...user.settings, ...data.settings };
        if (data.password) updates.password = data.password;

        const updatedUser = updateUser(user.id, updates);
        
        if (updatedUser) {
            socket.emit('profile_updated', { user: { ...updatedUser, password: undefined } });
            socket.broadcast.emit('user_updated', { user: { ...updatedUser, password: undefined } });
        }
    });

    // Отключение
    socket.on('disconnect', () => {
        console.log('🔌 Отключение:', socket.id);
        
        const user = getUserBySocketId(socket.id);
        if (user) {
            user.isOnline = false;
            user.socketId = null;
            user.lastSeen = new Date().toISOString();
            writeJSON(USERS_FILE, users);

            socket.broadcast.emit('user_disconnected', { userId: user.id });
        }
    });
});

// API routes
app.get('/api/users', (req, res) => {
    res.json(users.map(u => ({ ...u, password: undefined })));
});

app.get('/api/stats', (req, res) => {
    const stats = {
        totalUsers: users.filter(u => u.role === 'user').length,
        totalListeners: users.filter(u => u.role === 'listener').length,
        activeChats: chats.filter(c => c.isActive).length,
        onlineUsers: users.filter(u => u.isOnline).length
    };
    res.json(stats);
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Запуск сервера
initDataFiles();
loadAllData();

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Сервер запущен на порту ${PORT}`);
    console.log(`📊 Загружено: ${users.length} пользователей, ${chats.length} чатов`);
    console.log(`🔐 Тестовые аккаунты:`);
    console.log(`   👑 Владелец: owner / owner2024`);
    console.log(`   ⚙️ Админ: admin / admin123`);
    console.log(`   👤 Пользователь: user / 123456`);
    console.log(`   🎧 Слушатель: listener / 123456`);
    console.log(`🌐 http://localhost:${PORT}`);
});
