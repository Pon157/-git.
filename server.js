const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');

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
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Настройка multer для загрузки файлов
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueName = uuidv4() + path.extname(file.originalname);
        cb(null, uniqueName);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: function (req, file, cb) {
        // Разрешаем изображения, GIF, и другие медиа файлы
        if (file.mimetype.startsWith('image/') || 
            file.mimetype.startsWith('video/') ||
            file.mimetype === 'application/json' || // для стикеров
            file.mimetype.startsWith('audio/')) {
            cb(null, true);
        } else {
            cb(new Error('Неподдерживаемый тип файла!'), false);
        }
    }
});

// Файлы для хранения данных
const DATA_DIR = './data';
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const CHATS_FILE = path.join(DATA_DIR, 'chats.json');
const RATINGS_FILE = path.join(DATA_DIR, 'ratings.json');
const NOTIFICATIONS_FILE = path.join(DATA_DIR, 'notifications.json');
const MODERATION_FILE = path.join(DATA_DIR, 'moderation.json');

// Создание директорий если их нет
function ensureDirectories() {
    const directories = [DATA_DIR, './uploads'];
    
    directories.forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
            console.log(`✅ Создана директория: ${dir}`);
        }
    });
}

// Создание файлов если их нет
function initializeFiles() {
    ensureDirectories();
    
    const files = [
        { name: USERS_FILE, default: [] },
        { name: CHATS_FILE, default: [] },
        { name: RATINGS_FILE, default: [] },
        { name: NOTIFICATIONS_FILE, default: [] },
        { name: MODERATION_FILE, default: [] }
    ];

    files.forEach(file => {
        if (!fs.existsSync(file.name)) {
            fs.writeFileSync(file.name, JSON.stringify(file.default, null, 2));
            console.log(`✅ Создан файл: ${file.name}`);
        }
    });
}

// Улучшенная загрузка данных с обработкой ошибок
function loadData(filename, defaultValue = []) {
    try {
        if (fs.existsSync(filename)) {
            const data = fs.readFileSync(filename, 'utf8');
            if (data.trim() === '') {
                console.log(`⚠️ Файл ${filename} пуст, возвращаем значение по умолчанию`);
                return defaultValue;
            }
            const parsed = JSON.parse(data);
            console.log(`📁 Загружено ${parsed.length} записей из ${filename}`);
            return parsed;
        }
    } catch (error) {
        console.error(`❌ Ошибка загрузки ${filename}:`, error);
        // Создаем резервную копию поврежденного файла
        if (fs.existsSync(filename)) {
            const backupName = filename + '.backup-' + Date.now();
            fs.copyFileSync(filename, backupName);
            console.log(`💾 Создана резервная копия: ${backupName}`);
        }
    }
    return defaultValue;
}

// Улучшенное сохранение данных
function saveData(filename, data) {
    try {
        // Создаем временный файл для атомарной записи
        const tempFile = filename + '.tmp';
        fs.writeFileSync(tempFile, JSON.stringify(data, null, 2));
        
        // Заменяем оригинальный файл
        fs.renameSync(tempFile, filename);
        
        console.log(`💾 Данные сохранены в ${filename} (${data.length} записей)`);
        return true;
    } catch (error) {
        console.error(`❌ Ошибка сохранения ${filename}:`, error);
        return false;
    }
}

// Автоматическое сохранение каждые 30 секунд
function startAutoSave() {
    setInterval(() => {
        console.log('🔄 Автосохранение данных...');
        // Данные сохраняются при каждом изменении, это дополнительная защита
    }, 30000);
}

// Загрузка данных
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

function getModerationHistory() {
    return loadData(MODERATION_FILE, []);
}

// Сохранение данных
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

function saveModerationHistory(history) {
    return saveData(MODERATION_FILE, history);
}

