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
const USERS_FILE = 'users.json';
const CHATS_FILE = 'chats.json';
const RATINGS_FILE = 'ratings.json';
const NOTIFICATIONS_FILE = 'notifications.json';

// Создание файлов если их нет
function initializeFiles() {
    const files = [
        { name: USERS_FILE, default: [] },
        { name: CHATS_FILE, default: [] },
        { name: RATINGS_FILE, default: [] },
        { name: NOTIFICATIONS_FILE, default: [] }
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

// ВСЕГДА загружаем свежие данные из файлов
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

// Сохранение с синхронизацией
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

// Инициализация демо-пользователей
function initializeDemoUsers() {
    let users = getUsers();
    
    const demoUsers = [
        {
            id: 'demo-user-1',
            username: 'user',
            password: '123456',
            role: 'user',
            displayName: 'Пользователь',
            avatar: '👤',
            rating: 0,
            ratingCount: 0,
            isOnline: false,
            socketId: null,
            createdAt: new Date().toISOString()
        },
        {
            id: 'demo-user-2', 
            username: 'listener',
            password: '123456',
            role: 'listener',
            displayName: 'Анна',
            avatar: '🎧',
            rating: 4.8,
            ratingCount: 15,
            isOnline: false,
            socketId: null,
            createdAt: new Date().toISOString()
        },
        {
            id: 'demo-user-3',
            username: 'admin',
            password: 'admin123', 
            role: 'admin',
            displayName: 'Администратор',
            avatar: '👑',
            rating: 5.0,
            ratingCount: 8,
            isOnline: false,
            socketId: null,
            createdAt: new Date().toISOString()
        }
    ];

    let hasChanges = false;
    
    demoUsers.forEach(demoUser => {
        const exists = users.find(u => u.username === demoUser.username);
        if (!exists) {
            users.push(demoUser);
            hasChanges = true;
            console.log(`✅ Добавлен демо-пользователь: ${demoUser.username}`);
        }
    });

    if (hasChanges) {
        saveUsers(users);
    }
}

// Инициализация файлов и демо-пользователей
console.log('🔄 Инициализация файлов...');
initializeFiles();
console.log('🔄 Инициализация демо-пользователей...');
initializeDemoUsers();

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

// Socket.IO соединения
io.on('connection', (socket) => {
    console.log(`🔗 Новое подключение: ${socket.id}`);
    
    // Отправляем тестовое сообщение при подключении
    socket.emit('connected', { 
        message: 'Подключение к серверу установлено',
        socketId: socket.id,
        timestamp: new Date().toISOString()
    });

    // ВОССТАНОВЛЕНИЕ СЕССИИ
    socket.on('restore_session', (data) => {
        console.log(`🔄 Попытка восстановления сессии:`, data);
        
        const user = getUserById(data.userId);
        
        if (user) {
            // Обновляем статус пользователя
            updateUser(user.id, {
                isOnline: true,
                socketId: socket.id
            });
            
            // Загружаем актуальные данные
            const currentUsers = getUsers();
            const currentChats = getChats();
            const currentRatings = getRatings();
            const currentNotifications = getNotifications();
            
            socket.emit('session_restored', { 
                success: true,
                user: user 
            });
            
            socket.emit('users_list', { 
                users: currentUsers.filter(u => u.id !== user.id) 
            });
            
            // Для админа показываем все чаты, для остальных - только свои
            if (user.role === 'admin') {
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
            
            // Уведомляем других о подключении
            socket.broadcast.emit('user_connected', { user });
            console.log(`🔄 Сессия восстановлена: ${user.username}`);
        } else {
            console.log(`❌ Пользователь не найден для восстановления сессии`);
            socket.emit('session_restored', { 
                success: false,
                error: 'Пользователь не найден'
            });
        }
    });

    // РЕГИСТРАЦИЯ
    socket.on('register', (data) => {
        console.log(`📝 Запрос на регистрацию:`, data);
        
        const users = getUsers();
        const { username, password, role = 'user', displayName } = data;
        
        // Валидация
        if (!username || !password) {
            socket.emit('registration_error', 'Логин и пароль обязательны');
            return;
        }

        // Проверяем существование пользователя
        const existingUser = users.find(u => u.username === username);
        if (existingUser) {
            socket.emit('registration_error', 'Пользователь с таким логином уже существует');
            console.log(`❌ Регистрация failed: пользователь ${username} уже существует`);
            return;
        }

        // Создаем нового пользователя
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
            
            // Отправляем актуальные данные
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
            
            // Уведомляем всех о новом пользователе
            socket.broadcast.emit('user_connected', { user: newUser });
            console.log(`✅ Новый пользователь зарегистрирован: ${username} (ID: ${newUser.id})`);
        } else {
            socket.emit('registration_error', 'Ошибка сохранения пользователя');
            console.log(`❌ Ошибка сохранения пользователя: ${username}`);
        }
    });

    // ВХОД
    socket.on('login', (data) => {
        console.log(`🚪 Запрос на вход:`, data);
        
        const users = getUsers();
        const { username, password } = data;
        
        // Валидация
        if (!username || !password) {
            socket.emit('login_error', 'Логин и пароль обязательны');
            return;
        }
        
        const user = users.find(u => u.username === username && u.password === password);
        if (!user) {
            socket.emit('login_error', 'Неверный логин или пароль');
            console.log(`❌ Ошибка входа: неверные данные для ${username}`);
            return;
        }

        // Обновляем статус пользователя
        updateUser(user.id, {
            isOnline: true,
            socketId: socket.id
        });

        // Загружаем актуальные данные для отправки
        const currentUsers = getUsers();
        const currentChats = getChats();
        const currentRatings = getRatings();
        const currentNotifications = getNotifications();

        // Отправляем успешный вход
        socket.emit('login_success', { user });
        
        // Отправляем актуальные данные
        socket.emit('users_list', { 
            users: currentUsers.filter(u => u.id !== user.id) 
        });
        
        // Для админа показываем все чаты, для остальных - только свои
        if (user.role === 'admin') {
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
        
        // Уведомляем других о подключении
        socket.broadcast.emit('user_connected', { user });
        console.log(`✅ Успешный вход: ${username} (ID: ${user.id})`);
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
            console.log(`✅ Профиль обновлен: ${user.username}`);
        } else {
            socket.emit('profile_update_error', 'Ошибка обновления профиля');
        }
    });

    // ДОБАВЛЕНИЕ СОТРУДНИКА
    socket.on('register_staff', (data) => {
        console.log(`➕ Добавление сотрудника:`, data);
        
        const users = getUsers();
        const { username, password, displayName, role } = data;
        
        // Проверяем существование пользователя
        const existingUser = users.find(u => u.username === username);
        if (existingUser) {
            socket.emit('staff_add_error', 'Пользователь с таким логином уже существует');
            return;
        }

        // Создаем нового сотрудника
        const newStaff = {
            id: generateId(),
            username,
            password,
            role: role || 'listener',
            displayName: displayName || username,
            avatar: role === 'admin' ? '👑' : '🎧',
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
            console.log(`✅ Сотрудник добавлен: ${username} (${role})`);
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
            avatar: newRole === 'admin' ? '👑' : newRole === 'listener' ? '🎧' : '👤'
        });
        
        if (updatedUser) {
            socket.emit('role_changed', { userId, newRole, user: updatedUser });
            socket.broadcast.emit('user_updated', { user: updatedUser });
            console.log(`✅ Роль изменена: ${user.username} -> ${newRole}`);
        } else {
            socket.emit('role_change_error', 'Ошибка изменения роли');
        }
    });

    // ОТПРАВКА ТЕХНИЧЕСКОГО УВЕДОМЛЕНИЯ
    socket.on('send_technical_notification', (data) => {
        console.log(`📢 Отправка технического уведомления:`, data);
        
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

        // Отправляем уведомление соответствующим пользователям
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
                targetUsers = users.filter(u => u.role === 'admin');
                break;
        }

        // Отправляем уведомление онлайн пользователям
        targetUsers.forEach(user => {
            if (user.socketId) {
                const userSocket = io.sockets.sockets.get(user.socketId);
                if (userSocket) {
                    userSocket.emit('new_notification', { notification: newNotification });
                }
            }
        });

        socket.emit('notification_sent', { success: true });
        console.log(`✅ Техническое уведомление отправлено: ${title}`);
    });

    // ПОЛУЧЕНИЕ ДАННЫХ
    socket.on('get_users', () => {
        console.log(`📊 Запрос списка пользователей от ${socket.id}`);
        const users = getUsers();
        socket.emit('users_list', { users });
    });

    socket.on('get_chats', () => {
        console.log(`💬 Запрос списка чатов от ${socket.id}`);
        const user = getUserBySocketId(socket.id);
        const chats = getChats();
        
        if (user && user.role === 'admin') {
            // Админ видит все чаты
            socket.emit('chats_list', { chats });
        } else if (user) {
            // Обычные пользователи видят только свои чаты
            const userChats = chats.filter(chat => 
                chat.user1 === user.id || chat.user2 === user.id
            );
            socket.emit('chats_list', { chats: userChats });
        } else {
            socket.emit('chats_list', { chats: [] });
        }
    });

    socket.on('get_ratings', () => {
        console.log(`⭐ Запрос списка оценок от ${socket.id}`);
        const ratings = getRatings();
        socket.emit('ratings_list', { ratings });
    });

    socket.on('get_notifications', () => {
        console.log(`📢 Запрос списка уведомлений от ${socket.id}`);
        const notifications = getNotifications();
        socket.emit('notifications_list', { notifications });
    });

    // СОЗДАНИЕ ЧАТА
    socket.on('create_chat', (data) => {
        console.log(`💬 Запрос создания чата:`, data);
        
        const users = getUsers();
        const chats = getChats();
        const { user1, user2 } = data;
        
        const user1Data = getUserById(user1);
        const user2Data = getUserById(user2);
        
        if (!user1Data || !user2Data) {
            socket.emit('chat_error', 'Пользователь не найден');
            console.log(`❌ Ошибка создания чата: пользователь не найден`);
            return;
        }

        // Проверяем, нет ли уже активного чата
        const existingChat = chats.find(chat => 
            chat.isActive && 
            ((chat.user1 === user1 && chat.user2 === user2) || 
             (chat.user1 === user2 && chat.user2 === user1))
        );

        if (existingChat) {
            socket.emit('chat_exists', { chat: existingChat });
            console.log(`💬 Чат уже существует: ${existingChat.id}`);
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

        // Отправляем чат обоим пользователям
        socket.emit('chat_created', { 
            chat: newChat, 
            listenerName: user2Data.displayName 
        });
        
        // Уведомляем слушателя о новом чате
        if (user2Data.socketId) {
            const listenerSocket = io.sockets.sockets.get(user2Data.socketId);
            if (listenerSocket) {
                listenerSocket.emit('chat_created', { 
                    chat: newChat, 
                    listenerName: user1Data.displayName 
                });
                console.log(`🔔 Уведомление отправлено слушателю: ${user2Data.username}`);
            }
        }

        console.log(`💬 Новый чат создан: ${user1Data.username} ↔ ${user2Data.username}`);
    });

    // ОТПРАВКА СООБЩЕНИЯ
    socket.on('send_message', (data) => {
        console.log(`📨 Отправка сообщения:`, data);
        
        const chats = getChats();
        const { chatId, message } = data;
        
        const chat = chats.find(c => c.id === chatId);
        if (!chat) {
            socket.emit('message_error', 'Чат не найден');
            console.log(`❌ Чат не найден: ${chatId}`);
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

        // Отправляем сообщение получателю (только одному разу!)
        const targetUserId = message.senderId === chat.user1 ? chat.user2 : chat.user1;
        const targetUser = getUserById(targetUserId);
        
        if (targetUser && targetUser.socketId) {
            const targetSocket = io.sockets.sockets.get(targetUser.socketId);
            if (targetSocket) {
                targetSocket.emit('new_message', { chatId, message: newMessage });
                console.log(`📨 Сообщение доставлено пользователю: ${targetUser.username}`);
            }
        }

        console.log(`📨 Новое сообщение в чате ${chatId} от ${message.senderId}`);
    });

    // ОЦЕНКА СЛУШАТЕЛЯ
    socket.on('submit_rating', (data) => {
        console.log(`⭐ Отправка оценки:`, data);
        
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

        // Обновляем рейтинг слушателя
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

        // Отправляем подтверждение отправителю
        socket.emit('rating_submitted', {
            listenerId,
            newRating: avgRating,
            ratingCount: listenerRatings.length
        });

        // Уведомляем слушателя об новом отзыве
        if (listener && listener.socketId) {
            const listenerSocket = io.sockets.sockets.get(listener.socketId);
            if (listenerSocket) {
                listenerSocket.emit('rating_received', {
                    listenerId,
                    newRating: avgRating, 
                    ratingCount: listenerRatings.length,
                    rating,
                    comment,
                    fromUser: getUserById(userId)?.displayName || 'Пользователь'
                });
                console.log(`🔔 Уведомление об оценке отправлено слушателю: ${listener.username}`);
            }
        }

        console.log(`⭐ Новая оценка для слушателя ${listenerId}: ${rating} звезд`);
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

        // Уведомляем участников чата
        const user1 = getUserById(chat.user1);
        const user2 = getUserById(chat.user2);

        socket.emit('chat_ended', { chatId });
        
        if (user2 && user2.socketId) {
            const targetSocket = io.sockets.sockets.get(user2.socketId);
            if (targetSocket) {
                targetSocket.emit('chat_ended', { chatId });
            }
        }

        console.log(`🔚 Чат завершен: ${chatId}`);
    });

    // ОТКЛЮЧЕНИЕ
    socket.on('disconnect', (reason) => {
        console.log(`🔌 Отключение: ${socket.id} (причина: ${reason})`);
        
        // Обновляем статус пользователя
        const user = getUserBySocketId(socket.id);
        if (user) {
            updateUser(user.id, {
                isOnline: false,
                socketId: null
            });
            
            socket.broadcast.emit('user_disconnected', { userId: user.id });
            console.log(`👋 Пользователь отключился: ${user.username}`);
        }
    });
});

// Маршруты API
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
        totalMessages: chats.reduce((total, chat) => total + (chat.messages?.length || 0), 0)
    };
    res.json(stats);
});

