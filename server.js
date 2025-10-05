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
        isOnline: false
    },
    {
        id: '2', 
        username: 'listener',
        password: '123456',
        role: 'listener',
        displayName: 'Анна Слушатель',
        rating: 4.8,
        ratingCount: 15,
        isOnline: false
    },
    {
        id: '3',
        username: 'admin',
        password: 'admin123', 
        role: 'admin',
        displayName: 'Администратор Системы',
        rating: 5.0,
        ratingCount: 8,
        isOnline: false
    }
];

// Проверяем и добавляем демо-пользователей
demoUsers.forEach(demoUser => {
    const exists = users.find(u => u.username === demoUser.username);
    if (!exists) {
        users.push(demoUser);
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
        }
    });

    // РЕГИСТРАЦИЯ
    socket.on('register', (data) => {
        const { username, password, role } = data;
        
        // Проверяем существование пользователя
        const existingUser = users.find(u => u.username === username);
        if (existingUser) {
            socket.emit('registration_error', 'Пользователь с таким логином уже существует');
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
        console.log(`✅ Новый пользователь: ${username}`);
    });

    // ВХОД
    socket.on('login', (data) => {
        const { username, password } = data;
        
        const user = users.find(u => u.username === username && u.password === password);
        if (!user) {
            socket.emit('login_error', 'Неверный логин или пароль');
            return;
        }

        // Обновляем статус пользователя
        user.isOnline = true;
        user.socketId = socket.id;
        saveData(USERS_FILE, users);

        socket.emit('login_success', { user });
        socket.emit('users_list', { users: users.filter(u => u.id !== user.id) });
        socket.emit('chats_list', { chats });
        socket.emit('ratings_list', { ratings });
        
        // Уведомляем других о подключении
        socket.broadcast.emit('user_connected', { user });
        console.log(`✅ Успешный вход: ${username}`);
    });

    // СОЗДАНИЕ ЧАТА
    socket.on('create_chat', (data) => {
        const { user1, user2 } = data;
        
        const user1Data = users.find(u => u.id === user1);
        const user2Data = users.find(u => u.id === user2);
        
        if (!user1Data || !user2Data) {
            socket.emit('chat_error', 'Пользователь не найден');
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
        
        const listenerSocket = io.sockets.sockets.get(user2Data.socketId);
        if (listenerSocket) {
            listenerSocket.emit('chat_created', { 
                chat: newChat, 
                listenerName: user1Data.displayName 
            });
        }

        console.log(`💬 Новый чат создан: ${user1Data.username} ↔ ${user2Data.username}`);
    });

    // ОТПРАВКА СООБЩЕНИЯ
    socket.on('send_message', (data) => {
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
            timestamp: new Date()
        };

        chat.messages.push(newMessage);
        saveData(CHATS_FILE, chats);

        // Отправляем сообщение всем участникам чата
        const user1 = users.find(u => u.id === chat.user1);
        const user2 = users.find(u => u.id === chat.user2);

        socket.emit('new_message', { chatId, message: newMessage });
        
        const targetUser = message.senderId === chat.user1 ? user2 : user1;
        if (targetUser && targetUser.socketId) {
            const targetSocket = io.sockets.sockets.get(targetUser.socketId);
            if (targetSocket) {
                targetSocket.emit('new_message', { chatId, message: newMessage });
            }
        }

        console.log(`📨 Новое сообщение в чате ${chatId}`);
    });

    // ОЦЕНКА СЛУШАТЕЛЯ
    socket.on('submit_rating', (data) => {
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
            }
        }

        console.log(`⭐ Новая оценка для слушателя ${listenerId}: ${rating} звезд`);
    });

    // ЗАВЕРШЕНИЕ ЧАТА
    socket.on('end_chat', (chatId) => {
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

    // ДОБАВЛЕНИЕ СОТРУДНИКА
    socket.on('register_staff', (data) => {
        const { username, password, displayName, role } = data;
        
        const existingUser = users.find(u => u.username === username);
        if (existingUser) {
            socket.emit('staff_error', 'Пользователь с таким логином уже существует');
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
            createdAt: new Date()
        };

        users.push(newStaff);
        saveData(USERS_FILE, users);

        socket.emit('staff_added', { user: newStaff });
        console.log(`➕ Новый сотрудник: ${username} (${role})`);
    });

    // ИЗМЕНЕНИЕ РОЛИ
    socket.on('change_role', (data) => {
        const { userId, newRole } = data;
        
        const user = users.find(u => u.id === userId);
        if (user) {
            user.role = newRole;
            saveData(USERS_FILE, users);

            socket.emit('role_changed', { userId, newRole });
            console.log(`🎭 Роль изменена: ${user.username} -> ${newRole}`);
        }
    });

    // ЗАПРОС ДАННЫХ
    socket.on('get_users', () => {
        socket.emit('users_list', { users });
    });

    socket.on('get_chats', () => {
        socket.emit('chats_list', { chats });
    });

    socket.on('get_ratings', () => {
        socket.emit('ratings_list', { ratings });
    });

    // ОТКЛЮЧЕНИЕ
    socket.on('disconnect', () => {
        console.log(`🔌 Отключение: ${socket.id}`);
        
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
        onlineUsers: users.filter(u => u.isOnline).length
    };
    res.json(stats);
});

// Статический файл
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Сервер запущен на порту ${PORT}`);
    console.log(`📊 Загружено пользователей: ${users.length}`);
    console.log(`💬 Загружено чатов: ${chats.length}`);
    console.log(`⭐ Загружено оценок: ${ratings.length}`);
});