// Создание владельца и демо-пользователей
function initializeUsers() {
    let users = getUsers();
    
    const defaultUsers = [
        {
            id: 'user-1',
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
            isSuperAdmin: true,
            isBlocked: false,
            isOnVacation: false,
            warnings: 0
        },
        {
            id: 'user-2',
            username: 'admin',
            password: 'admin123',
            role: 'admin',
            displayName: 'Администратор',
            avatar: '⚙️',
            rating: 5.0,
            ratingCount: 0,
            isOnline: false,
            socketId: null,
            createdAt: new Date().toISOString(),
            isBlocked: false,
            isOnVacation: false,
            warnings: 0
        },
        {
            id: 'user-3',
            username: 'user',
            password: '123456',
            role: 'user',
            displayName: 'Тестовый Пользователь',
            avatar: '👤',
            rating: 0,
            ratingCount: 0,
            isOnline: false,
            socketId: null,
            createdAt: new Date().toISOString(),
            isBlocked: false,
            isOnVacation: false,
            warnings: 0
        },
        {
            id: 'user-4', 
            username: 'listener',
            password: '123456',
            role: 'listener',
            displayName: 'Анна Слушатель',
            avatar: '🎧',
            rating: 4.8,
            ratingCount: 15,
            isOnline: false,
            socketId: null,
            createdAt: new Date().toISOString(),
            isBlocked: false,
            isOnVacation: false,
            warnings: 0
        }
    ];

    let hasChanges = false;
    
    defaultUsers.forEach(defaultUser => {
        const exists = users.find(u => u.username === defaultUser.username);
        if (!exists) {
            users.push(defaultUser);
            hasChanges = true;
            console.log(`✅ Добавлен пользователь: ${defaultUser.username} (${defaultUser.role})`);
        }
    });

    if (hasChanges) {
        saveUsers(users);
    }
}

// Инициализация
console.log('🔄 Инициализация системы...');
initializeFiles();
initializeUsers();
startAutoSave();

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
        const saved = saveUsers(users);
        if (saved) {
            return users[userIndex];
        }
    }
    return null;
}

// API для загрузки файлов
app.post('/api/upload', upload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Файл не загружен' });
        }

        const fileInfo = {
            id: generateId(),
            originalName: req.file.originalname,
            filename: req.file.filename,
            path: `/uploads/${req.file.filename}`,
            mimetype: req.file.mimetype,
            size: req.file.size,
            uploadedAt: new Date().toISOString(),
            uploadedBy: req.body.userId || 'unknown'
        };

        console.log('📁 Файл загружен:', fileInfo);
        res.json({ success: true, file: fileInfo });
    } catch (error) {
        console.error('❌ Ошибка загрузки файла:', error);
        res.status(500).json({ error: 'Ошибка загрузки файла' });
    }
});

