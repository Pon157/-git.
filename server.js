const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const cors = require('cors');
const PermanentStorage = require('./permanent_storage');

const app = express();
const server = http.createServer(app);

// Инициализация постоянного хранилища
const storage = new PermanentStorage();

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
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

// Получение пользователя по socketId
function getUserBySocketId(socketId) {
    const users = storage.getUsers();
    return users.find(u => u.socketId === socketId);
}

// Получение пользователя по ID
function getUserById(userId) {
    const users = storage.getUsers();
    return users.find(u => u.id === userId);
}

// Обновление пользователя
function updateUser(userId, updates) {
    const users = storage.getUsers();
    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex !== -1) {
        users[userIndex] = { ...users[userIndex], ...updates };
        storage.saveUsers(users);
        return users[userIndex];
    }
    return null;
}

// Функция для возобновления чата
function resumeChat(chatId, userId) {
    const chats = storage.getChats();
    const chat = chats.find(c => c.id === chatId);
    
    if (!chat) return null;
    
    // Проверяем, имеет ли пользователь доступ к чату
    if (chat.user1 !== userId && chat.user2 !== userId) {
        return null;
    }
    
    // Если чат завершен, возобновляем его
    if (!chat.isActive) {
        chat.isActive = true;
        chat.lastActivity = new Date().toISOString();
        storage.saveChats(chats);
    }
    
    return chat;
}

