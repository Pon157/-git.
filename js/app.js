// Основной файл приложения - инициализация и обработчики событий
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Инициализация приложения...');
    initializeApp();
});

function initializeApp() {
    setupEventListeners();
    loadUserPreferences();
    connectToServer();
}

function setupEventListeners() {
    console.log('🔧 Настройка обработчиков событий...');
    
    // Табы авторизации
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', function() {
            const tabName = this.getAttribute('data-tab');
            showAuthTab(tabName);
        });
    });

    // Кнопки авторизации - ДОБАВЛЯЕМ ПРОВЕРКУ СУЩЕСТВОВАНИЯ ЭЛЕМЕНТОВ
    const loginBtn = document.getElementById('loginBtn');
    const registerBtn = document.getElementById('registerBtn');
    
    if (loginBtn) {
        console.log('✅ Кнопка входа найдена, добавляем обработчик');
        loginBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('🖱️ Кнопка входа нажата');
            login();
        });
    } else {
        console.error('❌ Кнопка входа не найдена!');
    }
    
    if (registerBtn) {
        console.log('✅ Кнопка регистрации найдена, добавляем обработчик');
        registerBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('🖱️ Кнопка регистрации нажата');
            register();
        });
    } else {
        console.error('❌ Кнопка регистрации не найдена!');
    }

    // Обработчики Enter для форм
    const authUsername = document.getElementById('authUsername');
    const authPassword = document.getElementById('authPassword');
    const regUsername = document.getElementById('regUsername');
    const regPassword = document.getElementById('regPassword');
    const regPasswordConfirm = document.getElementById('regPasswordConfirm');
    
    // Обработчик Enter для логина
    if (authUsername && authPassword) {
        authUsername.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                login();
            }
        });
        
        authPassword.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                login();
            }
        });
    }
    
    // Обработчик Enter для регистрации
    if (regUsername && regPassword && regPasswordConfirm) {
        const registerFields = [regUsername, regPassword, regPasswordConfirm];
        registerFields.forEach(field => {
            field.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    register();
                }
            });
        });
    }

    console.log('✅ Обработчики событий настроены');
}

function connectToServer() {
    try {
        console.log('🔌 Подключение к серверу:', SERVER_URL);
        
        socket = io(SERVER_URL, {
            transports: ['websocket', 'polling'],
            timeout: 10000,
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000
        });

        socket.on('connect', () => {
            console.log('✅ Успешно подключено к серверу');
            connectionRetries = 0;
            showNotification('✅ Подключено к серверу', 'success');
            
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
                // Сервер принудительно отключил, пытаемся переподключиться
                setTimeout(() => {
                    socket.connect();
                }, 1000);
            }
        });

        socket.on('connect_error', (error) => {
            console.error('Ошибка подключения:', error);
            connectionRetries++;
            
            if (connectionRetries <= MAX_RETRIES) {
                console.log(`🔄 Попытка переподключения ${connectionRetries}/${MAX_RETRIES}`);
                setTimeout(() => {
                    socket.connect();
                }, 2000);
            } else {
                showNotification('❌ Не удалось подключиться к серверу. Проверьте интернет-соединение.', 'error');
            }
        });

        socket.on('reconnect', (attemptNumber) => {
            console.log('🔁 Переподключение успешно, попытка:', attemptNumber);
            showNotification('✅ Соединение восстановлено', 'success');
            
            const savedUserId = localStorage.getItem('currentUserId');
            if (savedUserId && currentUser) {
                socket.emit('restore_session', { userId: savedUserId });
            }
        });

        // ОСНОВНЫЕ ОБРАБОТЧИКИ СОБЫТИЙ
        socket.on('login_success', (data) => {
            console.log('✅ Успешный вход:', data.user);
            handleLoginSuccess(data.user);
        });

        socket.on('login_error', (error) => {
            console.error('❌ Ошибка входа:', error);
            showNotification('❌ ' + error, 'error');
            
            // Восстанавливаем кнопку входа
            const loginBtn = document.getElementById('loginBtn');
            if (loginBtn) {
                loginBtn.innerHTML = '<span>🚪 Войти</span>';
                loginBtn.disabled = false;
            }
        });

        socket.on('registration_success', (data) => {
            console.log('✅ Успешная регистрация:', data.user);
            showNotification('✅ Регистрация успешна!', 'success');
            handleLoginSuccess(data.user);
        });

        socket.on('registration_error', (error) => {
            console.error('❌ Ошибка регистрации:', error);
            showNotification('❌ ' + error, 'error');
            
            // Восстанавливаем кнопку регистрации
            const registerBtn = document.getElementById('registerBtn');
            if (registerBtn) {
                registerBtn.innerHTML = '<span>📝 Зарегистрироваться</span>';
                registerBtn.disabled = false;
            }
        });

        socket.on('session_restored', (data) => {
            if (data.user) {
                console.log('🔄 Сессия восстановлена:', data.user);
                handleLoginSuccess(data.user);
            }
        });

        // Остальные обработчики событий...
        socket.on('users_list', (data) => {
            console.log('📊 Получен список пользователей:', data.users?.length);
            users = data.users || [];
            updateUsersUI();
        });

        socket.on('chats_list', (data) => {
            console.log('💬 Получен список чатов:', data.chats?.length);
            chats = data.chats || [];
            updateChatsUI();
        });

        socket.on('new_message', (data) => {
            console.log('📨 Новое сообщение:', data);
            handleNewMessage(data);
        });

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
}

function updateUsersUI() {
    if (!currentUser) return;

    if (currentUser.role === 'user') {
        loadListenerCards();
    } else if (currentUser.role === 'listener') {
        updateListenerChatsList();
        updateListenerReviewsData();
        updateListenerStats();
    } else if (currentUser.role === 'admin' || currentUser.role === 'owner') {
        updateAdminData();
    }
}

function loadUserPreferences() {
    const theme = localStorage.getItem('theme') || 'sunrise';
    const font = localStorage.getItem('font') || 'default';
    const fontSize = localStorage.getItem('fontSize') || 'normal';
    
    changeTheme(theme, false);
    changeFont(font, false);
    changeFontSize(fontSize, false);
}

console.log('🎉 Приложение полностью загружено и готово к работе!');
