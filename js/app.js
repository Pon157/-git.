const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
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
app.use(express.json());

// Временное хранилище данных (в реальном приложении используйте базу данных)
let users = [
    {
        id: '1',
        username: 'admin',
        password: 'admin123',
        displayName: 'Администратор',
        role: 'admin',
        avatar: '👑',
        rating: 5.0,
        ratingCount: 10,
        isOnline: false
    },
    {
        id: '2', 
        username: 'listener1',
        password: '123456',
        displayName: 'Анна Слушатель',
        role: 'listener',
        avatar: '👩',
        rating: 4.8,
        ratingCount: 25,
        isOnline: false
    }
];

let chats = [];
let ratings = [];
let notifications = [];

// Генератор ID
function generateId() {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

// Socket соединения
io.on('connection', (socket) => {
    console.log('🔗 Новое подключение:', socket.id);

    // Авторизация
    socket.on('login', (data) => {
        const user = users.find(u => u.username === data.username && u.password === data.password);
        if (user) {
            user.isOnline = true;
            user.socketId = socket.id;
            socket.emit('login_success', { user });
            socket.broadcast.emit('user_connected', { user });
            console.log('✅ Успешный вход:', user.username);
        } else {
            socket.emit('login_error', 'Неверный логин или пароль');
        }
    });

    // Регистрация
    socket.on('register', (data) => {
        const existingUser = users.find(u => u.username === data.username);
        if (existingUser) {
            socket.emit('registration_error', 'Пользователь с таким логином уже существует');
            return;
        }

        const newUser = {
            id: generateId(),
            username: data.username,
            password: data.password,
            displayName: data.username,
            role: data.role || 'user',
            avatar: '👤',
            rating: 0,
            ratingCount: 0,
            isOnline: true,
            socketId: socket.id
        };

        users.push(newUser);
        socket.emit('registration_success', { user: newUser });
        socket.broadcast.emit('user_connected', { user: newUser });
        console.log('✅ Новый пользователь:', newUser.username);
    });

    // Восстановление сессии
    socket.on('restore_session', (data) => {
        const user = users.find(u => u.id === data.userId);
        if (user) {
            user.isOnline = true;
            user.socketId = socket.id;
            socket.emit('login_success', { user });
            socket.broadcast.emit('user_connected', { user });
        }
    });

    // Получение данных
    socket.on('get_users', () => {
        socket.emit('users_list', { users });
    });

    socket.on('get_chats', () => {
        socket.emit('chats_list', { chats });
    });

    socket.on('get_ratings', () => {
        socket.emit('ratings_list', { ratings });
    });

    socket.on('get_notifications', () => {
        socket.emit('notifications_list', { notifications });
    });

    // Создание чата
    socket.on('create_chat', (data) => {
        const chat = {
            id: generateId(),
            user1: data.user1,
            user2: data.user2,
            startTime: new Date(),
            isActive: true,
            messages: []
        };

        chats.push(chat);
        
        const listener = users.find(u => u.id === data.user2);
        socket.emit('chat_created', { 
            chat, 
            listenerName: listener?.displayName || 'Слушатель' 
        });
        
        // Уведомляем слушателя
        const listenerSocket = io.sockets.sockets.get(listener?.socketId);
        if (listenerSocket) {
            listenerSocket.emit('chat_created', { 
                chat, 
                listenerName: listener?.displayName || 'Слушатель' 
            });
        }
    });

    // Отправка сообщения
    socket.on('send_message', (data) => {
        const chat = chats.find(c => c.id === data.chatId);
        if (chat) {
            const message = {
                ...data.message,
                id: generateId()
            };
            
            if (!chat.messages) chat.messages = [];
            chat.messages.push(message);
            
            // Отправляем сообщение всем участникам чата
            io.emit('new_message', {
                chatId: data.chatId,
                message: message
            });
        }
    });

    // Отправка оценки
    socket.on('submit_rating', (data) => {
        const rating = {
            id: generateId(),
            listenerId: data.listenerId,
            userId: data.userId,
            rating: data.rating,
            comment: data.comment,
            timestamp: new Date()
        };

        ratings.push(rating);
        
        // Обновляем рейтинг слушателя
        const listenerRatings = ratings.filter(r => r.listenerId === data.listenerId);
        const totalRating = listenerRatings.reduce((sum, r) => sum + r.rating, 0);
        const avgRating = totalRating / listenerRatings.length;
        
        const listener = users.find(u => u.id === data.listenerId);
        if (listener) {
            listener.rating = avgRating;
            listener.ratingCount = listenerRatings.length;
        }

        socket.emit('rating_submitted', {
            rating,
            newRating: avgRating,
            ratingCount: listenerRatings.length
        });

        // Уведомляем слушателя
        const listenerSocket = io.sockets.sockets.get(listener?.socketId);
        if (listenerSocket) {
            listenerSocket.emit('rating_received', { rating });
        }
    });

    // Обновление профиля
    socket.on('update_profile', (data) => {
        const user = users.find(u => u.id === data.userId);
        if (user) {
            Object.assign(user, data);
            socket.emit('profile_updated', { user });
            socket.broadcast.emit('user_updated', { user });
        } else {
            socket.emit('profile_update_error', 'Пользователь не найден');
        }
    });

    // Отключение
    socket.on('disconnect', () => {
        console.log('🔌 Отключение:', socket.id);
        const user = users.find(u => u.socketId === socket.id);
        if (user) {
            user.isOnline = false;
            user.socketId = null;
            socket.broadcast.emit('user_disconnected', { userId: user.id });
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Сервер запущен на порту ${PORT}`);
});
