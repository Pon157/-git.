// Функции для работы со слушателями и пользователями
function showUserTab(tabName) {
    document.querySelectorAll('#userInterface .tab').forEach(tab => {
        tab.classList.toggle('active', tab.getAttribute('data-tab') === tabName);
    });

    document.getElementById('listenersTab').classList.toggle('hidden', tabName !== 'listeners');
    document.getElementById('userNotificationsTab').classList.toggle('hidden', tabName !== 'notifications');
    document.getElementById('userChatSection').classList.add('hidden');
    document.getElementById('userSettings').classList.add('hidden');
}

function showListenerTab(tabName) {
    document.querySelectorAll('#listenerInterface .tab').forEach(tab => {
        tab.classList.toggle('active', tab.getAttribute('data-tab') === tabName);
    });

    document.getElementById('listenerChatsTab').classList.toggle('hidden', tabName !== 'chats');
    document.getElementById('listenerReviewsTab').classList.toggle('hidden', tabName !== 'reviews');
    document.getElementById('listenerStatsTab').classList.toggle('hidden', tabName !== 'stats');
    document.getElementById('listenerNotificationsTab').classList.toggle('hidden', tabName !== 'notifications');
    document.getElementById('listenerSettings').classList.add('hidden');
}

function loadListenerCards() {
    const container = document.getElementById('listenerCards');
    
    // Фильтруем слушателей (только онлайн и не текущий пользователь)
    const listeners = users.filter(u => 
        (u.role === 'listener' || u.role === 'admin') && 
        u.id !== currentUser.id && 
        u.isOnline
    );
    
    if (listeners.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; grid-column: 1/-1; padding: 40px; color: #7f8c8d;">
                <div>😔 Нет доступных слушателей онлайн</div>
                <div style="font-size: 14px; margin-top: 10px;">Попробуйте позже или выберите случайного слушателя</div>
            </div>
        `;
        return;
    }

    container.innerHTML = listeners.map(listener => `
        <div class="listener-card" onclick="startChatWithListener('${listener.id}')">
            <div class="listener-avatar">${listener.avatar || '👤'}</div>
            <h3>${listener.displayName || listener.username}</h3>
            <div class="listener-rating">
                <span class="star">★</span>
                <span>${(listener.rating || 0).toFixed(1)}</span>
                <span>(${listener.ratingCount || 0})</span>
            </div>
            <div class="${listener.isOnline ? 'status-online' : 'status-offline'}" style="margin-top: 10px;">
                ${listener.isOnline ? '● Онлайн' : '○ Офлайн'}
            </div>
            <div style="font-size: 12px; color: #7f8c8d; margin-top: 5px;">
                ${getRoleDisplayName(listener.role)}
            </div>
            ${listener.isOnline ? `
                <div style="font-size: 12px; color: #27ae60; margin-top: 5px;">
                    ✅ Готов помочь
                </div>
            ` : ''}
        </div>
    `).join('');
}

function selectRandomListener() {
    const listeners = users.filter(u => 
        (u.role === 'listener' || u.role === 'admin') && 
        u.isOnline && 
        u.id !== currentUser.id
    );
    
    if (listeners.length === 0) {
        showNotification('❌ Нет доступных слушателей онлайн!', 'error');
        return;
    }
    
    const randomListener = listeners[Math.floor(Math.random() * listeners.length)];
    startChatWithListener(randomListener.id);
}

function startChatWithListener(listenerId) {
    const listener = users.find(u => u.id === listenerId);
    if (!listener) {
        showNotification('❌ Слушатель не найден!', 'error');
        return;
    }

    currentListener = listener;
    
    console.log('💬 Начало чата с:', listener.displayName || listener.username);
    
    // Показываем чат
    document.getElementById('listenersTab').classList.add('hidden');
    document.getElementById('userNotificationsTab').classList.add('hidden');
    document.getElementById('userChatSection').classList.remove('hidden');
    
    document.getElementById('currentListenerRating').textContent = (listener.rating || 0).toFixed(1);
    
    // Запускаем таймер
    chatStartTime = new Date();
    startChatTimer();
    
    showNotification(`💬 Чат начат с ${listener.displayName || listener.username}`, 'success');
}

function updateListenerChatsList() {
    const container = document.getElementById('listenerChatsList');
    
    // Фильтруем чаты слушателя
    const listenerChats = chats.filter(chat => 
        (chat.user2 === currentUser.id || (currentUser.role === 'admin' && chat.user1 !== currentUser.id)) && 
        chat.isActive
    );
    
    if (listenerChats.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #7f8c8d;">
                <div>😴 Активные чаты отсутствуют</div>
                <div style="font-size: 14px; margin-top: 10px;">Ожидайте подключения пользователей</div>
            </div>
        `;
        return;
    }
    
    container.innerHTML = listenerChats.map(chat => {
        const user = users.find(u => u.id === chat.user1);
        const lastMessage = chat.messages && chat.messages.length > 0 ? 
            chat.messages[chat.messages.length - 1] : null;
        
        return `
            <div class="chat-item" data-chat-id="${chat.id}" onclick="selectListenerChat('${chat.id}')">
                <div style="font-weight: 600;">${user ? (user.displayName || user.username) : 'Пользователь'}</div>
                <div style="font-size: 12px; color: #7f8c8d;">
                    ${lastMessage ? 
                        lastMessage.text.substring(0, 30) + (lastMessage.text.length > 30 ? '...' : '') : 
                        'Нет сообщений'
                    }
                </div>
                <div style="font-size: 11px; color: #7f8c8d; margin-top: 5px;">
                    ${chat.messages ? chat.messages.length + ' сообщ.' : '0 сообщ.'}
                </div>
            </div>
        `;
    }).join('');
}

