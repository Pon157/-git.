// Утилиты приложения
const utils = {
    // Показать уведомление
    showNotification(message, type = 'info') {
        const notification = document.getElementById('notification');
        if (!notification) return;
        
        notification.textContent = message;
        notification.className = `notification ${type} show`;
        
        setTimeout(() => {
            notification.classList.remove('show');
        }, 4000);
    },

    // Скрыть все интерфейсы
    hideAllInterfaces() {
        const interfaces = ['authScreen', 'userInterface', 'listenerInterface', 'adminPanel'];
        interfaces.forEach(id => {
            const element = document.getElementById(id);
            if (element) element.style.display = 'none';
        });
    },

    // Получить отображаемое имя роли
    getRoleDisplayName(role) {
        const roles = {
            'admin': '👑 Администратор',
            'listener': '🎧 Слушатель', 
            'user': '👤 Пользователь'
        };
        return roles[role] || role;
    },

    // Обновить интерфейс пользователя
    updateUserInterface() {
        if (!currentUser) return;

        const elements = [
            { id: 'userDisplayName', text: currentUser.displayName || currentUser.username },
            { id: 'listenerDisplayName', text: currentUser.displayName || currentUser.username },
            { id: 'adminDisplayName', text: currentUser.displayName || currentUser.username },
            { id: 'userAvatar', text: currentUser.avatar || '👤' },
            { id: 'listenerAvatar', text: currentUser.avatar || '👤' }
        ];

        elements.forEach(element => {
            const el = document.getElementById(element.id);
            if (el) el.textContent = element.text;
        });
    },

    // Форматирование времени
    formatTime(date) {
        return new Date(date).toLocaleTimeString('ru-RU', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    },

    // Форматирование даты
    formatDate(date) {
        return new Date(date).toLocaleDateString('ru-RU');
    },

    // Генерация ID
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },

    // Проверка онлайн статуса
    isUserOnline(userId) {
        const user = users.find(u => u.id === userId);
        return user ? user.isOnline : false;
    },

    // Получить пользователя по ID
    getUserById(userId) {
        return users.find(u => u.id === userId);
    },

    // Показать элемент
    showElement(id) {
        const element = document.getElementById(id);
        if (element) element.classList.remove('hidden');
    },

    // Скрыть элемент
    hideElement(id) {
        const element = document.getElementById(id);
        if (element) element.classList.add('hidden');
    },

    // Показать только определенный элемент
    showOnly(elementId) {
        const elementsToHide = ['listenersTab', 'userChatSection', 'userNotificationsTab', 'userSettings'];
        elementsToHide.forEach(id => this.hideElement(id));
        this.showElement(elementId);
    }
};
