// Модуль аутентификации - упрощенная версия для теста
const auth = {
    init() {
        console.log('🔧 Инициализация модуля аутентификации...');
        // Обработчики уже настроены в index.html
    },

    // Показать таб авторизации
    showAuthTab(tabName) {
        console.log('🔀 Переключение на таб:', tabName);
        
        // Обновляем активные табы
        document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.toggle('active', tab.getAttribute('data-tab') === tabName);
        });

        // Показываем/скрываем формы
        if (tabName === 'login') {
            document.getElementById('loginForm').classList.remove('hidden');
            document.getElementById('registerForm').classList.add('hidden');
        } else {
            document.getElementById('loginForm').classList.add('hidden');
            document.getElementById('registerForm').classList.remove('hidden');
        }
    },

    // Вход в систему
    login() {
        console.log('=== ВЫЗВАНА ФУНКЦИЯ LOGIN ===');
        // Этот метод будет вызываться из основного приложения
    },

    // Регистрация
    register() {
        console.log('=== ВЫЗВАНА ФУНКЦИЯ REGISTER ===');
        // Этот метод будет вызываться из основного приложения
    },

    // Обработка успешного входа
    handleLoginSuccess(user) {
        console.log('🎉 Успешный вход, пользователь:', user);
        currentUser = user;
        
        // Сохраняем сессию
        localStorage.setItem('currentUserId', user.id);
        localStorage.setItem('currentUser', JSON.stringify(user));
        
        utils.showNotification(`✅ Добро пожаловать, ${user.displayName || user.username}!`, 'success');
        
        // Определяем интерфейс по роли
        if (user.role === 'user') {
            this.showUserInterface();
        } else if (user.role === 'listener') {
            this.showListenerInterface();
        } else if (user.role === 'admin') {
            this.showAdminPanel();
        }
    },

    // Показать интерфейс пользователя
    showUserInterface() {
        console.log('👤 Показ интерфейса пользователя');
        utils.hideAllInterfaces();
        document.getElementById('userInterface').style.display = 'block';
    },

    // Показать интерфейс слушателя
    showListenerInterface() {
        console.log('🎧 Показ интерфейса слушателя');
        utils.hideAllInterfaces();
        document.getElementById('listenerInterface').style.display = 'block';
    },

    // Показать админ панель
    showAdminPanel() {
        console.log('👑 Показ админ панели');
        utils.hideAllInterfaces();
        document.getElementById('adminPanel').style.display = 'block';
    },

    // Выход из системы
    logout() {
        console.log('🚪 Выход из системы');
        utils.hideAllInterfaces();
        document.getElementById('authScreen').style.display = 'flex';
    }
};
