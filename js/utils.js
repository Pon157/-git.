// utils.js
const utils = {
    // Показать уведомление
    showNotification(message, type = 'info', duration = 5000) {
        const notification = document.getElementById('notification');
        if (!notification) return;

        notification.textContent = message;
        notification.className = `notification ${type} show`;
        
        setTimeout(() => {
            notification.classList.remove('show');
        }, duration);
    },

    // Скрыть все интерфейсы
    hideAllInterfaces() {
        const interfaces = [
            'authScreen',
            'userInterface', 
            'listenerInterface',
            'adminPanel'
        ];
        
        interfaces.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.style.display = 'none';
            }
        });
    },

    // Показать элемент
    showElement(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            element.classList.remove('hidden');
        }
    },

    // Скрыть элемент
    hideElement(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            element.classList.add('hidden');
        }
    },

    // Получить отображаемое имя роли
    getRoleDisplayName(role) {
        const roles = {
            'user': 'Пользователь',
            'listener': 'Слушатель', 
            'admin': 'Администратор',
            'owner': 'Владелец'
        };
        return roles[role] || role;
    },

    // Обновить интерфейс пользователя
    updateUserInterface() {
        if (!currentUser) return;
        
        if (currentUser.role === 'user') {
            const displayName = document.getElementById('userDisplayName');
            const role = document.getElementById('userRole');
            const avatar = document.getElementById('userAvatar');
            
            if (displayName) displayName.textContent = currentUser.displayName || currentUser.username;
            if (role) role.textContent = this.getRoleDisplayName(currentUser.role);
            if (avatar) avatar.textContent = currentUser.avatar || '👤';
        } else if (currentUser.role === 'listener') {
            const displayName = document.getElementById('listenerDisplayName');
            const role = document.getElementById('listenerRole');
            const avatar = document.getElementById('listenerAvatar');
            const ratingValue = document.getElementById('listenerRatingValue');
            const ratingCount = document.getElementById('listenerRatingCount');
            
            if (displayName) displayName.textContent = currentUser.displayName || currentUser.username;
            if (role) role.textContent = this.getRoleDisplayName(currentUser.role);
            if (avatar) avatar.textContent = currentUser.avatar || '👤';
            if (ratingValue) ratingValue.textContent = (currentUser.rating || 0).toFixed(1);
            if (ratingCount) ratingCount.textContent = currentUser.ratingCount || 0;
        }
    },

    // Форматирование времени
    formatTime(dateString) {
        const date = new Date(dateString);
        return date.toLocaleTimeString('ru-RU', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    },

    // Форматирование даты
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    },

    // Экранирование HTML
    escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
};

console.log('🔧 Утилиты загружены');