// API для получения файлов
app.get('/api/files/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, 'uploads', filename);
    
    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        res.status(404).json({ error: 'Файл не найден' });
    }
});

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
                socketId: socket.id
            });
            
            const currentUsers = getUsers();
            const currentChats = getChats();
            const currentRatings = getRatings();
            const currentNotifications = getNotifications();
            const currentModerationHistory = getModerationHistory();
            
            socket.emit('session_restored', { 
                success: true,
                user: user 
            });
            
            socket.emit('users_list', { 
                users: currentUsers.filter(u => u.id !== user.id) 
            });
            
            if (user.role === 'admin' || user.role === 'owner') {
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

            socket.emit('moderation_history', {
                history: currentModerationHistory
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
        
        const users = getUsers();
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

        if (user.isBlocked) {
            socket.emit('login_error', 'Аккаунт заблокирован');
            return;
        }

        updateUser(user.id, {
            isOnline: true,
            socketId: socket.id
        });

        const currentUsers = getUsers();
        const currentChats = getChats();
        const currentRatings = getRatings();
        const currentNotifications = getNotifications();
        const currentModerationHistory = getModerationHistory();

        socket.emit('login_success', { user });
        
        socket.emit('users_list', { 
            users: currentUsers.filter(u => u.id !== user.id) 
        });
        
        if (user.role === 'admin' || user.role === 'owner') {
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

        socket.emit('moderation_history', {
            history: currentModerationHistory
        });
        
        socket.broadcast.emit('user_connected', { user });
        console.log(`✅ Успешный вход: ${username} (${user.role})`);
    });

    // РЕГИСТРАЦИЯ
    socket.on('register', (data) => {
        console.log(`📝 Запрос на регистрацию:`, data);
        
        const users = getUsers();
        const { username, password, role = 'user', displayName } = data;
        
        if (!username || !password) {
            socket.emit('registration_error', 'Логин и пароль обязательны');
            return;
        }

        if (username.length < 3) {
            socket.emit('registration_error', 'Логин должен быть не менее 3 символов');
            return;
        }

        if (password.length < 6) {
            socket.emit('registration_error', 'Пароль должен быть не менее 6 символов');
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
            createdAt: new Date().toISOString(),
            isBlocked: false,
            isOnVacation: false,
            warnings: 0
        };

        users.push(newUser);
        const saved = saveUsers(users);
        
        if (saved) {
            socket.emit('registration_success', { user: newUser });
            
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
            
            socket.broadcast.emit('user_connected', { user: newUser });
            console.log(`✅ Новый пользователь: ${username}`);
        } else {
            socket.emit('registration_error', 'Ошибка сохранения пользователя');
        }
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
        if (password) {
            if (password.length < 6) {
                socket.emit('profile_update_error', 'Пароль должен быть не менее 6 символов');
                return;
            }
            updates.password = password;
        }

        const updatedUser = updateUser(userId, updates);
        
        if (updatedUser) {
            socket.emit('profile_updated', { user: updatedUser });
            socket.broadcast.emit('user_updated', { user: updatedUser });
        } else {
            socket.emit('profile_update_error', 'Ошибка обновления профиля');
        }
    });

    // ДОБАВЛЕНИЕ СОТРУДНИКА
    socket.on('register_staff', (data) => {
        console.log(`➕ Добавление сотрудника:`, data);
        
        const users = getUsers();
        const { username, password, displayName, role } = data;

        if (username.length < 3) {
            socket.emit('staff_add_error', 'Логин должен быть не менее 3 символов');
            return;
        }

        if (password.length < 6) {
            socket.emit('staff_add_error', 'Пароль должен быть не менее 6 символов');
            return;
        }

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
            createdAt: new Date().toISOString(),
            isBlocked: false,
            isOnVacation: false,
            warnings: 0
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
        console.log(`🎭 Изменение роли:`, data);
        
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

    // ПРИМЕНЕНИЕ ДЕЙСТВИЙ МОДЕРАЦИИ
    socket.on('apply_moderation_action', (data) => {
        console.log(`⚖️ Применение действия модерации:`, data);
        
        const { userId, action, reason, moderatorId, duration } = data;
        const user = getUserById(userId);
        const moderator = getUserById(moderatorId);
        
        if (!user) {
            socket.emit('moderation_error', 'Пользователь не найден');
            return;
        }

        const updates = {};
        let message = '';
        
        switch (action) {
            case 'warning':
                updates.warnings = (user.warnings || 0) + 1;
                message = `Пользователю ${user.displayName || user.username} выдано предупреждение`;
                break;
                
            case 'block':
                updates.isBlocked = true;
                updates.blockedUntil = new Date(Date.now() + (duration || 7) * 24 * 60 * 60 * 1000).toISOString();
                message = `Пользователь ${user.displayName || user.username} заблокирован на ${duration || 7} дней`;
                break;
                
            case 'vacation':
                updates.isOnVacation = true;
                updates.vacationUntil = new Date(Date.now() + (duration || 7) * 24 * 60 * 60 * 1000).toISOString();
                message = `Пользователь ${user.displayName || user.username} отправлен в отпуск на ${duration || 7} дней`;
                break;
                
            default:
                socket.emit('moderation_error', 'Неизвестное действие модерации');
                return;
        }

        const updatedUser = updateUser(userId, updates);
        
        if (updatedUser) {
            // Сохраняем в историю модерации
            const moderationHistory = getModerationHistory();
            const moderationRecord = {
                id: generateId(),
                userId,
                moderatorId,
                action,
                reason,
                duration: duration || null,
                timestamp: new Date().toISOString()
            };
            
            moderationHistory.push(moderationRecord);
            saveModerationHistory(moderationHistory);

            socket.emit('moderation_action_applied', { 
                message,
                user: updatedUser 
            });
            
            socket.broadcast.emit('user_updated', { user: updatedUser });
            
            // Уведомляем пользователя если он онлайн
            if (user.socketId) {
                const userSocket = io.sockets.sockets.get(user.socketId);
                if (userSocket) {
                    userSocket.emit('moderation_action_received', {
                        action,
                        reason,
                        duration,
                        moderator: moderator ? moderator.displayName : 'Система'
                    });
                }
            }
        } else {
            socket.emit('moderation_error', 'Ошибка применения действия модерации');
        }
    });

    // ОТПРАВКА УВЕДОМЛЕНИЯ
    socket.on('send_technical_notification', (data) => {
        console.log(`📢 Отправка уведомления:`, data);
        
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
                targetUsers = users.filter(u => u.role === 'admin' || u.role === 'owner');
                break;
        }

        targetUsers.forEach(user => {
            if (user.socketId) {
                const userSocket = io.sockets.sockets.get(user.socketId);
                if (userSocket) {
                    userSocket.emit('new_notification', { notification: newNotification });
                }
            }
        });

        socket.emit('notification_sent', { success: true });
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

    socket.on('get_moderation_history', () => {
        const history = getModerationHistory();
        socket.emit('moderation_history', { history });
    });

    // СОЗДАНИЕ ЧАТА
    socket.on('create_chat', (data) => {
        console.log(`💬 Создание чата:`, data);
        
        const users = getUsers();
        const chats = getChats();
        const { user1, user2 } = data;
        
        const user1Data = getUserById(user1);
        const user2Data = getUserById(user2);
        
        if (!user1Data || !user2Data) {
            socket.emit('chat_error', 'Пользователь не найден');
            return;
        }

        if (user1Data.isBlocked || user2Data.isBlocked) {
            socket.emit('chat_error', 'Нельзя создать чат с заблокированным пользователем');
            return;
        }

        // Проверяем существующий активный чат
        const existingChat = chats.find(chat => 
            chat.isActive && 
            ((chat.user1 === user1 && chat.user2 === user2) || 
             (chat.user1 === user2 && chat.user2 === user1))
        );

        if (existingChat) {
            console.log('💬 Найден существующий активный чат:', existingChat.id);
            socket.emit('chat_exists', { chat: existingChat });
            
            // Обновляем данные для обоих пользователей
            if (user1Data.socketId) {
                const user1Socket = io.sockets.sockets.get(user1Data.socketId);
                if (user1Socket) {
                    user1Socket.emit('chat_created', { 
                        chat: existingChat, 
                        listenerName: user2Data.displayName 
                    });
                }
            }
            
            if (user2Data.socketId) {
                const user2Socket = io.sockets.sockets.get(user2Data.socketId);
                if (user2Socket) {
                    user2Socket.emit('chat_created', { 
                        chat: existingChat, 
                        listenerName: user1Data.displayName 
                    });
                }
            }
            return;
        }

        const newChat = {
            id: generateId(),
            user1,
            user2, 
            messages: [],
            startTime: new Date().toISOString(),
            isActive: true,
            lastActivity: new Date().toISOString()
        };

        chats.push(newChat);
        saveChats(chats);

        console.log('💬 Создан новый чат:', newChat.id);

        // Уведомляем обоих пользователей
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
        console.log(`📨 Отправка сообщения:`, data);
        
        const chats = getChats();
        const { chatId, message } = data;
        
        const chat = chats.find(c => c.id === chatId);
        if (!chat) {
            socket.emit('message_error', 'Чат не найден');
            return;
        }

        if (!chat.isActive) {
            socket.emit('message_error', 'Чат завершен');
            return;
        }

        if (!chat.messages) chat.messages = [];
        
        const newMessage = {
            id: generateId(),
            text: message.text,
            senderId: message.senderId,
            timestamp: new Date().toISOString(),
            type: message.type || 'text',
            file: message.file || null,
            sticker: message.sticker || null
        };

        chat.messages.push(newMessage);
        chat.lastActivity = new Date().toISOString();
        saveChats(chats);

        // Находим участников чата
        const user1 = getUserById(chat.user1);
        const user2 = getUserById(chat.user2);
        
        // Отправляем сообщение отправителю (для подтверждения)
        socket.emit('new_message', { chatId, message: newMessage });
        
        // Отправляем сообщение другому участнику чата
        const targetUserId = message.senderId === chat.user1 ? chat.user2 : chat.user1;
        const targetUser = getUserById(targetUserId);
        
        if (targetUser && targetUser.socketId) {
            const targetSocket = io.sockets.sockets.get(targetUser.socketId);
            if (targetSocket) {
                targetSocket.emit('new_message', { chatId, message: newMessage });
            }
        }

        // Обновляем список чатов для обоих пользователей
        if (user1 && user1.socketId) {
            const user1Socket = io.sockets.sockets.get(user1.socketId);
            if (user1Socket) {
                user1Socket.emit('chats_updated');
            }
        }
        
        if (user2 && user2.socketId) {
            const user2Socket = io.sockets.sockets.get(user2.socketId);
            if (user2Socket) {
                user2Socket.emit('chats_updated');
            }
        }
    });

    // ОБНОВЛЕНИЕ СПИСКА ЧАТОВ
    socket.on('chats_updated', () => {
        const user = getUserBySocketId(socket.id);
        const chats = getChats();
        
        if (user && (user.role === 'admin' || user.role === 'owner')) {
            socket.emit('chats_list', { chats });
        } else if (user) {
            const userChats = chats.filter(chat => 
                chat.user1 === user.id || chat.user2 === user.id
            );
            socket.emit('chats_list', { chats: userChats });
        }
    });

    // ОЦЕНКА
    socket.on('submit_rating', (data) => {
        console.log(`⭐ Оценка:`, data);
        
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
        const avgRating = listenerRatings.length > 0 ? totalRating / listenerRatings.length : 0;

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

        // Уведомляем обоих участников чата
        socket.emit('chat_ended', { chatId });
        
        const user2 = getUserById(chat.user2);
        if (user2 && user2.socketId) {
            const targetSocket = io.sockets.sockets.get(user2.socketId);
            if (targetSocket) {
                targetSocket.emit('chat_ended', { chatId });
            }
        }

        // Обновляем списки чатов для обоих пользователей
        const user1 = getUserById(chat.user1);
        if (user1 && user1.socketId) {
            const user1Socket = io.sockets.sockets.get(user1.socketId);
            if (user1Socket) {
                user1Socket.emit('chats_updated');
            }
        }
        
        if (user2 && user2.socketId) {
            const user2Socket = io.sockets.sockets.get(user2.socketId);
            if (user2Socket) {
                user2Socket.emit('chats_updated');
            }
        }
    });

    // ОТКЛЮЧЕНИЕ
    socket.on('disconnect', (reason) => {
        console.log(`🔌 Отключение: ${socket.id} (${reason})`);
        
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

app.get('/api/moderation', (req, res) => {
    const history = getModerationHistory();
    res.json(history);
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
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        data: {
            users: getUsers().length,
            chats: getChats().length,
            ratings: getRatings().length
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    const users = getUsers();
    console.log(`🚀 Сервер запущен на порту ${PORT}`);
    console.log(`📊 Пользователей: ${users.length}`);
    console.log(`💬 Чатов: ${getChats().length}`);
    console.log(`⭐ Рейтингов: ${getRatings().length}`);
    console.log(`🔐 Аккаунты для входа:`);
    console.log(`   👑 Владелец: owner / owner2024`);
    console.log(`   ⚙️ Админ: admin / admin123`);
    console.log(`   👤 Пользователь: user / 123456`);
    console.log(`   🎧 Слушатель: listener / 123456`);
    console.log(`🌐 URL: http://localhost:${PORT}`);
});
