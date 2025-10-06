// Функции для работы с уведомлениями
function updateNotificationsUI() {
    if (currentUser) {
        if (currentUser.role === 'user') {
            updateUserNotifications();
        } else if (currentUser.role === 'listener') {
            updateListenerNotifications();
        } else if (currentUser.role === 'admin') {
            updateSentNotifications();
        }
    }
}

function updateUserNotifications() {
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
                    ${getNotificationTypeDisplay(notification.type)}
                </div>
            </div>
            <div class="review-date">
                ${new Date(notification.timestamp).toLocaleString('ru-RU')}
            </div>
            <div class="review-text" style="margin-top: 10px; padding-top: 10px; border-top: 1px solid var(--border-color);">
                ${notification.text}
            </div>
        </div>
    `).join('');
}

function updateListenerNotifications() {
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
                    ${getNotificationTypeDisplay(notification.type)}
                </div>
            </div>
            <div class="review-date">
                ${new Date(notification.timestamp).toLocaleString('ru-RU')}
            </div>
            <div class="review-text" style="margin-top: 10px; padding-top: 10px; border-top: 1px solid var(--border-color);">
                ${notification.text}
            </div>
        </div>
    `).join('');
}

function updateSentNotifications() {
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
                    ${getNotificationTypeDisplay(notification.type)}
                </div>
            </div>
            <div class="review-date">
                ${new Date(notification.timestamp).toLocaleString('ru-RU')} • 
                ${getRecipientsDisplay(notification.recipients)}
            </div>
            <div class="review-text" style="margin-top: 10px; padding-top: 10px; border-top: 1px solid var(--border-color);">
                ${notification.text}
            </div>
        </div>
    `).join('');
}

function sendTechnicalNotification() {
    const title = document.getElementById('notificationTitle').value.trim();
    const text = document.getElementById('notificationText').value.trim();
    const type = document.getElementById('notificationType').value;
    const recipients = document.getElementById('notificationRecipients').value;

    if (!title || !text) {
        showNotification('❌ Заполните все поля!', 'error');
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
        
        // Очищаем поля после отправки
        document.getElementById('notificationTitle').value = '';
        document.getElementById('notificationText').value = '';
        
    } else {
        showNotification('❌ Нет соединения с сервером', 'error');
    }
}
