<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Чат система</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; background: #f0f2f5; }
        
        .auth-container {
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        
        .auth-card {
            background: white;
            padding: 40px;
            border-radius: 10px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            width: 100%;
            max-width: 400px;
        }
        
        .auth-title {
            text-align: center;
            margin-bottom: 30px;
            color: #333;
            font-size: 24px;
        }
        
        .form-group { margin-bottom: 20px; }
        .form-label { display: block; margin-bottom: 5px; font-weight: bold; }
        .form-input {
            width: 100%;
            padding: 12px;
            border: 2px solid #ddd;
            border-radius: 5px;
            font-size: 16px;
        }
        
        .btn {
            width: 100%;
            padding: 12px;
            background: #667eea;
            color: white;
            border: none;
            border-radius: 5px;
            font-size: 16px;
            cursor: pointer;
        }
        
        .btn:hover { background: #5a6fd8; }
        
        .tabs {
            display: flex;
            margin-bottom: 20px;
            border-bottom: 1px solid #ddd;
        }
        
        .tab {
            padding: 10px 20px;
            cursor: pointer;
            border-bottom: 3px solid transparent;
        }
        
        .tab.active {
            border-bottom-color: #667eea;
            font-weight: bold;
        }
        
        .hidden { display: none; }
        
        .notification {
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 5px;
            color: white;
            z-index: 1000;
        }
        
        .notification.success { background: #4CAF50; }
        .notification.error { background: #f44336; }
        .notification.info { background: #2196F3; }
    </style>
</head>
<body>
    <!-- Auth Screen -->
    <div id="authScreen" class="auth-container">
        <div class="auth-card">
            <h2 class="auth-title">Чат система</h2>
            
            <div class="tabs">
                <div class="tab active" data-tab="login">Вход</div>
                <div class="tab" data-tab="register">Регистрация</div>
            </div>
            
            <!-- Login Form -->
            <div id="loginForm">
                <div class="form-group">
                    <label class="form-label">Логин</label>
                    <input type="text" class="form-input" id="authUsername" placeholder="Введите логин">
                </div>
                <div class="form-group">
                    <label class="form-label">Пароль</label>
                    <input type="password" class="form-input" id="authPassword" placeholder="Введите пароль">
                </div>
                <button class="btn" id="loginBtn">Войти</button>
            </div>
            
            <!-- Register Form -->
            <div id="registerForm" class="hidden">
                <div class="form-group">
                    <label class="form-label">Логин</label>
                    <input type="text" class="form-input" id="regUsername" placeholder="Придумайте логин">
                </div>
                <div class="form-group">
                    <label class="form-label">Пароль</label>
                    <input type="password" class="form-input" id="regPassword" placeholder="Придумайте пароль">
                </div>
                <div class="form-group">
                    <label class="form-label">Подтвердите пароль</label>
                    <input type="password" class="form-input" id="regPasswordConfirm" placeholder="Повторите пароль">
                </div>
                <button class="btn" id="registerBtn">Зарегистрироваться</button>
            </div>
        </div>
    </div>

    <!-- Notification -->
    <div class="notification hidden" id="notification"></div>

    <script src="/socket.io/socket.io.js"></script>
    <script>
        let socket = null;
        let currentUser = null;

        // Initialize
        document.addEventListener('DOMContentLoaded', function() {
            console.log('🚀 Initializing chat system...');
            initializeApp();
        });

        function initializeApp() {
            setupEventListeners();
            connectToServer();
        }

        function setupEventListeners() {
            // Tabs
            document.querySelectorAll('.tab').forEach(tab => {
                tab.addEventListener('click', function() {
                    const tabName = this.getAttribute('data-tab');
                    showAuthTab(tabName);
                });
            });

            // Login button
            document.getElementById('loginBtn').onclick = login;
            document.getElementById('registerBtn').onclick = register;

            // Enter handlers
            document.getElementById('authPassword').addEventListener('keypress', function(e) {
                if (e.key === 'Enter') login();
            });
            
            document.getElementById('regPasswordConfirm').addEventListener('keypress', function(e) {
                if (e.key === 'Enter') register();
            });
        }

        function connectToServer() {
            try {
                console.log('🔌 Connecting to server...');
                socket = io();
                
                socket.on('connect', () => {
                    console.log('✅ Connected to server');
                    showNotification('✅ Подключено к серверу', 'success');
                });
                
                socket.on('disconnect', () => {
                    console.log('❌ Disconnected from server');
                    showNotification('❌ Соединение потеряно', 'error');
                });
                
                socket.on('login_success', (data) => {
                    console.log('✅ Login successful:', data.user);
                    currentUser = data.user;
                    showNotification(`✅ Добро пожаловать, ${data.user.username}!`, 'success');
                    // Здесь можно перейти к основному интерфейсу
                });
                
                socket.on('login_error', (error) => {
                    console.error('❌ Login error:', error);
                    showNotification('❌ ' + error, 'error');
                });
                
                socket.on('registration_success', (data) => {
                    console.log('✅ Registration successful:', data.user);
                    currentUser = data.user;
                    showNotification('✅ Регистрация успешна!', 'success');
                });
                
                socket.on('registration_error', (error) => {
                    console.error('❌ Registration error:', error);
                    showNotification('❌ ' + error, 'error');
                });
                
            } catch (error) {
                console.error('💥 Connection error:', error);
                showNotification('❌ Ошибка подключения', 'error');
            }
        }

        function showAuthTab(tabName) {
            document.querySelectorAll('.tab').forEach(tab => {
                tab.classList.toggle('active', tab.getAttribute('data-tab') === tabName);
            });

            document.getElementById('loginForm').classList.toggle('hidden', tabName !== 'login');
            document.getElementById('registerForm').classList.toggle('hidden', tabName !== 'register');
        }

        function login() {
            const username = document.getElementById('authUsername').value.trim();
            const password = document.getElementById('authPassword').value.trim();

            if (!username || !password) {
                showNotification('❌ Заполните все поля!', 'error');
                return;
            }

            if (socket && socket.connected) {
                showNotification('🔄 Вход...', 'info');
                socket.emit('login', { username, password });
            } else {
                showNotification('❌ Нет соединения с сервером', 'error');
            }
        }

        function register() {
            const username = document.getElementById('regUsername').value.trim();
            const password = document.getElementById('regPassword').value.trim();
            const passwordConfirm = document.getElementById('regPasswordConfirm').value.trim();

            if (!username || !password || !passwordConfirm) {
                showNotification('❌ Заполните все поля!', 'error');
                return;
            }

            if (password !== passwordConfirm) {
                showNotification('❌ Пароли не совпадают!', 'error');
                return;
            }

            if (socket && socket.connected) {
                showNotification('🔄 Регистрация...', 'info');
                socket.emit('register', { username, password });
            } else {
                showNotification('❌ Нет соединения с сервером', 'error');
            }
        }

        function showNotification(message, type = 'info') {
            const notification = document.getElementById('notification');
            notification.textContent = message;
            notification.className = `notification ${type}`;
            
            setTimeout(() => {
                notification.classList.add('hidden');
            }, 4000);
        }
    </script>
</body>
</html>
