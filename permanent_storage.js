const fs = require('fs');
const path = require('path');

class PermanentStorage {
    constructor() {
        this.DATA_DIR = './permanent_data';
        this.USERS_FILE = path.join(this.DATA_DIR, 'users.json');
        this.CHATS_FILE = path.join(this.DATA_DIR, 'chats.json');
        this.RATINGS_FILE = path.join(this.DATA_DIR, 'ratings.json');
        this.NOTIFICATIONS_FILE = path.join(this.DATA_DIR, 'notifications.json');
        this.MODERATION_FILE = path.join(this.DATA_DIR, 'moderation.json');
        this.SETTINGS_FILE = path.join(this.DATA_DIR, 'settings.json');
        this.SYSTEM_LOGS_FILE = path.join(this.DATA_DIR, 'system_logs.json');
        
        this.initialize();
    }

    initialize() {
        // Создаем директорию если её нет
        if (!fs.existsSync(this.DATA_DIR)) {
            fs.mkdirSync(this.DATA_DIR, { recursive: true });
            console.log(`✅ Создана директория постоянных данных: ${this.DATA_DIR}`);
        }

        // Создаем файлы если их нет
        const files = [
            { name: this.USERS_FILE, default: [] },
            { name: this.CHATS_FILE, default: [] },
            { name: this.RATINGS_FILE, default: [] },
            { name: this.NOTIFICATIONS_FILE, default: [] },
            { name: this.MODERATION_FILE, default: [] },
            { name: this.SYSTEM_LOGS_FILE, default: [] },
            { name: this.SETTINGS_FILE, default: {
                fileUploads: true,
                maxFileSize: 10,
                allowedFileTypes: ['jpg', 'jpeg', 'png', 'gif', 'mp4', 'mov', 'avi'],
                stickers: ['😊', '😂', '😍', '😎', '😢', '😡', '🤔', '🎉', '❤️', '🔥', '👍', '👎'],
                systemName: 'Чат-система поддержки',
                welcomeMessage: 'Добро пожаловать в чат поддержки!',
                maxChatDuration: 60,
                autoEndChat: true
            }}
        ];

        files.forEach(file => {
            if (!fs.existsSync(file.name)) {
                fs.writeFileSync(file.name, JSON.stringify(file.default, null, 2));
                console.log(`✅ Создан постоянный файл: ${path.basename(file.name)}`);
            }
        });

        // Инициализируем пользователей по умолчанию
        this.initializeDefaultUsers();
    }

    initializeDefaultUsers() {
        let users = this.loadData(this.USERS_FILE);
        
        const defaultUsers = [
            {
                id: 'owner-001',
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
                lastSeen: new Date().toISOString(),
                isPermanent: true,
                permissions: ['all']
            },
            {
                id: 'admin-001',
                username: 'admin',
                password: 'admin123',
                role: 'admin',
                displayName: 'Главный Администратор',
                avatar: '⚙️',
                rating: 5.0,
                ratingCount: 0,
                isOnline: false,
                socketId: null,
                createdAt: new Date().toISOString(),
                lastSeen: new Date().toISOString(),
                isPermanent: true
            },
            {
                id: 'user-001',
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
                lastSeen: new Date().toISOString()
            },
            {
                id: 'listener-001',
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
                lastSeen: new Date().toISOString()
            }
        ];

        let hasChanges = false;
        
        defaultUsers.forEach(defaultUser => {
            const exists = users.find(u => u.username === defaultUser.username);
            if (!exists) {
                users.push(defaultUser);
                hasChanges = true;
                console.log(`✅ Добавлен постоянный пользователь: ${defaultUser.username}`);
            }
        });

        if (hasChanges) {
            this.saveData(this.USERS_FILE, users);
        }
    }

    // Базовые методы для работы с данными
    loadData(filename, defaultValue = []) {
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

    saveData(filename, data) {
        try {
            fs.writeFileSync(filename, JSON.stringify(data, null, 2));
            return true;
        } catch (error) {
            console.error(`❌ Ошибка сохранения ${filename}:`, error);
            return false;
        }
    }

    // Методы для пользователей
    getUsers() {
        return this.loadData(this.USERS_FILE);
    }

    saveUsers(users) {
        return this.saveData(this.USERS_FILE, users);
    }

    // Методы для чатов
    getChats() {
        return this.loadData(this.CHATS_FILE);
    }

    saveChats(chats) {
        return this.saveData(this.CHATS_FILE, chats);
    }

    // Методы для рейтингов
    getRatings() {
        return this.loadData(this.RATINGS_FILE);
    }

    saveRatings(ratings) {
        return this.saveData(this.RATINGS_FILE, ratings);
    }

    // Методы для уведомлений
    getNotifications() {
        return this.loadData(this.NOTIFICATIONS_FILE);
    }

    saveNotifications(notifications) {
        return this.saveData(this.NOTIFICATIONS_FILE, notifications);
    }

    // Методы для модерации
    getModerationHistory() {
        return this.loadData(this.MODERATION_FILE);
    }

    saveModerationHistory(history) {
        return this.saveData(this.MODERATION_FILE, history);
    }

    // Методы для настроек
    getSettings() {
        return this.loadData(this.SETTINGS_FILE, {});
    }

    saveSettings(settings) {
        return this.saveData(this.SETTINGS_FILE, settings);
    }

    // Методы для логов системы
    getSystemLogs() {
        return this.loadData(this.SYSTEM_LOGS_FILE);
    }

    saveSystemLogs(logs) {
        return this.saveData(this.SYSTEM_LOGS_FILE, logs);
    }

    addSystemLog(action, userId, details = {}) {
        const logs = this.getSystemLogs();
        const log = {
            id: this.generateId(),
            action,
            userId,
            timestamp: new Date().toISOString(),
            details
        };
        logs.push(log);
        this.saveSystemLogs(logs);
        return log;
    }

    // Утилиты
    generateId() {
        return Date.now().toString() + Math.random().toString(36).substr(2, 9);
    }

    // Резервное копирование
    createBackup() {
        const backupDir = './backups';
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }

        const backupFile = path.join(backupDir, `backup-${Date.now()}.json`);
        const backupData = {
            users: this.getUsers(),
            chats: this.getChats(),
            ratings: this.getRatings(),
            notifications: this.getNotifications(),
            moderation: this.getModerationHistory(),
            settings: this.getSettings(),
            timestamp: new Date().toISOString()
        };

        fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));
        console.log(`💾 Создана резервная копия: ${backupFile}`);
        return backupFile;
    }
}

module.exports = PermanentStorage;