// Socket.IO соединения
io.on('connection', (socket) => {
    console.log(`🔗 Новое подключение: ${socket.id}`);

    // ВОССТАНОВЛЕНИЕ СЕССИИ
    socket.on('restore_session', (data) => {
        console.log(`🔄 Попытка восстановления сессии:`, data);
        
        const user = getUserById(data.userId);
        
        if (user) {
            updateUser(user.id, {
                isOnline: true,
                socketId: socket.id,
                lastSeen: new Date().toISOString()
            });
            
            const currentUsers = storage.getUsers();
            const currentChats = storage.getChats();
            const currentRatings = storage.getRatings();
            const currentNotifications = storage.getNotifications();
            const settings = storage.getSettings();
            
            socket.emit('session_restored', { 
                success: true,
                user: user 
            });
            
            socket.emit('users_list', { 
                users: currentUsers.filter(u => u.id !== user.id) 
            });
            
            socket.emit('chats_list', { 
                chats: currentChats 
            });
            
            socket.emit('ratings_list', { 
                ratings: currentRatings 
            });

            socket.emit('notifications_list', {
                notifications: currentNotifications
            });

            socket.emit('settings_updated', {
                settings: settings
            });
            
            socket.broadcast.emit('user_connected', { user });
            console.log(`🔄 Сессия восстановлена: ${user.username} (${user.role})`);
        } else {
            socket.emit('session_restored', { 
                success: false,
                error: 'Пользователь не найден'
            });
        }
    });

    // ВХОД
    socket.on('login', (data) => {
        console.log(`🚪 Запрос на вход:`, data);
        
        const users = storage.getUsers();
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

        // Проверка блокировки
        if (user.isBlocked && user.blockedUntil && new Date(user.blockedUntil) > new Date()) {
            socket.emit('login_error', 'Аккаунт заблокирован до ' + new Date(user.blockedUntil).toLocaleDateString());
            return;
        }

        updateUser(user.id, {
            isOnline: true,
            socketId: socket.id,
            lastSeen: new Date().toISOString()
        });

        const currentUsers = storage.getUsers();
        const currentChats = storage.getChats();
        const currentRatings = storage.getRatings();
        const currentNotifications = storage.getNotifications();
        const settings = storage.getSettings();

        socket.emit('login_success', { user });
        
        socket.emit('users_list', { 
            users: currentUsers.filter(u => u.id !== user.id) 
        });
        
        socket.emit('chats_list', { 
            chats: currentChats 
        });
        
        socket.emit('ratings_list', { 
            ratings: currentRatings 
        });

        socket.emit('notifications_list', {
            notifications: currentNotifications
        });

        socket.emit('settings_updated', {
            settings: settings
        });
        
        socket.broadcast.emit('user_connected', { user });
        
        // Логируем вход
        storage.addSystemLog('user_login', user.id, {
            username: user.username,
            role: user.role
        });
        
        console.log(`✅ Успешный вход: ${username} (${user.role})`);
    });

    // РЕГИСТРАЦИЯ
    socket.on('register', (data) => {
        console.log(`📝 Запрос на регистрацию:`, data);
        
        const users = storage.getUsers();
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
            id: storage.generateId(),
            username,
            password,
            role: role || 'user',
            displayName: displayName || username,
            avatar: '👤',
            rating: 0,
            ratingCount: 0,
            isOnline: true,
            socketId: socket.id,
            createdAt: new Date().toISOString(),
            lastSeen: new Date().toISOString()
        };

        users.push(newUser);
        const saved = storage.saveUsers(users);
        
        if (saved) {
            socket.emit('registration_success', { user: newUser });
            
            const currentUsers = storage.getUsers();
            const currentChats = storage.getChats();
            const currentRatings = storage.getRatings();
            
            socket.emit('users_list', { 
                users: currentUsers.filter(u => u.id !== newUser.id) 
            });
            
            socket.emit('chats_list', { 
                chats: currentChats 
            });
            
            socket.emit('ratings_list', { 
                ratings: currentRatings 
            });
            
            socket.broadcast.emit('user_connected', { user: newUser });
            
            // Логируем регистрацию
            storage.addSystemLog('user_registration', newUser.id, {
                username: newUser.username,
                role: newUser.role
            });
            
            console.log(`✅ Новый пользователь: ${username}`);
        } else {
            socket.emit('registration_error', 'Ошибка сохранения пользователя');
        }
    });

    // ВОЗОБНОВЛЕНИЕ ЧАТА
    socket.on('resume_chat', (data) => {
        console.log(`🔄 Возобновление чата:`, data);
        
        const { chatId } = data;
        const user = getUserBySocketId(socket.id);
        
        if (!user) {
            socket.emit('chat_error', 'Пользователь не найден');
            return;
        }

        const chat = resumeChat(chatId, user.id);
        
        if (chat) {
            socket.emit('chat_resumed', { 
                chat: chat,
                success: true 
            });
            
            // Уведомляем второго участника если он онлайн
            const otherUserId = chat.user1 === user.id ? chat.user2 : chat.user1;
            const otherUser = getUserById(otherUserId);
            
            if (otherUser && otherUser.socketId) {
                const otherSocket = io.sockets.sockets.get(otherUser.socketId);
                if (otherSocket) {
                    otherSocket.emit('chat_resumed', { 
                        chat: chat,
                        success: true 
                    });
                }
            }
            
            console.log(`🔄 Чат возобновлен: ${chat.id}`);
        } else {
            socket.emit('chat_error', 'Чат не найден или нет доступа');
        }
    });

    // ОТПРАВКА СООБЩЕНИЯ С ФАЙЛАМИ И СТИКЕРАМИ
    socket.on('send_message', (data) => {
        console.log(`📨 Отправка сообщения:`, data);
        
        const chats = storage.getChats();
        const { chatId, message } = data;
        
        const chat = chats.find(c => c.id === chatId);
        if (!chat) {
            socket.emit('message_error', 'Чат не найден');
            return;
        }

        if (!chat.messages) chat.messages = [];
        
        const newMessage = {
            id: storage.generateId(),
            text: message.text,
            senderId: message.senderId,
            timestamp: new Date().toISOString(),
            type: message.type || 'text',
            fileData: message.fileData
        };

        chat.messages.push(newMessage);
        chat.lastActivity = new Date().toISOString();
        storage.saveChats(chats);

        const targetUserId = message.senderId === chat.user1 ? chat.user2 : chat.user1;
        const targetUser = getUserById(targetUserId);
        
        // Отправляем сообщение отправителю
        socket.emit('new_message', { chatId, message: newMessage });
        
        // Отправляем сообщение получателю
        if (targetUser && targetUser.socketId) {
            const targetSocket = io.sockets.sockets.get(targetUser.socketId);
            if (targetSocket) {
                targetSocket.emit('new_message', { chatId, message: newMessage });
            }
        }

        // Обновляем список чатов для всех участников
        io.emit('chats_list', { chats: storage.getChats() });
    });

    // СНЯТИЕ БЛОКИРОВКИ/ПРЕДУПРЕЖДЕНИЯ
    socket.on('remove_moderation', (data) => {
        console.log(`🔓 Снятие модерации:`, data);
        
        const { userId, action } = data;
        const moderator = getUserBySocketId(socket.id);
        const user = getUserById(userId);
        
        if (!user) {
            socket.emit('moderation_error', 'Пользователь не найден');
            return;
        }

        if (!moderator || (moderator.role !== 'admin' && moderator.role !== 'owner')) {
            socket.emit('moderation_error', 'Недостаточно прав');
            return;
        }

        const updates = {};
        const history = storage.getModerationHistory();
        
        const moderationRecord = {
            id: storage.generateId(),
            userId,
            moderatorId: moderator.id,
            action: `remove_${action}`,
            reason: 'Снятие ограничения',
            timestamp: new Date().toISOString()
        };

        switch (action) {
            case 'block':
                updates.isBlocked = false;
                updates.blockedUntil = null;
                moderationRecord.message = `Пользователь разблокирован модератором ${moderator.displayName}`;
                break;
                
            case 'warning':
                updates.warnings = 0;
                moderationRecord.message = `Все предупреждения сняты модератором ${moderator.displayName}`;
                break;
                
            case 'vacation':
                updates.isOnVacation = false;
                updates.vacationUntil = null;
                moderationRecord.message = `Отпуск отменен модератором ${moderator.displayName}`;
                break;
        }

        updateUser(userId, updates);
        history.push(moderationRecord);
        storage.saveModerationHistory(history);

        socket.emit('moderation_removed', {
            success: true,
            message: moderationRecord.message,
            user: getUserById(userId)
        });

        // Уведомляем пользователя если он онлайн
        if (user.socketId) {
            const userSocket = io.sockets.sockets.get(user.socketId);
            if (userSocket) {
                userSocket.emit('moderation_removed', {
                    action: action,
                    moderator: moderator.displayName
                });
            }
        }

        // Обновляем списки
        io.emit('users_list', { users: storage.getUsers() });
        io.emit('moderation_history', { history });
        
        // Логируем действие
        storage.addSystemLog('remove_moderation', moderator.id, {
            targetUser: user.username,
            action: action
        });
    });

    // УДАЛЕНИЕ АДМИНИСТРАТОРА (только для владельца)
    socket.on('remove_admin', (data) => {
        console.log(`👑 Удаление администратора:`, data);
        
        const { adminId } = data;
        const owner = getUserBySocketId(socket.id);
        const admin = getUserById(adminId);
        
        if (!owner || owner.role !== 'owner') {
            socket.emit('admin_remove_error', 'Только владелец может удалять администраторов');
            return;
        }

        if (!admin) {
            socket.emit('admin_remove_error', 'Администратор не найден');
            return;
        }

        if (admin.isPermanent) {
            socket.emit('admin_remove_error', 'Нельзя удалить постоянного администратора');
            return;
        }

        // Понижаем до пользователя
        const updatedAdmin = updateUser(adminId, { 
            role: 'user',
            avatar: '👤'
        });
        
        if (updatedAdmin) {
            socket.emit('admin_removed', { 
                userId: adminId,
                user: updatedAdmin 
            });
            
            // Уведомляем всех о изменении роли
            io.emit('user_updated', { user: updatedAdmin });
            io.emit('users_list', { users: storage.getUsers().filter(u => u.id !== owner.id) });
            
            // Логируем действие
            storage.addSystemLog('remove_admin', owner.id, {
                removedAdmin: admin.username
            });
            
            console.log(`👑 Администратор понижен: ${admin.username}`);
        } else {
            socket.emit('admin_remove_error', 'Ошибка при удалении администратора');
        }
    });

    // ОБНОВЛЕНИЕ НАСТРОЕК СИСТЕМЫ
    socket.on('update_settings', (data) => {
        console.log(`⚙️ Обновление настроек:`, data);
        
        const { settings } = data;
        const user = getUserBySocketId(socket.id);
        
        if (!user || (user.role !== 'admin' && user.role !== 'owner')) {
            socket.emit('settings_error', 'Недостаточно прав');
            return;
        }

        const currentSettings = storage.getSettings();
        const updatedSettings = { ...currentSettings, ...settings };
        
        if (storage.saveSettings(updatedSettings)) {
            socket.emit('settings_updated', { settings: updatedSettings });
            socket.broadcast.emit('settings_updated', { settings: updatedSettings });
            
            // Логируем изменение настроек
            storage.addSystemLog('update_settings', user.id, {
                changes: Object.keys(settings)
            });
            
            console.log('✅ Настройки системы обновлены');
        } else {
            socket.emit('settings_error', 'Ошибка сохранения настроек');
        }
    });

    // СОЗДАНИЕ РЕЗЕРВНОЙ КОПИИ
    socket.on('create_backup', () => {
        const user = getUserBySocketId(socket.id);
        
        if (!user || user.role !== 'owner') {
            socket.emit('backup_error', 'Только владелец может создавать резервные копии');
            return;
        }

        try {
            const backupFile = storage.createBackup();
            socket.emit('backup_created', { 
                success: true,
                file: backupFile,
                timestamp: new Date().toISOString()
            });
            
            console.log(`💾 Резервная копия создана: ${backupFile}`);
        } catch (error) {
            socket.emit('backup_error', 'Ошибка создания резервной копии');
        }
    });

    // ПОЛУЧЕНИЕ СИСТЕМНЫХ ЛОГОВ
    socket.on('get_system_logs', () => {
        const user = getUserBySocketId(socket.id);
        
        if (!user || user.role !== 'owner') {
            socket.emit('logs_error', 'Только владелец может просматривать логи системы');
            return;
        }

        const logs = storage.getSystemLogs();
        socket.emit('system_logs', { logs });
    });

    // Остальные обработчики (create_chat, end_chat, submit_rating, apply_moderation_action и т.д.)
    // остаются аналогичными, но используют storage вместо старых функций

    // ОТКЛЮЧЕНИЕ
    socket.on('disconnect', (reason) => {
        console.log(`🔌 Отключение: ${socket.id} - ${reason}`);
        
        const user = getUserBySocketId(socket.id);
        if (user) {
            updateUser(user.id, {
                isOnline: false,
                socketId: null,
                lastSeen: new Date().toISOString()
            });
            
            socket.broadcast.emit('user_disconnected', { userId: user.id });
        }
    });
});

