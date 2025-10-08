// server.js - ПОЛНАЯ СИНХРОНИЗАЦИЯ ДАННЫХ
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
const server = http.createServer(app);

app.use(cors({ origin: "*", credentials: true }));
app.use(express.json());
app.use(express.static('public'));

const io = socketIo(server, {
    cors: { origin: "*", methods: ["GET", "POST"] },
    transports: ['websocket', 'polling']
});

// Хранилище данных
let users = [
    {
        id: 'owner-1', username: 'owner', password: 'owner123',
        displayName: 'Владелец Системы', role: 'owner', avatar: '👑',
        isOnline: false, createdAt: new Date().toISOString()
    },
    {
        id: 'admin-1', username: 'admin', password: 'admin123',
        displayName: 'Главный Администратор', role: 'admin', avatar: '👑',
        isOnline: false, createdAt: new Date().toISOString()
    },
    {
        id: 'listener-1', username: 'listener1', password: 'listener123',
        displayName: 'Анна Слушатель', role: 'listener', avatar: '🎧',
        isOnline: false, createdAt: new Date().toISOString(),
        rating: 4.8, ratingCount: 15, bio: 'Психолог с 5-летним опытом'
    },
    {
        id: 'user-1', username: 'user1', password: 'user123',
        displayName: 'Тестовый Пользователь', role: 'user', avatar: '👤',
        isOnline: false, createdAt: new Date().toISOString()
    }
];

let chats = [];
let ratings = [];
let notifications = [];
let moderationHistory = [];

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// 🔄 УЛУЧШЕННАЯ ФУНКЦИЯ СИНХРОНИЗАЦИИ
function broadcastData() {
    const publicUsers = users.map(user => {
        const { password, socketId, ...publicUser } = user;
        return publicUser;
    });
    
    io.emit('users_list', { users: publicUsers });
    io.emit('chats_list', { chats });
    io.emit('ratings_list', { ratings });
    io.emit('notifications_list', { notifications });
    io.emit('moderation_history', { history: moderationHistory });
    
    console.log('🔄 Данные синхронизированы для всех клиентов');
}

// 🔄 Функция для отправки уведомлений конкретным ролям
function notifyRole(role, event, data) {
    users.forEach(user => {
        if (user.role === role && user.socketId) {
            io.to(user.socketId).emit(event, data);
        }
    });
}

// API Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/api/users', (req, res) => {
    const publicUsers = users.map(user => {
        const { password, socketId, ...publicUser } = user;
        return publicUser;
    });
    res.json({ users: publicUsers });
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

app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        users: users.length,
        chats: chats.length,
        connections: io.engine.clientsCount
    });
});