function selectListenerChat(chatId) {
    activeChat = chats.find(chat => chat.id === chatId);
    if (!activeChat) return;
    
    document.querySelectorAll('.chat-item').forEach(item => {
        item.classList.remove('active');
    });
    
    const selectedItem = document.querySelector(`.chat-item[data-chat-id="${chatId}"]`);
    if (selectedItem) {
        selectedItem.classList.add('active');
    }
    
    loadListenerChatMessages();
    showNotification('💬 Чат выбран', 'info');
}

// Функции настроек
function showUserSettings() {
    document.getElementById('listenersTab').classList.add('hidden');
    document.getElementById('userChatSection').classList.add('hidden');
    document.getElementById('userNotificationsTab').classList.add('hidden');
    document.getElementById('userSettings').classList.remove('hidden');
}

function hideUserSettings() {
    document.getElementById('userSettings').classList.add('hidden');
    document.getElementById('listenersTab').classList.remove('hidden');
}

function showListenerSettings() {
    document.getElementById('listenerChatsTab').classList.add('hidden');
    document.getElementById('listenerReviewsTab').classList.add('hidden');
    document.getElementById('listenerStatsTab').classList.add('hidden');
    document.getElementById('listenerNotificationsTab').classList.add('hidden');
    document.getElementById('listenerSettings').classList.remove('hidden');
}

function hideListenerSettings() {
    document.getElementById('listenerSettings').classList.add('hidden');
    document.getElementById('listenerChatsTab').classList.remove('hidden');
}

function updateListenerReviewsData() {
    console.log('📝 Обновление отзывов слушателя');
    const container = document.getElementById('listenerReviewsList');
    
    // Фильтруем оценки для текущего слушателя
    const listenerRatings = ratings.filter(r => r.listenerId === currentUser.id);
    
    if (listenerRatings.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #7f8c8d;">
                <div>⭐ Отзывы отсутствуют</div>
                <div style="font-size: 14px; margin-top: 10px;">Ваши пользователи еще не оставили отзывов</div>
            </div>
        `;
        return;
    }
    
    container.innerHTML = listenerRatings.map(rating => {
        const user = users.find(u => u.id === rating.userId);
        return `
            <div class="review-item">
                <div style="display: flex; justify-content: between; align-items: center;">
                    <div style="font-weight: 600;">${user ? (user.displayName || user.username) : 'Аноним'}</div>
                    <div class="rating-stars">${'★'.repeat(rating.rating)}${'☆'.repeat(5-rating.rating)}</div>
                </div>
                <div style="color: #7f8c8d; margin-top: 5px;">${rating.comment || 'Без комментария'}</div>
                <div style="font-size: 12px; color: #7f8c8d; margin-top: 5px;">
                    ${new Date(rating.timestamp).toLocaleDateString('ru-RU')}
                </div>
            </div>
        `;
    }).join('');
}

function updateListenerStats() {
    console.log('📊 Обновление статистики слушателя');
    
    // Подсчитываем статистику
    const listenerChats = chats.filter(chat => chat.user2 === currentUser.id);
    const completedChats = listenerChats.filter(chat => !chat.isActive).length;
    const totalMessages = listenerChats.reduce((total, chat) => total + (chat.messages?.length || 0), 0);
    
    document.getElementById('listenerTotalChats').textContent = completedChats;
    document.getElementById('listenerAvgRating').textContent = (currentUser.rating || 0).toFixed(1);
    document.getElementById('listenerResponseTime').textContent = '45с';
    document.getElementById('listenerOnlineTime').textContent = '2ч';
}

function updateUserNotifications() {
    console.log('📢 Обновление уведомлений пользователя');
    const container = document.getElementById('userNotificationsList');
    
    const userNotifications = notifications.filter(notification => 
        notification.recipients === 'all' || notification.recipients === 'users'
    );
    
    if (userNotifications.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #7f8c8d;">
                <div>📭 Уведомления отсутствуют</div>
                <div style="font-size: 14px; margin-top: 10px;">Здесь будут появляться важные уведомления</div>
            </div>
        `;
        return;
    }
    
    container.innerHTML = userNotifications.map(notification => `
        <div class="notification-item">
            <div style="font-weight: 600;">${notification.title}</div>
            <div style="font-size: 14px; color: #7f8c8d; margin-top: 5px;">${notification.text}</div>
            <div style="font-size: 12px; color: #7f8c8d; margin-top: 5px;">
                ${new Date(notification.timestamp).toLocaleString('ru-RU')}
            </div>
        </div>
    `).join('');
}

function updateListenerNotifications() {
    console.log('📢 Обновление уведомлений слушателя');
    const container = document.getElementById('listenerNotificationsList');
    
    const listenerNotifications = notifications.filter(notification => 
        notification.recipients === 'all' || notification.recipients === 'listeners'
    );
    
    if (listenerNotifications.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #7f8c8d;">
                <div>📭 Уведомления отсутствуют</div>
                <div style="font-size: 14px; margin-top: 10px;">Здесь будут появляться важные уведомления</div>
            </div>
        `;
        return;
    }
    
    container.innerHTML = listenerNotifications.map(notification => `
        <div class="notification-item">
            <div style="font-weight: 600;">${notification.title}</div>
            <div style="font-size: 14px; color: #7f8c8d; margin-top: 5px;">${notification.text}</div>
            <div style="font-size: 12px; color: #7f8c8d; margin-top: 5px;">
                ${new Date(notification.timestamp).toLocaleString('ru-RU')}
            </div>
        </div>
    `).join('');
}
