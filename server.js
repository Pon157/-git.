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

app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const DATA_DIR = './data';
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const CHATS_FILE = path.join(DATA_DIR, 'chats.json');
const RATINGS_FILE = path.join(DATA_DIR, 'ratings.json');
const NOTIFICATIONS_FILE = path.join(DATA_DIR, 'notifications.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

function ensureDataDirectory() {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }
}

function initializeFiles() {
    ensureDataDirectory();
    
    const files = [
        { name: USERS_FILE, default: [] },
        { name: CHATS_FILE, default: [] },
        { name: RATINGS_FILE, default: [] },
        { name: NOTIFICATIONS_FILE, default: [] },
        { name: SETTINGS_FILE, default: {
            siteTitle: "Система поддержки",
            theme: "light",
            maxChatDuration: 60,
            allowUserRegistration: true
        }}
    ];

    files.forEach(file => {
        if (!fs.existsSync(file.name)) {
            fs.writeFileSync(file.name, JSON.stringify(file.default, null, 2));
        }
    });
}

function loadData(filename, defaultValue = []) {
    try {
        if (fs.existsSync(filename)) {
            const data = fs.readFileSync(filename, 'utf8');
            return data ? JSON.parse(data) : defaultValue;
        }
    } catch (error) {
        console.error(`Ошибка загрузки ${filename}:`, error);
    }
    return defaultValue;
}

