const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Файлы для хранения данных
const USERS_FILE = 'users.json';
const CHATS_FILE = 'chats.json';
const RATINGS_FILE = 'ratings.json';

// Загрузка данных из файлов
function loadData(filename, defaultValue = []) {
    try {
        if (fs.existsSync(filename)) {
            const data = fs.readFileSync(filename, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error(`Ошибка загрузки ${filename}:`, error);
    }
    return defaultValue;
}

// Сохранение данных в файлы
function saveData(filename, data) {
    try {
        fs.writeFileSync(filename, JSON.stringify(data, null, 2));
        console.log(`✅ Данные сохранены в ${filename}`);
    } catch (error) {
        console.error(`❌ Ошибка сохранения ${filename}:`, error);
    }
}

// Инициализация данных
let users = loadData(USERS_FILE, []);
let chats = loadData(CHATS_FILE, []);
let ratings = loadData(RATINGS_FILE, []);

// Добавляем демо-пользователей если их нет
const demoUsers = [
    {
        id: '1',
        username: 'user',
        password: '123456',
        role: 'user',
        displayName: 'Тестовый Пользователь',
        rating: 0,
        ratingCount: 0,
        isOnline: false,
        socketId: null
    },
    {
        id: '2', 
        username: 'listener',
        password: '123456',
        role: 'listener',
        displayName: 'Анна Слушатель',
        rating: 4.8,
        ratingCount: 15,
        isOnline: false,
        socketId: null
    },
    {
        id: '3',
        username: 'admin',
        password: 'admin123', 
        role: 'admin',
        displayName: 'Администратор Системы',
        rating: 5.0,
        ratingCount: 8,
        isOnline: false,
        socketId: null
    }
];

// Проверяем и добавляем демо-пользователей
demoUsers.forEach(demoUser => {
    const exists = users.find(u => u.username === demoUser.username);
    if (!exists) {
        users.push(demoUser);
        console.log(`✅ Добавлен демо-пользователь: ${demoUser.username}`);
    }
});
saveData(USERS_FILE, users);

// Генерация ID
function generateId() {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

// Socket.IO соединения
io.on('connection', (socket) => {
    console.log(`🔗 Новое подключение: ${socket.id}`);

    // ВОССТАНОВЛЕНИЕ СЕССИИ
    socket.on('restore_session', (data) => {
        console.log(`🔄 Попытка восстановления сессии:`, data);
        const user = users.find(u => u.id === data.userId);
        if (user) {
            user.isOnline = true;
            user.socketId = socket.id;
            saveData(USERS_FILE, users);
            
            socket.emit('session_restored', { user });
            socket.emit('users_list', { users: users.filter(u => u.id !== user.id) });
            socket.emit('chats_list', { chats });
            socket.emit('ratings_list', { ratings });
            
            // Уведомляем других о подключении
            socket.broadcast.emit('user_connected', { user });
            console.log(`🔄 Сессия восстановлена: ${user.username}`);
        } else {
            console.log(`❌ Пользователь не найден для восстановления сессии`);
        }
    });

    // РЕГИСТРАЦИЯ
    socket.on('register', (data) => {
        console.log(`📝 Запрос на регистрацию:`, data);
        const { username, password, role = 'user' } = data;
        
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
            password, // В реальном приложении нужно хэшировать!
            role: role || 'user',
            displayName: username,
            rating: 0,
            ratingCount: 0,
            isOnline: true,
            socketId: socket.id,
            createdAt: new Date()
        };

        users.push(newUser);
        saveData(USERS_FILE, users);
        
        socket.emit('registration_success');
        socket.broadcast.emit('user_connected', { user: newUser });
        console.log(`✅ Новый пользователь зарегистрирован: ${username}`);
    });

    // ВХОД
    socket.on('login', (data) => {
        console.log(`🚪 Запрос на вход:`, data);
        const { username, password } = data;
        
        const user = users.find(u => u.username === username && u.password === password);
        if (!user) {
            socket.emit('login_error', 'Неверный логин или пароль');
            console.log(`❌ Ошибка входа: неверные данные для ${username}`);
            return;
        }

        // Обновляем статус пользователя
        user.isOnline = true;
        user.socketId = socket.id;
        saveData(USERS_FILE, users);

        // Отправляем успешный вход
        socket.emit('login_success', { user });
        
        // Отправляем данные
        socket.emit('users_list', { users: users.filter(u => u.id !== user.id) });
        socket.emit('chats_list', { chats });
        socket.emit('ratings_list', { ratings });
        
        // Уведомляем других о подключении
        socket.broadcast.emit('user_connected', { user });
        console.log(`✅ Успешный вход: ${username}`);
    });

    // ПОЛУЧЕНИЕ ДАННЫХ
    socket.on('get_users', () => {
        console.log(`📊 Запрос списка пользователей от ${socket.id}`);
        socket.emit('users_list', { users });
    });

    socket.on('get_chats', () => {
        console.log(`💬 Запрос списка чатов от ${socket.id}`);
        socket.emit('chats_list', { chats });
    });

    socket.on('get_ratings', () => {
        console.log(`⭐ Запрос списка оценок от ${socket.id}`);
        socket.emit('ratings_list', { ratings });
    });

    // СОЗДАНИЕ ЧАТА
    socket.on('create_chat', (data) => {
        console.log(`💬 Запрос создания чата:`, data);
        const { user1, user2 } = data;
        
        const user1Data = users.find(u => u.id === user1);
        const user2Data = users.find(u => u.id === user2);
        
        if (!user1Data || !user2Data) {
            socket.emit('chat_error', 'Пользователь не найден');
            console.log(`❌ Ошибка создания чата: пользователь не найден`);
            return;
        }

        const newChat = {
            id: generateId(),
            user1,
            user2, 
            messages: [],
            startTime: new Date(),
            isActive: true
        };

        chats.push(newChat);
        saveData(CHATS_FILE, chats);

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
            timestamp: new Date()
        };

        chat.messages.push(newMessage);
        saveData(CHATS_FILE, chats);

        // Отправляем сообщение всем участникам чата
        const user1 = users.find(u => u.id === chat.user1);
        const user2 = users.find(u => u.id === chat.user2);

        // Отправляем отправителю
        socket.emit('new_message', { chatId, message: newMessage });
        
        // Отправляем получателю
        const targetUserId = message.senderId === chat.user1 ? chat.user2 : chat.user1;
        const targetUser = users.find(u => u.id === targetUserId);
        
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
        const { listenerId, rating, comment, userId } = data;
        
        const newRating = {
            id: generateId(),
            listenerId,
            userId,
            rating,
            comment,
            timestamp: new Date()
        };

        ratings.push(newRating);
        saveData(RATINGS_FILE, ratings);

        // Обновляем рейтинг слушателя
        const listenerRatings = ratings.filter(r => r.listenerId === listenerId);
        const totalRating = listenerRatings.reduce((sum, r) => sum + r.rating, 0);
        const avgRating = totalRating / listenerRatings.length;

        const listener = users.find(u => u.id === listenerId);
        if (listener) {
            listener.rating = avgRating;
            listener.ratingCount = listenerRatings.length;
            saveData(USERS_FILE, users);
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
                listenerSocket.emit('rating_submitted', {
                    listenerId,
                    newRating: avgRating, 
                    ratingCount: listenerRatings.length
                });
                console.log(`🔔 Уведомление об оценке отправлено слушателю: ${listener.username}`);
            }
        }

        console.log(`⭐ Новая оценка для слушателя ${listenerId}: ${rating} звезд`);
    });

    // ЗАВЕРШЕНИЕ ЧАТА
    socket.on('end_chat', (chatId) => {
        console.log(`🚪 Запрос завершения чата: ${chatId}`);
        const chat = chats.find(c => c.id === chatId);
        if (chat) {
            chat.isActive = false;
            chat.endTime = new Date();
            saveData(CHATS_FILE, chats);

            // Уведомляем участников чата
            io.emit('chat_ended', { chatId });
            console.log(`🚪 Чат завершен: ${chatId}`);
        }
    });

    // ДОБАВЛЕНИЕ СОТРУДНИКА (АДМИН)
    socket.on('register_staff', (data) => {
        console.log(`➕ Запрос добавления сотрудника:`, data);
        const { username, password, displayName, role } = data;
        
        const existingUser = users.find(u => u.username === username);
        if (existingUser) {
            socket.emit('staff_error', 'Пользователь с таким логином уже существует');
            console.log(`❌ Ошибка добавления сотрудника: пользователь ${username} уже существует`);
            return;
        }

        const newStaff = {
            id: generateId(),
            username,
            password,
            role,
            displayName,
            rating: 0,
            ratingCount: 0,
            isOnline: false,
            socketId: null,
            createdAt: new Date()
        };

        users.push(newStaff);
        saveData(USERS_FILE, users);

        socket.emit('staff_added', { user: newStaff });
        console.log(`➕ Новый сотрудник добавлен: ${username} (${role})`);
    });

    // ИЗМЕНЕНИЕ РОЛИ (АДМИН)
    socket.on('change_role', (data) => {
        console.log(`🎭 Запрос изменения роли:`, data);
        const { userId, newRole } = data;
        
        const user = users.find(u => u.id === userId);
        if (user) {
            user.role = newRole;
            saveData(USERS_FILE, users);

            socket.emit('role_changed', { userId, newRole });
            console.log(`🎭 Роль изменена: ${user.username} -> ${newRole}`);
        }
    });

    // ОТКЛЮЧЕНИЕ
    socket.on('disconnect', (reason) => {
        console.log(`🔌 Отключение: ${socket.id} (причина: ${reason})`);
        
        // Обновляем статус пользователя
        const user = users.find(u => u.socketId === socket.id);
        if (user) {
            user.isOnline = false;
            user.socketId = null;
            saveData(USERS_FILE, users);
            
            socket.broadcast.emit('user_disconnected', { userId: user.id });
            console.log(`👋 Пользователь отключился: ${user.username}`);
        }
    });
});

