const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Файлы данных
const DATA_DIR = './data';
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const CHATS_FILE = path.join(DATA_DIR, 'chats.json');

// Инициализация
function initializeFiles() {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    const files = [
        { name: USERS_FILE, default: [] },
        { name: CHATS_FILE, default: [] }
    ];

    files.forEach(file => {
        if (!fs.existsSync(file.name)) {
            fs.writeFileSync(file.name, JSON.stringify(file.default, null, 2));
        }
    });

    // Создание тестовых пользователей
    const users = getUsers();
    const defaultUsers = [
        {
            id: 'owner-1',
            username: 'owner',
            password: 'owner123',
            role: 'owner',
            displayName: 'Владелец Системы',
            avatar: '👑',
            rating: 5.0,
            ratingCount: 0,
            isOnline: false,
            socketId: null,
            createdAt: new Date().toISOString()
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

// Функции работы с данными
function getUsers() {
    try {
        return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    } catch {
        return [];
    }
}

function getChats() {
    try {
        return JSON.parse(fs.readFileSync(CHATS_FILE, 'utf8'));
    } catch {
        return [];
    }
}

function saveUsers(users) {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

function saveChats(chats) {
    fs.writeFileSync(CHATS_FILE, JSON.stringify(chats, null, 2));
}

function generateId() {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

function getUserById(userId) {
    return getUsers().find(u => u.id === userId);
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

// Socket.IO
io.on('connection', (socket) => {
    console.log('🔗 Подключение:', socket.id);

    // Отправка начальных данных
    socket.emit('users_list', { users: getUsers().map(u => {
        const { password, socketId, ...user } = u;
        return user;
    })});
    socket.emit('chats_list', { chats: getChats() });

    // Восстановление сессии
    socket.on('restore_session', (data) => {
        const user = getUserById(data.userId);
        if (user) {
            updateUser(user.id, { isOnline: true, socketId: socket.id });
            const { password, socketId, ...userData } = user;
            socket.emit('session_restored', { success: true, user: userData });
            broadcastUsers();
        }
    });

    // Вход
    socket.on('login', (data) => {
        const users = getUsers();
        const user = users.find(u => u.username === data.username && u.password === data.password);
        
        if (!user) {
            socket.emit('login_error', 'Неверный логин или пароль');
            return;
        }

        updateUser(user.id, { isOnline: true, socketId: socket.id });
        const { password, socketId, ...userData } = user;
        socket.emit('login_success', { user: userData });
        broadcastUsers();
    });

    // Регистрация
    socket.on('register', (data) => {
        const users = getUsers();
        
        if (users.find(u => u.username === data.username)) {
            socket.emit('registration_error', 'Пользователь уже существует');
            return;
        }

        const newUser = {
            id: generateId(),
            username: data.username,
            password: data.password,
            role: data.role || 'user',
            displayName: data.username,
            avatar: '👤',
            rating: 0,
            ratingCount: 0,
            isOnline: true,
            socketId: socket.id,
            createdAt: new Date().toISOString()
        };

        users.push(newUser);
        saveUsers(users);
        
        const { password, socketId, ...userData } = newUser;
        socket.emit('registration_success', { user: userData });
        broadcastUsers();
    });

    // Добавление сотрудника
    socket.on('register_staff', (data) => {
        const users = getUsers();
        
        if (users.find(u => u.username === data.username)) {
            socket.emit('staff_register_error', 'Пользователь уже существует');
            return;
        }

        const newStaff = {
            id: generateId(),
            username: data.username,
            password: data.password,
            role: data.role,
            displayName: data.displayName,
            avatar: data.role === 'admin' ? '⚙️' : '🎧',
            rating: 0,
            ratingCount: 0,
            isOnline: false,
            socketId: null,
            createdAt: new Date().toISOString()
        };

        users.push(newStaff);
        saveUsers(users);
        
        const { password, socketId, ...staffData } = newStaff;
        socket.emit('staff_registered', { user: staffData });
        broadcastUsers();
    });

    // Смена роли
    socket.on('change_role', (data) => {
        const updatedUser = updateUser(data.userId, { 
            role: data.newRole,
            avatar: data.newRole === 'admin' ? '⚙️' : data.newRole === 'listener' ? '🎧' : '👤'
        });
        
        if (updatedUser) {
            const { password, socketId, ...userData } = updatedUser;
            socket.emit('role_changed', { userId: data.userId, newRole: data.newRole, user: userData });
            broadcastUsers();
        }
    });

    // Создание чата
    socket.on('create_chat', (data) => {
        const chats = getChats();
        const user1 = getUserById(data.user1);
        const user2 = getUserById(data.user2);
        
        if (!user1 || !user2) {
            socket.emit('chat_create_error', 'Пользователь не найден');
            return;
        }

        const existingChat = chats.find(chat => 
            chat.isActive && 
            ((chat.user1 === data.user1 && chat.user2 === data.user2) || 
             (chat.user1 === data.user2 && chat.user2 === data.user1))
        );

        if (existingChat) {
            socket.emit('chat_exists', { chat: existingChat });
            return;
        }

        const newChat = {
            id: generateId(),
            user1: data.user1,
            user2: data.user2,
            messages: [],
            startTime: new Date().toISOString(),
            isActive: true,
            createdAt: new Date().toISOString()
        };

        chats.push(newChat);
        saveChats(chats);

        socket.emit('chat_created', { 
            chat: newChat, 
            listenerName: user2.displayName 
        });

        // Уведомление слушателя
        if (user2.socketId) {
            io.to(user2.socketId).emit('chat_created', { 
                chat: newChat, 
                userName: user1.displayName 
            });
        }

        broadcastChats();
    });

    // Отправка сообщения
    socket.on('send_message', (data) => {
        const chats = getChats();
        const chat = chats.find(c => c.id === data.chatId);
        
        if (!chat) return;

        const newMessage = {
            id: generateId(),
            text: data.message.text,
            senderId: data.message.senderId,
            timestamp: new Date().toISOString(),
            type: 'text'
        };

        if (!chat.messages) chat.messages = [];
        chat.messages.push(newMessage);
        saveChats(chats);

        // Отправка сообщения участникам чата
        const targetUserId = data.message.senderId === chat.user1 ? chat.user2 : chat.user1;
        const targetUser = getUserById(targetUserId);
        
        if (targetUser && targetUser.socketId) {
            io.to(targetUser.socketId).emit('new_message', { 
                chatId: data.chatId, 
                message: newMessage 
            });
        }

        // Отправка отправителю для мгновенного отображения
        socket.emit('new_message', { 
            chatId: data.chatId, 
            message: newMessage 
        });

        broadcastChats();
    });

    // Модерация
    socket.on('apply_moderation', (data) => {
        const user = getUserById(data.userId);
        if (!user) return;

        let updates = {};
        switch (data.action) {
            case 'block':
                updates.isBlocked = true;
                break;
            case 'remove_block':
                updates.isBlocked = false;
                break;
            case 'warning':
                updates.warnings = (user.warnings || 0) + 1;
                break;
            case 'remove_warning':
                updates.warnings = Math.max(0, (user.warnings || 0) - 1);
                break;
            case 'vacation':
                updates.isOnVacation = true;
                break;
        }

        updateUser(data.userId, updates);
        socket.emit('moderation_applied', { record: data });
        broadcastUsers();
    });

    // Запросы данных
    socket.on('get_users', () => {
        socket.emit('users_list', { users: getUsers().map(u => {
            const { password, socketId, ...user } = u;
            return user;
        })});
    });

    socket.on('get_chats', () => {
        socket.emit('chats_list', { chats: getChats() });
    });

    // Отключение
    socket.on('disconnect', () => {
        const users = getUsers();
        const user = users.find(u => u.socketId === socket.id);
        if (user) {
            updateUser(user.id, { isOnline: false, socketId: null });
            broadcastUsers();
        }
    });
});

// Вспомогательные функции
function broadcastUsers() {
    io.emit('users_list', { users: getUsers().map(u => {
        const { password, socketId, ...user } = u;
        return user;
    })});
}

function broadcastChats() {
    io.emit('chats_list', { chats: getChats() });
}

// Маршруты
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Запуск
initializeFiles();
server.listen(PORT, () => {
    console.log(`🚀 Сервер запущен на порту ${PORT}`);
    console.log(`📊 Пользователей: ${getUsers().length}`);
    console.log(`💬 Чатов: ${getChats().length}`);
});