// Проверка пользователя
app.post('/api/check-user', (req, res) => {
    const { username, password } = req.body;
    const users = getUsers();
    
    const user = users.find(u => u.username === username && u.password === password);
    if (user) {
        res.json({ exists: true, user: { id: user.id, username: user.username, role: user.role } });
    } else {
        res.json({ exists: false });
    }
});

// Статический файл
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Health check
app.get('/health', (req, res) => {
    const users = getUsers();
    const chats = getChats();
    const ratings = getRatings();
    const notifications = getNotifications();
    
    res.json({ 
        status: 'OK', 
        users: users.length,
        chats: chats.length,
        ratings: ratings.length,
        notifications: notifications.length,
        timestamp: new Date().toISOString()
    });
});

// Test endpoint
app.get('/api/test', (req, res) => {
    res.json({ 
        message: 'Сервер работает!',
        timestamp: new Date().toISOString()
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    const users = getUsers();
    const chats = getChats();
    const ratings = getRatings();
    const notifications = getNotifications();
    
    console.log(`🚀 Сервер запущен на порту ${PORT}`);
    console.log(`📊 Пользователей: ${users.length}`);
    console.log(`💬 Чатов: ${chats.length}`);
    console.log(`⭐ Оценок: ${ratings.length}`);
    console.log(`📢 Уведомлений: ${notifications.length}`);
    console.log(`🌐 URL: http://localhost:${PORT}`);
    console.log(`💾 Данные синхронизируются через JSON файлы`);
});

// Обработка ошибок
process.on('uncaughtException', (error) => {
    console.error('❌ Необработанное исключение:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Необработанный промис:', reason);
});