// Маршруты API
app.get('/api/users', (req, res) => {
    res.json(users);
});

app.get('/api/chats', (req, res) => {
    res.json(chats);
});

app.get('/api/ratings', (req, res) => {
    res.json(ratings);
});

app.get('/api/stats', (req, res) => {
    const stats = {
        totalUsers: users.length,
        totalListeners: users.filter(u => u.role === 'listener').length,
        activeChats: chats.filter(c => c.isActive).length,
        onlineUsers: users.filter(u => u.isOnline).length,
        totalMessages: chats.reduce((total, chat) => total + (chat.messages?.length || 0), 0)
    };
    res.json(stats);
});

// Статический файл
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        users: users.length,
        chats: chats.length,
        ratings: ratings.length,
        timestamp: new Date().toISOString()
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Сервер запущен на порту ${PORT}`);
    console.log(`📊 Пользователей: ${users.length}`);
    console.log(`💬 Чатов: ${chats.length}`);
    console.log(`⭐ Оценок: ${ratings.length}`);
    console.log(`🔗 Демо доступ:`);
    console.log(`   👤 user / 123456`);
    console.log(`   👂 listener / 123456`);
    console.log(`   👑 admin / admin123`);
    console.log(`🌐 URL: http://localhost:${PORT}`);
});
