// app.js
let socket = null;
let connectionRetries = 0;
let currentUser = null;
let users = [];
let chats = [];
let ratings = [];
let notifications = [];
let activeChat = null;
let currentListener = null;
let chatStartTime = null;
let chatTimer = null;
let onlineTimeStart = null;
let onlineTimer = null;

// Основной модуль приложения
const app = {
    // Инициализация приложения
    init() {
        console.log('🚀 Инициализация приложения...');
        this.setupEventListeners();
        
        if (typeof settings !== 'undefined') {
            settings.loadUserPreferences();
        }
        
        this.connectToServer();
    },

    // Настройка обработчиков событий
    setupEventListeners() {
        console.log('🔧 Настройка обработчиков событий...');
        
        // Инициализация модулей
        if (typeof auth !== 'undefined') auth.init();
        if (typeof chat !== 'undefined') chat.init();
        if (typeof listeners !== 'undefined') listeners.init();
        if (typeof notifications !== 'undefined') notifications.init();
        if (typeof admin !== 'undefined') admin.init();
        if (typeof userSettings !== 'undefined') userSettings.init();
        if (typeof listenerSettings !== 'undefined') listenerSettings.init();
        if (typeof adminSettings !== 'undefined') adminSettings.init();

        // Табы пользователя - делегирование
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('tab') && e.target.closest('#userInterface')) {
                const tabName = e.target.getAttribute('data-tab');
                console.log('👤 Переключение таба пользователя:', tabName);
                if (typeof auth !== 'undefined') {
                    auth.showUserTab(tabName);
                }
            }
        });

        // Табы слушателя - делегирование
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('tab') && e.target.closest('#listenerInterface')) {
                const tabName = e.target.getAttribute('data-tab');
                console.log('🎧 Переключение таба слушателя:', tabName);
                if (typeof auth !== 'undefined') {
                    auth.showListenerTab(tabName);
                }
            }
        });

        // Навигация админки
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('nav-item') && e.target.hasAttribute('data-section')) {
                const section = e.target.getAttribute('data-section');
                console.log('👑 Переключение секции админки:', section);
                if (typeof admin !== 'undefined') {
                    admin.showSection(section);
                }
            }
        });
    },

    // Подключение к серверу
    connectToServer() {
        try {
            console.log('🔌 Подключение к серверу:', CONFIG.SERVER_URL);
            
            socket = io(CONFIG.SERVER_URL, {
                transports: ['websocket', 'polling'],
                timeout: 10000,
                reconnection: true,
                reconnectionAttempts: 10,
                reconnectionDelay: 1000,
                reconnectionDelayMax: 5000
            });

            // Делаем socket глобально доступным
            window.socket = socket;
            
            this.setupSocketEvents();

        } catch (error) {
            console.error('💥 Критическая ошибка при подключении:', error);
        }
    },

    // Настройка событий сокета
    setupSocketEvents() {
        if (!socket) return;

        socket.on('connect', () => {
            console.log('✅ Успешно подключено к серверу');
            connectionRetries = 0;
            utils.showNotification('✅ Подключено к серверу', 'success');
            
            // Запрашиваем данные после подключения
            setTimeout(() => {
                if (socket.connected) {
                    socket.emit('get_users');
                    socket.emit('get_chats');
                    socket.emit('get_ratings');
                    socket.emit('get_notifications');
                }
            }, 1000);
            
            // Восстанавливаем сессию если есть
            const savedUserId = localStorage.getItem('currentUserId');
            if (savedUserId) {
                console.log('🔄 Восстановление сессии для пользователя:', savedUserId);
                socket.emit('restore_session', { userId: savedUserId });
            }
        });

        socket.on('disconnect', (reason) => {
            console.log('❌ Отключено от сервера:', reason);
            if (reason === 'io server disconnect') {
                setTimeout(() => {
                    socket.connect();
                }, 1000);
            }
        });

        socket.on('connect_error', (error) => {
            console.error('Ошибка подключения:', error);
            connectionRetries++;
            
            if (connectionRetries <= CONFIG.MAX_RETRIES) {
                console.log(`🔄 Попытка переподключения ${connectionRetries}/${CONFIG.MAX_RETRIES}`);
                setTimeout(() => {
                    socket.connect();
                }, 2000);
            } else {
                utils.showNotification('❌ Не удалось подключиться к серверу. Проверьте интернет-соединение.', 'error');
            }
        });

        socket.on('reconnect', (attemptNumber) => {
            console.log('🔁 Переподключение успешно, попытка:', attemptNumber);
            utils.showNotification('✅ Соединение восстановлено', 'success');
            
            const savedUserId = localStorage.getItem('currentUserId');
            if (savedUserId && currentUser) {
                socket.emit('restore_session', { userId: savedUserId });
            }
        });

        // ОСНОВНЫЕ ОБРАБОТЧИКИ СОБЫТИЙ
        socket.on('login_success', (data) => {
            console.log('✅ Успешный вход:', data.user);
            if (typeof auth !== 'undefined') {
                auth.handleLoginSuccess(data.user);
            }
        });

        socket.on('login_error', (error) => {
            console.error('❌ Ошибка входа:', error);
            utils.showNotification('❌ ' + error, 'error');
            if (typeof auth !== 'undefined') {
                auth.restoreAuthButtons();
            }
        });

        socket.on('registration_success', (data) => {
            console.log('✅ Успешная регистрация:', data.user);
            utils.showNotification('✅ Регистрация успешна!', 'success');
            if (typeof auth !== 'undefined') {
                auth.handleLoginSuccess(data.user);
            }
        });

        socket.on('registration_error', (error) => {
            console.error('❌ Ошибка регистрации:', error);
            utils.showNotification('❌ ' + error, 'error');
            if (typeof auth !== 'undefined') {
                auth.restoreAuthButtons();
            }
        });

        socket.on('session_restored', (data) => {
            if (data.user) {
                console.log('🔄 Сессия восстановлена:', data.user);
                if (typeof auth !== 'undefined') {
                    auth.handleLoginSuccess(data.user);
                }
            }
        });

        // ДАННЫЕ
        socket.on('users_list', (data) => {
            console.log('📊 Получен список пользователей:', data.users?.length);
            users = data.users || [];
            this.updateUsersUI();
        });

        socket.on('chats_list', (data) => {
            console.log('💬 Получен список чатов:', data.chats?.length);
            chats = data.chats || [];
            this.updateChatsUI();
        });

        socket.on('ratings_list', (data) => {
            console.log('⭐ Получен список рейтингов:', data.ratings?.length);
            ratings = data.ratings || [];
            this.updateRatingsUI();
        });

        socket.on('notifications_list', (data) => {
            console.log('📢 Получен список уведомлений:', data.notifications?.length);
            notifications = data.notifications || [];
            if (typeof notifications !== 'undefined') {
                notifications.updateUI();
            }
        });

        socket.on('new_message', (data) => {
            console.log('📨 Новое сообщение:', data);
            if (typeof chat !== 'undefined') {
                chat.handleNewMessage(data);
            }
        });

        socket.on('chat_created', (data) => {
            console.log('💬 Чат создан:', data.chat);
            const existingChat = chats.find(chat => chat.id === data.chat.id);
            if (!existingChat) {
                chats.push(data.chat);
            }
            activeChat = data.chat;
            this.updateChatsUI();
            utils.showNotification(`💬 Чат начат с ${data.listenerName}`, 'success');
            
            // Фокусируемся на поле ввода сообщения
            setTimeout(() => {
                const input = document.getElementById('userMessageInput');
                if (input) input.focus();
            }, 100);
        });

        socket.on('user_connected', (data) => {
            console.log('🔗 Пользователь подключился:', data.user);
            const existingIndex = users.findIndex(u => u.id === data.user.id);
            if (existingIndex !== -1) {
                users[existingIndex] = { ...users[existingIndex], ...data.user, isOnline: true };
            } else {
                users.push({ ...data.user, isOnline: true });
            }
            this.updateUsersUI();
        });

        socket.on('user_disconnected', (data) => {
            console.log('🔌 Пользователь отключился:', data.userId);
            const user = users.find(u => u.id === data.userId);
            if (user) {
                user.isOnline = false;
            }
            this.updateUsersUI();
        });

        socket.on('user_updated', (data) => {
            console.log('📝 Пользователь обновлен:', data.user);
            const existingIndex = users.findIndex(u => u.id === data.user.id);
            if (existingIndex !== -1) {
                users[existingIndex] = data.user;
            }
            this.updateUsersUI();
        });

        socket.on('rating_submitted', (data) => {
            console.log('⭐ Рейтинг отправлен:', data);
            utils.showNotification('⭐ Рейтинг отправлен!', 'success');
            const listener = users.find(u => u.id === data.listenerId);
            if (listener) {
                listener.rating = data.newRating;
                listener.ratingCount = data.ratingCount;
            }
            this.updateUsersUI();
        });

        socket.on('rating_received', (data) => {
            console.log('⭐ Получен новый отзыв:', data);
            if (typeof chat !== 'undefined') {
                chat.updateListenerReviewsData();
            }
        });

        socket.on('staff_added', (data) => {
            console.log('➕ Сотрудник добавлен:', data);
            utils.showNotification('✅ Сотрудник добавлен', 'success');
            socket.emit('get_users');
        });

        socket.on('staff_add_error', (error) => {
            console.error('❌ Ошибка добавления сотрудника:', error);
            utils.showNotification('❌ ' + error, 'error');
        });

        socket.on('role_changed', (data) => {
            console.log('🎭 Роль изменена:', data);
            utils.showNotification(`✅ Роль пользователя изменена на ${utils.getRoleDisplayName(data.newRole)}`, 'success');
            socket.emit('get_users');
        });

        socket.on('chat_ended', (data) => {
            console.log('🚪 Чат завершен:', data.chatId);
            const chatObj = chats.find(c => c.id === data.chatId);
            if (chatObj) {
                chatObj.isActive = false;
            }
            if (activeChat && activeChat.id === data.chatId) {
                if (typeof chat !== 'undefined') {
                    chat.end();
                }
            }
            this.updateChatsUI();
        });

        socket.on('profile_updated', (data) => {
            console.log('✅ Профиль обновлен:', data.user);
            currentUser = data.user;
            localStorage.setItem('currentUser', JSON.stringify(data.user));
            utils.updateUserInterface();
            utils.showNotification('✅ Профиль успешно обновлен', 'success');
        });

        socket.on('profile_update_error', (error) => {
            console.error('❌ Ошибка обновления профиля:', error);
            utils.showNotification('❌ ' + error, 'error');
        });

        socket.on('notification_sent', (data) => {
            console.log('📢 Уведомление отправлено:', data);
            utils.showNotification('✅ Техническое уведомление отправлено', 'success');
            socket.emit('get_notifications');
        });

        socket.on('new_notification', (data) => {
            console.log('📢 Новое уведомление:', data);
            notifications.unshift(data.notification);
            if (typeof notifications !== 'undefined') {
                notifications.updateUI();
            }
            utils.showNotification(`📢 Новое уведомление: ${data.notification.title}`, 'info');
        });
    },

    // Обновить UI пользователей
    updateUsersUI() {
        if (!currentUser) return;

        if (currentUser.role === 'user') {
            if (typeof listeners !== 'undefined') {
                listeners.loadCards();
            }
        } else if (currentUser.role === 'listener') {
            if (typeof chat !== 'undefined') {
                chat.updateListenerChatsList();
                chat.updateListenerReviewsData();
                chat.updateListenerStats();
            }
        } else if (currentUser.role === 'admin' || currentUser.role === 'owner') {
            if (typeof admin !== 'undefined') {
                admin.updateData();
            }
        }
    },

    // Обновить UI чатов
    updateChatsUI() {
        if (currentUser) {
            if (currentUser.role === 'user' && activeChat) {
                const updatedChat = chats.find(c => c.id === activeChat.id);
                if (updatedChat) {
                    activeChat = updatedChat;
                    if (typeof chat !== 'undefined') {
                        chat.loadUserChatMessages();
                    }
                }
            } else if (currentUser.role === 'listener') {
                if (typeof chat !== 'undefined') {
                    chat.updateListenerChatsList();
                    if (activeChat) {
                        const updatedChat = chats.find(c => c.id === activeChat.id);
                        if (updatedChat) {
                            activeChat = updatedChat;
                            chat.loadListenerChatMessages();
                        }
                    }
                }
            } else if ((currentUser.role === 'admin' || currentUser.role === 'owner') && typeof admin !== 'undefined') {
                admin.updateAdminChatsList();
            }
        }
    },

    // Обновить UI рейтингов
    updateRatingsUI() {
        if (currentUser && currentUser.role === 'listener') {
            if (typeof chat !== 'undefined') {
                chat.updateListenerReviewsData();
            }
        }
    }
};

console.log('🎉 Приложение полностью загружено и готово к работе!');