function saveData(filename, data) {
    try {
        fs.writeFileSync(filename, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error(`Ошибка сохранения ${filename}:`, error);
        return false;
    }
}

function getUsers() { return loadData(USERS_FILE, []); }
function getChats() { return loadData(CHATS_FILE, []); }
function getRatings() { return loadData(RATINGS_FILE, []); }
function getNotifications() { return loadData(NOTIFICATIONS_FILE, []); }
function getSettings() { return loadData(SETTINGS_FILE, {}); }

function saveUsers(users) { return saveData(USERS_FILE, users); }
function saveChats(chats) { return saveData(CHATS_FILE, chats); }
function saveRatings(ratings) { return saveData(RATINGS_FILE, ratings); }
function saveNotifications(notifications) { return saveData(NOTIFICATIONS_FILE, notifications); }
function saveSettings(settings) { return saveData(SETTINGS_FILE, settings); }

function initializeUsers() {
    let users = getUsers();
    
    const defaultUsers = [
        {
            id: '1',
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
            id: '2',
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
            id: '3',
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
            id: '4', 
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

console.log('Инициализация системы...');
initializeFiles();
initializeUsers();

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

// Socket.IO соединения
io.on('connection', (socket) => {
    console.log(`Новое подключение: ${socket.id}`);

    // ВХОД С ПРАВИЛЬНОЙ ПРОВЕРКОЙ
    socket.on('login', (data) => {
        console.log(`Запрос на вход:`, data.username);
        
        const users = getUsers();
        const { username, password } = data;
        
        if (!username || !password) {
            socket.emit('login_error', 'Логин и пароль обязательны');
            return;
        }
        
        const user = users.find(u => u.username === username);
        
        // ПРАВИЛЬНАЯ ПРОВЕРКА ПАРОЛЯ
        if (!user || user.password !== password) {
            console.log('Неверный логин/пароль:', username);
            socket.emit('login_error', 'Неверный логин или пароль');
            return;
        }

        // Обновляем статус
        updateUser(user.id, {
            isOnline: true,
            socketId: socket.id
        });

        const currentUsers = getUsers();
        const currentChats = getChats();
        const currentRatings = getRatings();
        const currentNotifications = getNotifications();

        socket.emit('login_success', { user });
        
        // ОТПРАВЛЯЕМ ТОЛЬКО НУЖНЫЕ ДАННЫЕ
        if (user.role === 'admin' || user.role === 'owner') {
            socket.emit('users_list', { users: currentUsers });
            socket.emit('chats_list', { chats: currentChats });
        } else {
            socket.emit('users_list', { 
                users: currentUsers.filter(u => u.role === 'listener' || u.role === 'admin') 
            });
            socket.emit('chats_list', { 
                chats: currentChats.filter(chat => 
                    chat.user1 === user.id || chat.user2 === user.id
                )
            });
        }
        
        socket.emit('ratings_list', { ratings: currentRatings });
        socket.emit('notifications_list', { notifications: currentNotifications });
        
        socket.broadcast.emit('user_connected', { user });
        console.log(`Успешный вход: ${username} (${user.role})`);
    });

    // РЕГИСТРАЦИЯ
    socket.on('register', (data) => {
        console.log(`Запрос на регистрацию:`, data.username);
        
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
            
            const currentUsers = getUsers();
            const currentChats = getChats();
            const currentRatings = getRatings();
            
            socket.emit('users_list', { 
                users: currentUsers.filter(u => u.role === 'listener' || u.role === 'admin') 
            });
            
            socket.emit('chats_list', { 
                chats: currentChats 
            });
            
            socket.emit('ratings_list', { 
                ratings: currentRatings 
            });
            
            socket.broadcast.emit('user_connected', { user: newUser });
        } else {
            socket.emit('registration_error', 'Ошибка сохранения пользователя');
        }
    });

    // ВОССТАНОВЛЕНИЕ СЕССИИ
    socket.on('restore_session', (data) => {
        console.log(`Восстановление сессии:`, data.userId);
        
        const user = getUserById(data.userId);
        
        if (user) {
            updateUser(user.id, {
                isOnline: true,
                socketId: socket.id
            });
            
            const currentUsers = getUsers();
            const currentChats = getChats();
            const currentRatings = getRatings();
            const currentNotifications = getNotifications();
            
            socket.emit('session_restored', { 
                success: true,
                user: user 
            });
            
            if (user.role === 'admin' || user.role === 'owner') {
                socket.emit('users_list', { users: currentUsers });
                socket.emit('chats_list', { chats: currentChats });
            } else {
                socket.emit('users_list', { 
                    users: currentUsers.filter(u => u.role === 'listener' || u.role === 'admin') 
                });
                socket.emit('chats_list', { 
                    chats: currentChats.filter(chat => 
                        chat.user1 === user.id || chat.user2 === user.id
                    )
                });
            }
            
            socket.emit('ratings_list', { ratings: currentRatings });
            socket.emit('notifications_list', { notifications: currentNotifications });
            
            socket.broadcast.emit('user_connected', { user });
        } else {
            socket.emit('session_restored', { 
                success: false,
                error: 'Пользователь не найден'
            });
        }
    });

    // ДОБАВЛЕНИЕ СОТРУДНИКА
    socket.on('register_staff', (data) => {
        console.log(`Добавление сотрудника:`, data);
        
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
            createdAt: new Date().toISOString()
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
        console.log(`Изменение роли:`, data);
        
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

    // СОЗДАНИЕ ЧАТА
    socket.on('create_chat', (data) => {
        console.log(`Создание чата:`, data);
        
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
            isActive: true
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
    });

    // ОТПРАВКА СООБЩЕНИЯ
    socket.on('send_message', (data) => {
        console.log(`Отправка сообщения:`, data);
        
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
            timestamp: new Date().toISOString()
        };

        chat.messages.push(newMessage);
        saveChats(chats);

        const targetUserId = message.senderId === chat.user1 ? chat.user2 : chat.user1;
        const targetUser = getUserById(targetUserId);
        
        if (targetUser && targetUser.socketId) {
            const targetSocket = io.sockets.sockets.get(targetUser.socketId);
            if (targetSocket) {
                targetSocket.emit('new_message', { chatId, message: newMessage });
            }
        }
    });

    // ОЦЕНКА
    socket.on('submit_rating', (data) => {
        console.log(`Оценка:`, data);
        
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

    // ЗАВЕРШЕНИЕ ЧАТА
    socket.on('end_chat', (data) => {
        console.log(`Завершение чата:`, data);
        
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
    });

    // ОТКЛЮЧЕНИЕ
    socket.on('disconnect', (reason) => {
        console.log(`Отключение: ${socket.id}`);
        
        const user = getUserBySocketId(socket.id);
        if (user) {
            updateUser(user.id, {
                isOnline: false,
                socketId: null
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
        onlineUsers: users.filter(u => u.isOnline).length
    };
    res.json(stats);
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    const users = getUsers();
    console.log(`Сервер запущен на порту ${PORT}`);
    console.log(`Пользователей: ${users.length}`);
    console.log(`Аккаунты для входа:`);
    console.log(`   Владелец: owner / owner2024`);
    console.log(`   Админ: admin / admin123`);
    console.log(`   Пользователь: user / 123456`);
    console.log(`   Слушатель: listener / 123456`);
    console.log(`URL: http://localhost:${PORT}`);
});
