// Функции для работы с уведомлениями и рейтингами
function updateRatingStars(rating) {
    document.querySelectorAll('.rating-star').forEach((star, index) => {
        star.classList.toggle('active', index < rating);
    });
}

function submitRating() {
    if (selectedRating === 0) {
        showNotification('❌ Выберите оценку!', 'error');
        return;
    }

    if (!currentListener) {
        showNotification('❌ Нет активного чата!', 'error');
        return;
    }

    const reviewText = document.getElementById('reviewText').value.trim();
    
    console.log('⭐ Отправка оценки:', { rating: selectedRating, listenerId: currentListener.id });
    
    socket.emit('submit_rating', {
        listenerId: currentListener.id,
        rating: selectedRating,
        comment: reviewText,
        userId: currentUser.id
    });

    showNotification('✅ Оценка отправлена! Спасибо за обратную связь!', 'success');

    selectedRating = 0;
    updateRatingStars(0);
    document.getElementById('reviewText').value = '';
    endChat();
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
    } else {
        showNotification('❌ Нет соединения с сервером', 'error');
    }
}

function updateSentNotifications() {
    const container = document.getElementById('sentNotificationsContainer');
    
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

function getNotificationTypeDisplay(type) {
    const types = {
        'info': 'ℹ️ Информация',
        'warning': '⚠️ Предупреждение', 
        'error': '🔴 Важное'
    };
    return types[type] || type;
}

function getRecipientsDisplay(recipients) {
    const recipientsMap = {
        'all': '👋 Все пользователи',
        'users': '👤 Только пользователи',
        'listeners': '🎧 Только слушатели',
        'admins': '👑 Администрация'
    };
    return recipientsMap[recipients] || recipients;
}

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

function updateRatingsUI() {
    if (currentUser && currentUser.role === 'listener') {
        updateListenerReviewsData();
    }
}