// 🔄 SOCKET.IO С ПОЛНОЙ СИНХРОНИЗАЦИЕЙ
io.on('connection', (socket) => {
    console.log('✅ Новое подключение:', socket.id);
    
    // Отправляем текущие данные новому клиенту
    const publicUsers = users.map(user => {
        const { password, socketId, ...publicUser } = user;
        return publicUser;
    });
    
    socket.emit('users_list', { users: publicUsers });
    socket.emit('chats_list', { chats });
    socket.emit('ratings_list', { ratings });
    socket.emit('notifications_list', { notifications });
    socket.emit('moderation_history', { history: moderationHistory });

    // 🔐 АВТОРИЗАЦИЯ
    socket.on('login', (data) => {
        console.log('🔐 Попытка входа:', data.username);
        
        const user = users.find(u => u.username === data.username && u.password === data.password);
        if (user) {
            if (user.isBlocked) {
                socket.emit('login_error', 'Аккаунт заблокирован');
                return;
            }
            
            // Обновляем статус пользователя
            user.isOnline = true;
            user.socketId = socket.id;
            user.lastSeen = new Date().toISOString();
            
            console.log('✅ Успешный вход:', user.username);
            socket.emit('login_success', { user: { ...user, password: undefined, socketId: undefined } });
            
            // 🔄 СИНХРОНИЗИРУЕМ СО ВСЕМИ КЛИЕНТАМИ
            socket.broadcast.emit('user_connected', { 
                user: { ...user, password: undefined, socketId: undefined } 
            });
            broadcastData();
            
        } else {
            socket.emit('login_error', 'Неверный логин или пароль');
        }
    });

    // 📝 РЕГИСТРАЦИЯ
    socket.on('register', (data) => {
        console.log('📝 Регистрация:', data.username);
        
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
        
        socket.emit('registration_success', { 
            user: { ...newUser, password: undefined, socketId: undefined } 
        });
        
        // 🔄 УВЕДОМЛЯЕМ ВСЕХ О НОВОМ ПОЛЬЗОВАТЕЛЕ
        socket.broadcast.emit('user_connected', { 
            user: { ...newUser, password: undefined, socketId: undefined } 
        });
        
        // 🔄 УВЕДОМЛЯЕМ АДМИНИСТРАТОРОВ О НОВОЙ РЕГИСТРАЦИИ
        notifyRole('admin', 'new_registration', { user: newUser });
        notifyRole('owner', 'new_registration', { user: newUser });
        
        broadcastData();
    });

    // 🔄 ВОССТАНОВЛЕНИЕ СЕССИИ
    socket.on('restore_session', (data) => {
        console.log('🔄 Восстановление сессии:', data.userId);
        
        const user = users.find(u => u.id === data.userId);
        if (user) {
            user.isOnline = true;
            user.socketId = socket.id;
            user.lastSeen = new Date().toISOString();
            
            socket.emit('session_restored', { 
                success: true, 
                user: { ...user, password: undefined, socketId: undefined } 
            });
            
            // 🔄 СИНХРОНИЗИРУЕМ СО ВСЕМИ
            socket.broadcast.emit('user_connected', { 
                user: { ...user, password: undefined, socketId: undefined } 
            });
            broadcastData();
        } else {
            socket.emit('session_restored', { success: false });
        }
    });

    // 💬 СОЗДАНИЕ ЧАТА
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
        
        // 🔄 УВЕДОМЛЯЕМ СОЗДАТЕЛЯ
        socket.emit('chat_created', { 
            chat: newChat, 
            listenerName: user2?.displayName || user2?.username 
        });
        
        // 🔄 УВЕДОМЛЯЕМ СЛУШАТЕЛЯ
        if (user2?.socketId) {
            io.to(user2.socketId).emit('chat_created', { 
                chat: newChat, 
                userName: user1?.displayName || user1?.username 
            });
        }
        
        // 🔄 УВЕДОМЛЯЕМ АДМИНИСТРАТОРОВ О НОВОМ ЧАТЕ
        notifyRole('admin', 'chat_created', { chat: newChat });
        notifyRole('owner', 'chat_created', { chat: newChat });
        
        broadcastData();
    });

    // 📨 ОТПРАВКА СООБЩЕНИЯ
    socket.on('send_message', (data) => {
        console.log('📨 Сообщение в чате:', data.chatId);
        
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
            
            // 🔄 ОТПРАВЛЯЕМ СООБЩЕНИЕ ВСЕМ УЧАСТНИКАМ ЧАТА
            const user1 = users.find(u => u.id === chat.user1);
            const user2 = users.find(u => u.id === chat.user2);
            
            if (user1?.socketId) {
                io.to(user1.socketId).emit('new_message', {
                    chatId: data.chatId,
                    message: message
                });
            }
            
            if (user2?.socketId) {
                io.to(user2.socketId).emit('new_message', {
                    chatId: data.chatId,
                    message: message
                });
            }
            
            // 🔄 УВЕДОМЛЯЕМ АДМИНИСТРАТОРОВ О НОВОМ СООБЩЕНИИ
            notifyRole('admin', 'new_message', {
                chatId: data.chatId,
                message: message,
                chat: chat
            });
            
            notifyRole('owner', 'new_message', {
                chatId: data.chatId,
                message: message,
                chat: chat
            });
            
            broadcastData();
        }
    });

    // ⭐ ОЦЕНКА СЛУШАТЕЛЯ
    socket.on('submit_rating', (data) => {
        console.log('⭐ Оценка для слушателя:', data.listenerId);
        
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
            
            // 🔄 УВЕДОМЛЯЕМ СЛУШАТЕЛЯ О НОВОЙ ОЦЕНКЕ
            if (listener.socketId) {
                io.to(listener.socketId).emit('rating_received', {
                    rating: data.rating,
                    comment: data.comment,
                    newAverage: listener.rating
                });
            }
        }
        
        socket.emit('rating_submitted', {
            newRating: listener?.rating || 0,
            ratingCount: listener?.ratingCount || 0
        });
        
        // 🔄 СИНХРОНИЗИРУЕМ ДАННЫЕ
        broadcastData();
    });

    // 🔚 ЗАВЕРШЕНИЕ ЧАТА
    socket.on('end_chat', (data) => {
        console.log('🔚 Завершение чата:', data.chatId);
        
        const chat = chats.find(c => c.id === data.chatId);
        if (chat) {
            chat.isActive = false;
            chat.endedAt = new Date().toISOString();
            
            // 🔄 УВЕДОМЛЯЕМ ВСЕХ УЧАСТНИКОВ
            const user1 = users.find(u => u.id === chat.user1);
            const user2 = users.find(u => u.id === chat.user2);
            
            if (user1?.socketId) {
                io.to(user1.socketId).emit('chat_ended', { chatId: data.chatId });
            }
            
            if (user2?.socketId) {
                io.to(user2.socketId).emit('chat_ended', { chatId: data.chatId });
            }
            
            // 🔄 УВЕДОМЛЯЕМ АДМИНИСТРАТОРОВ
            notifyRole('admin', 'chat_ended', { chatId: data.chatId, chat: chat });
            notifyRole('owner', 'chat_ended', { chatId: data.chatId, chat: chat });
            
            broadcastData();
        }
    });

    // 👥 РЕГИСТРАЦИЯ СОТРУДНИКА
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
        socket.emit('staff_registered', { 
            user: { ...newUser, password: undefined } 
        });
        
        // 🔄 УВЕДОМЛЯЕМ АДМИНИСТРАТОРОВ
        notifyRole('admin', 'staff_registered', { user: newUser });
        notifyRole('owner', 'staff_registered', { user: newUser });
        
        broadcastData();
    });

    // 📢 ТЕХНИЧЕСКИЕ УВЕДОМЛЕНИЯ
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
        
        // 🔄 ОТПРАВЛЯЕМ УВЕДОМЛЕНИЕ СООТВЕТСТВУЮЩИМ ПОЛУЧАТЕЛЯМ
        let targetSockets = [];
        
        if (data.recipients === 'all') {
            targetSockets = users.map(u => u.socketId).filter(id => id);
        } else if (data.recipients === 'users') {
            targetSockets = users.filter(u => u.role === 'user').map(u => u.socketId).filter(id => id);
        } else if (data.recipients === 'listeners') {
            targetSockets = users.filter(u => u.role === 'listener').map(u => u.socketId).filter(id => id);
        } else if (data.recipients === 'admins') {
            targetSockets = users.filter(u => ['admin', 'owner'].includes(u.role)).map(u => u.socketId).filter(id => id);
        }
        
        targetSockets.forEach(socketId => {
            io.to(socketId).emit('notification_received', { notification });
        });
        
        socket.emit('notification_sent', { notification });
        broadcastData();
    });

    // ⚖️ МОДЕРАЦИЯ
    socket.on('apply_moderation', (data) => {
        console.log('⚖️ Модерация:', data.action, 'для:', data.userId);
        
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
            
            // 🔄 УВЕДОМЛЯЕМ ПОЛЬЗОВАТЕЛЯ О ДЕЙСТВИИ
            if (user.socketId) {
                io.to(user.socketId).emit('moderation_action_applied', {
                    action: data.action,
                    reason: data.reason,
                    duration: data.duration
                });
            }
            
            socket.emit('moderation_applied', { record });
            
            // 🔄 УВЕДОМЛЯЕМ АДМИНИСТРАТОРОВ
            notifyRole('admin', 'moderation_applied', { record, user });
            notifyRole('owner', 'moderation_applied', { record, user });
            
            broadcastData();
        }
    });

    // 📝 ОБНОВЛЕНИЕ ПРОФИЛЯ
    socket.on('update_profile', (data) => {
        console.log('📝 Обновление профиля:', data.userId);
        
        const user = users.find(u => u.id === data.userId);
        if (user) {
            if (data.displayName) user.displayName = data.displayName;
            if (data.avatar) user.avatar = data.avatar;
            if (data.password) user.password = data.password;
            
            // 🔄 СИНХРОНИЗИРУЕМ ИЗМЕНЕНИЯ СО ВСЕМИ
            socket.emit('profile_updated', { 
                user: { ...user, password: undefined, socketId: undefined } 
            });
            
            socket.broadcast.emit('user_updated', { 
                user: { ...user, password: undefined, socketId: undefined } 
            });
            
            broadcastData();
        }
    });

    // ❌ ОТКЛЮЧЕНИЕ
    socket.on('disconnect', (reason) => {
        console.log('❌ Отключение:', socket.id);
        
        const user = users.find(u => u.socketId === socket.id);
        if (user) {
            user.isOnline = false;
            user.lastSeen = new Date().toISOString();
            user.socketId = null;
            
            // 🔄 УВЕДОМЛЯЕМ ВСЕХ ОБ ОТКЛЮЧЕНИИ
            socket.broadcast.emit('user_disconnected', { 
                userId: user.id,
                userName: user.displayName || user.username
            });
            
            broadcastData();
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`
🚀 Сервер запущен с ПОЛНОЙ СИНХРОНИЗАЦИЕЙ!
📍 Порт: ${PORT}
✅ Все действия теперь синхронизируются между всеми клиентами
    `);
});
