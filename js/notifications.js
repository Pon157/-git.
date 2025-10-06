// Модуль уведомлений
const notifications = {
    // Отправить техническое уведомление
    sendTechnical() {
        const title = document.getElementById('notificationTitle')?.value.trim();
        const text = document.getElementById('notificationText')?.value.trim();
        const type = document.getElementById('notificationType')?.value;
        const recipients = document.getElementById('notificationRecipients')?.value;

        if (!title || !text) {
            utils.showNotification('❌ Заполните все поля!', 'error');
            return;
        }

        console.log('📢 Отправка технического уведомления:', { title, text, type, recipients });
        
        if (socket && socket.connected) {
            socket.emit('send_technical_notification', {
                title,
                text,
                type,
                recipients
            });
        } else {
            utils.showNotification('❌ Нет соединения с сервером', 'error');
        }
    },

    // Получить отображаемое имя типа уведомления
    getNotificationTypeDisplay(type) {
        const types = {
            'info': 'ℹ️ Информация',
            'warning': '⚠️ Предупреждение', 
            'error': '🔴 Важное'
        };
        return types[type] || type;
    },

    // Получить отображаемое имя получателей
    getRecipientsDisplay(recipients) {
        const recipientsMap = {
            'all': '👋 Все пользователи',
            'users': '👤 Только пользователи',
            'listeners': '🎧 Только слушатели',
            'admins': '👑 Администрация'
        };
        return recipientsMap[recipients] || recipients;
    },

    // Обновить уведомления пользователя
    updateUserNotifications() {
        const container = document.getElementById('userNotificationsContainer');
        if (!container) return;
        
        const userNotifications = notifications.filter(notification => 
            notification.recipients === 'all' || notification.recipients === 'users'
        );
        
        if (userNotifications.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #7f8c8d;">
                    <div>📢 Уведомлений пока нет</div>
                    <div style="font-size: 14px; margin-top: 10px;">Здесь будут появляться важные уведомления от администрации</div>
                </div>
            `;
            return;
        }

        container.innerHTML = userNotifications.map(notification => `
            <div class="review-item">
                <div class="review-header">
                    <div style="font-weight: 600;">${notification.title}</div>
                    <div style="font-size: 12px; color: #7f8c8d;">
                        ${this.getNotificationTypeDisplay(notification.type)}
                    </div>
                </div>
                <div class="review-date">
                    ${utils.formatDate(notification.timestamp)}
                </div>
                <div class="review-text" style="margin-top: 10px; padding-top: 10px; border-top: 1px solid var(--border-color);">
                    ${notification.text}
                </div>
            </div>
        `).join('');
    },

    // Обновить уведомления слушателя
    updateListenerNotifications() {
        const container = document.getElementById('listenerNotificationsContainer');
        if (!container) return;
        
        const listenerNotifications = notifications.filter(notification => 
            notification.recipients === 'all' || notification.recipients === 'listeners'
        );
        
        if (listenerNotifications.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #7f8c8d;">
                    <div>📢 Уведомлений пока нет</div>
                    <div style="font-size: 14px; margin-top: 10px;">Здесь будут появляться важные уведомления от администрации</div>
                </div>
            `;
            return;
        }

        container.innerHTML = listenerNotifications.map(notification => `
            <div class="review-item">
                <div class="review-header">
                    <div style="font-weight: 600;">${notification.title}</div>
                    <div style="font-size: 12px; color: #7f8c8d;">
                        ${this.getNotificationTypeDisplay(notification.type)}
                    </div>
                </div>
                <div class="review-date">
                    ${utils.formatDate(notification.timestamp)}
                </div>
                <div class="review-text" style="margin-top: 10px; padding-top: 10px; border-top: 1px solid var(--border-color);">
                    ${notification.text}
                </div>
            </div>
        `).join('');
    },

    // Обновить отправленные уведомления
    updateSentNotifications() {
        const container = document.getElementById('sentNotificationsContainer');
        if (!container) return;
        
        if (notifications.length === 0) {
            container.innerHTML = '<div style="text-align: center; padding: 20px; color: #7f8c8d;">📢 Уведомлений пока нет</div>';
            return;
        }

        container.innerHTML = notifications.map(notification => `
            <div class="review-item">
                <div class="review-header">
                    <div style="font-weight: 600;">${notification.title}</div>
                    <div style="font-size: 12px; color: #7f8c8d;">
                        ${this.getNotificationTypeDisplay(notification.type)}
                    </div>
                </div>
                <div class="review-date">
                    ${utils.formatDate(notification.timestamp)} • 
                    ${this.getRecipientsDisplay(notification.recipients)}
                </div>
                <div class="review-text" style="margin-top: 10px; padding-top: 10px; border-top: 1px solid var(--border-color);">
                    ${notification.text}
                </div>
            </div>
        `).join('');
    },

    // Обновить UI уведомлений
    updateUI() {
        if (!currentUser) return;

        if (currentUser.role === 'user') {
            this.updateUserNotifications();
        } else if (currentUser.role === 'listener') {
            this.updateListenerNotifications();
        } else if (currentUser.role === 'admin') {
            this.updateSentNotifications();
        }
    },

    // Инициализация
    init() {
        this.setupEventListeners();
    },

    // Настройка обработчиков событий
    setupEventListeners() {
        document.getElementById('sendNotificationBtn')?.addEventListener('click', () => {
            this.sendTechnical();
        });
    }
};