// API маршруты
app.get('/api/users', (req, res) => {
    const users = storage.getUsers();
    res.json(users);
});

app.get('/api/chats', (req, res) => {
    const chats = storage.getChats();
    res.json(chats);
});

app.get('/api/ratings', (req, res) => {
    const ratings = storage.getRatings();
    res.json(ratings);
});

app.get('/api/notifications', (req, res) => {
    const notifications = storage.getNotifications();
    res.json(notifications);
});

app.get('/api/stats', (req, res) => {
    const users = storage.getUsers();
    const chats = storage.getChats();
    
    const stats = {
        totalUsers: users.length,
        totalListeners: users.filter(u => u.role === 'listener').length,
        totalAdmins: users.filter(u => u.role === 'admin').length,
        activeChats: chats.filter(c => c.isActive).length,
        onlineUsers: users.filter(u => u.isOnline).length,
        totalMessages: chats.reduce((total, chat) => total + (chat.messages?.length || 0), 0),
        systemUptime: process.uptime()
    };
    res.json(stats);
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        storage: 'permanent',
        dataSize: {
            users: storage.getUsers().length,
            chats: storage.getChats().length,
            ratings: storage.getRatings().length
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    const users = storage.getUsers();
    console.log(`🚀 Сервер запущен на порту ${PORT}`);
    console.log(`💾 Постоянное хранилище данных активировано`);
    console.log(`📊 Пользователей: ${users.length}`);
    console.log(`🔐 Аккаунты для входа:`);
    console.log(`   👑 Владелец: owner / owner2024`);
    console.log(`   ⚙️ Админ: admin / admin123`);
    console.log(`   👤 Пользователь: user / 123456`);
    console.log(`   🎧 Слушатель: listener / 123456`);
    console.log(`🌐 URL: http://localhost:${PORT}`);
});
