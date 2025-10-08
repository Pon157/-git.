// server.js - Обновленная версия для Render.com
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
const server = http.createServer(app);

// Настройки CORS для Render.com
app.use(cors({
    origin: "*", // Разрешаем все домены для демонстрации
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
}));

app.use(express.json());
app.use(express.static('public'));

// Socket.IO с настройками для production
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
        credentials: true
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000
});

// Хранилище данных
let users = [
    {
        id: 'owner-1',
        username: 'owner',
        password: 'owner123',
        displayName: 'Владелец Системы',
        role: 'owner',
        avatar: '👑',
        isOnline: false,
        createdAt: new Date().toISOString()
    },
    {
        id: 'admin-1',
        username: 'admin',
        password: 'admin123',
        displayName: 'Главный Администратор',
        role: 'admin',
        avatar: '👑',
        isOnline: false,
        createdAt: new Date().toISOString()
    },
    {
        id: 'listener-1',
        username: 'listener1',
        password: 'listener123',
        displayName: 'Анна Слушатель',
        role: 'listener',
        avatar: '🎧',
        isOnline: false,
        createdAt: new Date().toISOString(),
        rating: 4.8,
        ratingCount: 15,
        bio: 'Психолог с 5-летним опытом'
    },
    {
        id: 'listener-2',
        username: 'listener2',
        password: 'listener123',
        displayName: 'Максим Поддержка',
        role: 'listener',
        avatar: '🌟',
        isOnline: false,
        createdAt: new Date().toISOString(),
        rating: 4.5,
        ratingCount: 8,
        bio: 'Коуч и ментор'
    },
    {
        id: 'user-1',
        username: 'user1',
        password: 'user123',
        displayName: 'Тестовый Пользователь',
        role: 'user',
        avatar: '👤',
        isOnline: false,
        createdAt: new Date().toISOString()
    }
];

let chats = [];
let ratings = [];
let notifications = [];
let moderationHistory = [];

// Генерация ID
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Функция для отправки данных всем клиентам
function broadcastData() {
    io.emit('users_list', { users: users.filter(u => !u.isBlocked) });
    io.emit('chats_list', { chats });
    io.emit('ratings_list', { ratings });
    io.emit('notifications_list', { notifications });
    io.emit('moderation_history', { history: moderationHistory });
}

// API Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/api/users', (req, res) => {
    res.json({ users: users.filter(u => !u.isBlocked) });
});

app.get('/api/chats', (req, res) => {
    res.json({ chats });
});

app.get('/api/stats', (req, res) => {
    const stats = {
        totalUsers: users.filter(u => u.role === 'user').length,
        totalListeners: users.filter(u => u.role === 'listener').length,
        totalAdmins: users.filter(u => u.role === 'admin').length,
        activeChats: chats.filter(c => c.isActive).length,
        totalMessages: chats.reduce((sum, chat) => sum + (chat.messages?.length || 0), 0),
        avgRating: users.filter(u => u.role === 'listener').reduce((sum, u) => sum + (u.rating || 0), 0) / users.filter(u => u.role === 'listener').length || 0
    };
    res.json({ stats });
});

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        users: users.length,
        chats: chats.length,
        connections: io.engine.clientsCount
    });
});

