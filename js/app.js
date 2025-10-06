// Основной модуль приложения
const app = {
    // Инициализация приложения
    init() {
        console.log('🚀 Инициализация приложения...');
        this.setupEventListeners();
        settings.loadUserPreferences();
        this.connectToServer();
    },

    // Настройка обработчиков событий
    setupEventListeners() {
        // Инициализация модулей
        auth.init();
        chat.init();

        // Табы пользователя
        document.querySelectorAll('#userInterface .tab').forEach(tab => {
            tab.addEventListener('click', function() {
                const tabName = this.getAttribute('data-tab');
                app.showUserTab(tabName);
            });
        });

        // Табы слушателя
        document.querySelectorAll('#listenerInterface .tab').forEach(tab => {
            tab.addEventListener('click', function() {
                const tabName = this.getAttribute('data-tab');
                app.showListenerTab(tabName);
            });
        });

        // Навигация в админке
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', function() {
                const section = this.getAttribute('data-section');
                admin.showSection(section);
            });
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

            this.setupSocketEvents();
            
            // Запрашиваем данные после подключения
            setTimeout(() => {
                if (socket.connected) {
                    socket.emit('get_users');
                    socket.emit('get_chats');
                    socket.emit('get_ratings');
                    socket.emit('get_notifications');
                }
            }, 1000);

        } catch (error) {
            console.error('💥 Критическая ошибка при подключении:', error);
        }
    },

    // Настройка событий сокета
    setupSocketEvents() {
        socket.on('connect', () => {
            console.log('✅ Успешно подключено к серверу');
            connectionRetries = 0;
            utils.showNotification('✅ Подключено к серверу', 'success');
            
            // Восстанавливаем сессию если есть
            const savedUserId = localStorage.getItem('currentUserId');
            if (savedUserId) {
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
                }, CONFIG.RECONNECTION_DELAY);
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
            auth.handleLoginSuccess(data.user);
        });

        socket.on('login_error', (error) => {
            utils.showNotification('❌ ' + error, 'error');
        });

        socket.on('registration_success', (data) => {
            utils.showNotification('✅ Регистрация успешна!', 'success');
            auth.handleLoginSuccess(data.user);
        });

        socket.on('registration_error', (error) => {
            utils.showNotification('❌ ' + error, 'error');
        });

        socket.on('session_restored', (data) => {
            if (data.user) {
                auth.handleLoginSuccess(data.user);
            }
        });

        // ДАННЫЕ
        socket.on('users_list', (data) => {
            users = data.users || [];
            app.updateUsersUI();
        });

        socket.on('chats_list', (data) => {
            chats = data.chats || [];
            app.updateChatsUI();
        });

        socket.on('ratings_list', (data) => {
            ratings = data.ratings || [];
            app.updateRatingsUI();
        });

        socket.on('notifications_list', (data) => {
            notifications = data.notifications || [];
            notifications.updateUI();
        });

        socket.on('new_message', (data) => {
            chat.handleNewMessage(data);
        });

        socket.on('chat_created', (data) => {
            const existingChat = chats.find(chat => chat.id === data.chat.id);
            if (!existingChat) {
                chats.push(data.chat);
            }
            activeChat = data.chat;
            app.updateChatsUI();
            utils.showNotification(`💬 Чат начат с ${data.listenerName}`, 'success');
            
            setTimeout(() => {
                const input = document.getElementById('userMessageInput');
                if (input) input.focus();
            }, 100);
        });

        socket.on('user_connected', (data) => {
            const existingIndex = users.findIndex(u => u.id === data.user.id);
            if (existingIndex !== -1) {
                users[existingIndex] = { ...users[existingIndex], ...data.user, isOnline: true };
            } else {
                users.push({ ...data.user, isOnline: true });
            }
            app.updateUsersUI();
        });

        socket.on('user_disconnected', (data) => {
            const user = users.find(u => u.id === data.userId);
            if (user) {
                user.isOnline = false;
            }
            app.updateUsersUI();
        });

        socket.on('user_updated', (data) => {
            const existingIndex = users.findIndex(u => u.id === data.user.id);
            if (existingIndex !== -1) {
                users[existingIndex] = data.user;
            }
            app.updateUsersUI();
        });

        socket.on('rating_submitted', (data) => {
            utils.showNotification('⭐ Рейтинг отправлен!', 'success');
            const listener = users.find(u => u.id === data.listenerId);
            if (listener) {
                listener.rating = data.newRating;
                listener.ratingCount = data.ratingCount;
            }
            app.updateUsersUI();
        });

        socket.on('rating_received', (data) => {
            chat.updateListenerReviewsData();
        });

        socket.on('staff_added', (data) => {
            utils.showNotification('✅ Сотрудник добавлен', 'success');
            socket.emit('get_users');
        });

        socket.on('staff_add_error', (error) => {
            utils.showNotification('❌ ' + error, 'error');
        });

        socket.on('role_changed', (data) => {
            utils.showNotification(`✅ Роль пользователя изменена на ${utils.getRoleDisplayName(data.newRole)}`, 'success');
            socket.emit('get_users');
        });

        socket.on('chat_ended', (data) => {
            const chat = chats.find(c => c.id === data.chatId);
            if (chat) {
                chat.isActive = false;
            }
            if (activeChat && activeChat.id === data.chatId) {
                chat.end();
            }
            app.updateChatsUI();
        });

        socket.on('profile_updated', (data) => {
            currentUser = data.user;
            localStorage.setItem('currentUser', JSON.stringify(data.user));
            utils.updateUserInterface();
            utils.showNotification('✅ Профиль успешно обновлен', 'success');
        });

        socket.on('profile_update_error', (error) => {
            utils.showNotification('❌ ' + error, 'error');
        });

        socket.on('notification_sent', (data) => {
            utils.showNotification('✅ Техническое уведомление отправлено', 'success');
            socket.emit('get_notifications');
        });

        socket.on('new_notification', (data) => {
            notifications.unshift(data.notification);
            notifications.updateUI();
            utils.showNotification(`📢 Новое уведомление: ${data.notification.title}`, 'info');
        });
    },

    // Показать таб пользователя
    showUserTab(tabName) {
        document.querySelectorAll('#userInterface .tab').forEach(tab => {
            tab.classList.toggle('active', tab.getAttribute('data-tab') === tabName);
        });

        document.getElementById('listenersTab').classList.toggle('hidden', tabName !== 'listeners');
        document.getElementById('userNotificationsTab').classList.toggle('hidden', tabName !== 'notifications');
    },

    // Показать таб слушателя
    showListenerTab(tabName) {
        document.querySelectorAll('#listenerInterface .tab').forEach(tab => {
            tab.classList.toggle('active', tab.getAttribute('data-tab') === tabName);
        });

        document.getElementById('listenerChatsTab').classList.toggle('hidden', tabName !== 'chats');
        document.getElementById('listenerReviewsTab').classList.toggle('hidden', tabName !== 'reviews');
        document.getElementById('listenerStatsTab').classList.toggle('hidden', tabName !== 'stats');
        document.getElementById('listenerNotificationsTab').classList.toggle('hidden', tabName !== 'notifications');
    },

    // Обновить UI пользователей
    updateUsersUI() {
        if (!currentUser) return;

        if (currentUser.role === 'user') {
            listeners.loadCards();
        } else if (currentUser.role === 'listener') {
            chat.updateListenerChatsList();
            chat.updateListenerReviewsData();
            chat.updateListenerStats();
        } else if (currentUser.role === 'admin') {
            admin.updateData();
        }
    },

    // Обновить UI чатов
    updateChatsUI() {
        if (currentUser) {
            if (currentUser.role === 'user' && activeChat) {
                const updatedChat = chats.find(c => c.id === activeChat.id);
                if (updatedChat) {
                    activeChat = updatedChat;
                    chat.loadUserChatMessages();
                }
            } else if (currentUser.role === 'listener') {
                chat.updateListenerChatsList();
                if (activeChat) {
                    const updatedChat = chats.find(c => c.id === activeChat.id);
                    if (updatedChat) {
                        activeChat = updatedChat;
                        chat.loadListenerChatMessages();
                    }
                }
            } else if (currentUser.role === 'admin') {
                admin.updateAdminChatsList();
            }
        }
    },

    // Обновить UI рейтингов
    updateRatingsUI() {
        if (currentUser && currentUser.role === 'listener') {
            chat.updateListenerReviewsData();
        }
    },

    // Обновить UI уведомлений
    updateNotificationsUI() {
        if (currentUser) {
            if (currentUser.role === 'user') {
                notifications.updateUserNotifications();
            } else if (currentUser.role === 'listener') {
                notifications.updateListenerNotifications();
            } else if (currentUser.role === 'admin') {
                notifications.updateSentNotifications();
            }
        }
    }
};

// Инициализация приложения при загрузке DOM
document.addEventListener('DOMContentLoaded', function() {
    app.init();
});

console.log('🎉 Приложение полностью загружено и готово к работе!');