// Socket.IO обработчики
io.on('connection', (socket) => {
    console.log('✅ Новое подключение:', socket.id);
    
    // Отправляем текущие данные новому клиенту
    socket.emit('users_list', { users: users.filter(u => !u.isBlocked) });
    socket.emit('chats_list', { chats });
    socket.emit('ratings_list', { ratings });
    socket.emit('notifications_list', { notifications });
    socket.emit('moderation_history', { history: moderationHistory });

    // Авторизация
    socket.on('login', (data) => {
        console.log('🔐 Попытка входа:', data.username);
        
        const user = users.find(u => u.username === data.username && u.password === data.password);
        if (user) {
            if (user.isBlocked) {
                socket.emit('login_error', 'Аккаунт заблокирован');
                return;
            }
            
            user.isOnline = true;
            user.socketId = socket.id;
            user.lastSeen = new Date().toISOString();
            
            console.log('✅ Успешный вход:', user.username);
            socket.emit('login_success', { user });
            
            // Уведомляем всех об изменении статуса
            socket.broadcast.emit('user_connected', { user });
            broadcastData();
            
        } else {
            console.log('❌ Ошибка входа для:', data.username);
            socket.emit('login_error', 'Неверный логин или пароль');
        }
    });

    // Регистрация
    socket.on('register', (data) => {
        console.log('📝 Попытка регистрации:', data.username);
        
        if (users.find(u => u.username === data.username)) {
            socket.emit('registration_error', 'Пользователь уже существует');
            return;
        }

        const newUser = {
            id: generateId(),
            username: data.username,
            password: data.password,
            displayName: data.username,
            role: data.role || 'user',
            avatar: '👤',
            isOnline: true,
            socketId: socket.id,
            createdAt: new Date().toISOString(),
            lastSeen: new Date().toISOString(),
            rating: 0,
            ratingCount: 0,
            isBlocked: false,
            isOnVacation: false
        };

        users.push(newUser);
        console.log('✅ Новый пользователь:', newUser.username);
        
        socket.emit('registration_success', { user: newUser });
        socket.broadcast.emit('user_connected', { user: newUser });
        broadcastData();
    });

    // Восстановление сессии
    socket.on('restore_session', (data) => {
        console.log('🔄 Восстановление сессии:', data.userId);
        
        const user = users.find(u => u.id === data.userId);
        if (user) {
            user.isOnline = true;
            user.socketId = socket.id;
            user.lastSeen = new Date().toISOString();
            
            socket.emit('session_restored', { success: true, user });
            socket.broadcast.emit('user_connected', { user });
            broadcastData();
        } else {
            socket.emit('session_restored', { success: false });
        }
    });

    // Создание чата
    socket.on('create_chat', (data) => {
        console.log('💬 Создание чата между:', data.user1, 'и', data.user2);
        
        const existingChat = chats.find(chat => 
            (chat.user1 === data.user1 && chat.user2 === data.user2) ||
            (chat.user1 === data.user2 && chat.user2 === data.user1)
        );

        if (existingChat && existingChat.isActive) {
            socket.emit('chat_create_error', 'Чат уже существует');
            return;
        }

        const newChat = {
            id: generateId(),
            user1: data.user1,
            user2: data.user2,
            isActive: true,
            messages: [],
            createdAt: new Date().toISOString(),
            lastActivity: new Date().toISOString()
        };

        chats.push(newChat);
        
        const user1 = users.find(u => u.id === data.user1);
        const user2 = users.find(u => u.id === data.user2);
        
        console.log('✅ Новый чат создан:', newChat.id);
        
        socket.emit('chat_created', { 
            chat: newChat, 
            listenerName: user2?.displayName || user2?.username 
        });
        
        // Уведомляем слушателя о новом чате
        if (user2?.socketId) {
            io.to(user2.socketId).emit('chat_created', { 
                chat: newChat, 
                userName: user1?.displayName || user1?.username 
            });
        }
        
        broadcastData();
    });

    // Отправка сообщения
    socket.on('send_message', (data) => {
        console.log('📨 Новое сообщение в чате:', data.chatId);
        
        const chat = chats.find(c => c.id === data.chatId);
        if (chat) {
            const message = {
                ...data.message,
                id: generateId(),
                timestamp: new Date().toISOString()
            };
            
            if (!chat.messages) chat.messages = [];
            chat.messages.push(message);
            chat.lastActivity = new Date().toISOString();
            
            // Отправляем сообщение всем участникам чата
            io.emit('new_message', {
                chatId: data.chatId,
                message: message
            });
            
            broadcastData();
        }
    });

    // Оценка слушателя
    socket.on('submit_rating', (data) => {
        console.log('⭐ Новая оценка для слушателя:', data.listenerId);
        
        const rating = {
            id: generateId(),
            listenerId: data.listenerId,
            userId: data.userId,
            rating: data.rating,
            comment: data.comment,
            timestamp: new Date().toISOString()
        };
        
        ratings.push(rating);
        
        // Обновляем рейтинг слушателя
        const listener = users.find(u => u.id === data.listenerId);
        if (listener) {
            const listenerRatings = ratings.filter(r => r.listenerId === data.listenerId);
            const totalRating = listenerRatings.reduce((sum, r) => sum + r.rating, 0);
            listener.rating = totalRating / listenerRatings.length;
            listener.ratingCount = listenerRatings.length;
        }
        
        socket.emit('rating_submitted', {
            newRating: listener?.rating || 0,
            ratingCount: listener?.ratingCount || 0
        });
        
        broadcastData();
    });

    // Завершение чата
    socket.on('end_chat', (data) => {
        console.log('🔚 Завершение чата:', data.chatId);
        
        const chat = chats.find(c => c.id === data.chatId);
        if (chat) {
            chat.isActive = false;
            chat.endedAt = new Date().toISOString();
            
            io.emit('chat_ended', { chatId: data.chatId });
            broadcastData();
        }
    });

    // Регистрация сотрудника
    socket.on('register_staff', (data) => {
        console.log('👥 Регистрация сотрудника:', data.username);
        
        if (users.find(u => u.username === data.username)) {
            socket.emit('staff_register_error', 'Пользователь уже существует');
            return;
        }

        const newUser = {
            id: generateId(),
            username: data.username,
            password: data.password,
            displayName: data.displayName,
            role: data.role,
            avatar: data.role === 'admin' ? '👑' : '🎧',
            isOnline: false,
            createdAt: new Date().toISOString(),
            rating: 0,
            ratingCount: 0,
            isBlocked: false,
            isOnVacation: false
        };

        users.push(newUser);
        
        console.log('✅ Новый сотрудник:', newUser.username);
        socket.emit('staff_registered', { user: newUser });
        broadcastData();
    });

    // Технические уведомления
    socket.on('send_technical_notification', (data) => {
        console.log('📢 Техническое уведомление:', data.title);
        
        const notification = {
            id: generateId(),
            title: data.title,
            text: data.text,
            type: data.type,
            recipients: data.recipients,
            timestamp: new Date().toISOString()
        };
        
        notifications.push(notification);
        
        socket.emit('notification_sent', { notification });
        broadcastData();
    });

    // Модерация
    socket.on('apply_moderation', (data) => {
        console.log('⚖️ Действие модерации:', data.action, 'для пользователя:', data.userId);
        
        const user = users.find(u => u.id === data.userId);
        if (user) {
            const moderator = users.find(u => u.id === data.moderatorId);
            
            const record = {
                id: generateId(),
                userId: data.userId,
                userName: user.displayName || user.username,
                action: data.action,
                reason: data.reason,
                duration: data.duration,
                moderatorId: data.moderatorId,
                moderatorName: moderator?.displayName || moderator?.username,
                timestamp: new Date().toISOString()
            };
            
            moderationHistory.push(record);
            
            // Применяем действие
            if (data.action === 'block') {
                user.isBlocked = true;
                user.blockUntil = new Date(Date.now() + data.duration * 24 * 60 * 60 * 1000);
            } else if (data.action === 'vacation') {
                user.isOnVacation = true;
                user.vacationUntil = new Date(Date.now() + data.duration * 24 * 60 * 60 * 1000);
            } else if (data.action === 'remove_block') {
                user.isBlocked = false;
                user.blockUntil = null;
            } else if (data.action === 'remove_vacation') {
                user.isOnVacation = false;
                user.vacationUntil = null;
            }
            
            socket.emit('moderation_applied', { record });
            broadcastData();
        }
    });

    // Отключение
    socket.on('disconnect', (reason) => {
        console.log('❌ Отключение:', socket.id, 'Причина:', reason);
        
        const user = users.find(u => u.socketId === socket.id);
        if (user) {
            user.isOnline = false;
            user.lastSeen = new Date().toISOString();
            
            socket.broadcast.emit('user_disconnected', { userId: user.id });
            broadcastData();
        }
    });
});

// Обработка ошибок
process.on('uncaughtException', (error) => {
    console.error('💥 Необработанное исключение:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('💥 Необработанный промис:', reason);
});

// Старт сервера
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`
🚀 Сервер запущен на Render.com!
📍 Порт: ${PORT}
🌐 Домен: https://support-chat-hyv4.onrender.com
✅ Готов к подключениям!
    `);
    
    console.log('👥 Предустановленные пользователи:');
    users.forEach(user => {
        console.log(`   ${user.avatar} ${user.username} (${user.role}) - пароль: ${user.password}`);
    });
});
