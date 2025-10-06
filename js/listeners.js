// Функции для работы со слушателями
function showUserInterface() {
    console.log('👤 Показ интерфейса пользователя');
    hideAllInterfaces();
    document.getElementById('userInterface').style.display = 'block';
    
    document.getElementById('userDisplayName').textContent = currentUser.displayName || currentUser.username;
    document.getElementById('userRole').textContent = getRoleDisplayName(currentUser.role);
    document.getElementById('userAvatar').textContent = currentUser.avatar || '👤';
    
    showUserThemeSettings();
    loadListenerCards();
    updateUserNotifications();
}

function showUserTab(tabName) {
    document.querySelectorAll('#userInterface .tab').forEach(tab => {
        tab.classList.toggle('active', tab.getAttribute('data-tab') === tabName);
    });

    document.getElementById('listenersTab').classList.toggle('hidden', tabName !== 'listeners');
    document.getElementById('userNotificationsTab').classList.toggle('hidden', tabName !== 'notifications');
}

function loadListenerCards() {
    const container = document.getElementById('listenerCards');
    // Администраторы тоже могут быть слушателями
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

function showListenerInterface() {
    console.log('🎧 Показ интерфейса слушателя');
    hideAllInterfaces();
    document.getElementById('listenerInterface').style.display = 'block';
    
    document.getElementById('listenerDisplayName').textContent = currentUser.displayName || currentUser.username;
    document.getElementById('listenerRole').textContent = getRoleDisplayName(currentUser.role);
    document.getElementById('listenerAvatar').textContent = currentUser.avatar || '👤';
    document.getElementById('listenerRatingValue').textContent = (currentUser.rating || 0).toFixed(1);
    document.getElementById('listenerRatingCount').textContent = currentUser.ratingCount || 0;
    
    showListenerThemeSettings();
    updateListenerChatsList();
    updateListenerReviewsData();
    updateListenerStats();
    updateListenerNotifications();
    
    // Запускаем таймер онлайн времени
    startOnlineTimer();
}

function showListenerTab(tabName) {
    document.querySelectorAll('#listenerInterface .tab').forEach(tab => {
        tab.classList.toggle('active', tab.getAttribute('data-tab') === tabName);
    });

    document.getElementById('listenerChatsTab').classList.toggle('hidden', tabName !== 'chats');
    document.getElementById('listenerReviewsTab').classList.toggle('hidden', tabName !== 'reviews');
    document.getElementById('listenerStatsTab').classList.toggle('hidden', tabName !== 'stats');
    document.getElementById('listenerNotificationsTab').classList.toggle('hidden', tabName !== 'notifications');
}

function updateListenerChatsList() {
    const container = document.getElementById('listenerChatsList');
    // Администраторы тоже могут получать чаты
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
    document.querySelector(`.chat-item[data-chat-id="${chatId}"]`).classList.add('active');
    
    loadListenerChatMessages();
}

function updateListenerReviewsData() {
    const listenerRatings = ratings.filter(r => r.listenerId === currentUser.id);
    updateListenerReviews(listenerRatings);
}

function updateListenerReviews(ratingsData) {
    const container = document.getElementById('listenerReviewsContainer');
    
    if (!ratingsData || ratingsData.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #7f8c8d;">
                <div>⭐ Отзывов пока нет</div>
                <div style="font-size: 14px; margin-top: 10px;">Пользователи оставят отзывы после завершения чатов</div>
            </div>
        `;
        return;
    }

    container.innerHTML = ratingsData.map(review => {
        const user = users.find(u => u.id === review.userId);
        const stars = '★'.repeat(review.rating) + '☆'.repeat(5 - review.rating);
        
        return `
            <div class="review-item">
                <div class="review-header">
                    <div style="font-weight: 600;">${user ? (user.displayName || user.username) : 'Пользователь'}</div>
                    <div class="review-rating">
                        ${stars.split('').map(star => `<span class="review-star">${star}</span>`).join('')}
                    </div>
                </div>
                <div class="review-date">
                    ${new Date(review.timestamp).toLocaleDateString('ru-RU')}
                </div>
                ${review.comment ? `
                    <div class="review-text" style="margin-top: 10px; padding-top: 10px; border-top: 1px solid var(--border-color);">
                        ${review.comment}
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');
}

function updateListenerStats() {
    const listenerChats = chats.filter(chat => chat.user2 === currentUser.id);
    const completedChats = listenerChats.filter(chat => !chat.isActive);
    const totalMessages = listenerChats.reduce((total, chat) => total + (chat.messages?.length || 0), 0);
    
    document.getElementById('listenerTotalChats').textContent = completedChats.length;
    document.getElementById('listenerAvgRating').textContent = (currentUser.rating || 0).toFixed(1);
    document.getElementById('listenerResponseTime').textContent = '45с';
}

function startOnlineTimer() {
    onlineTimeStart = new Date();
    clearInterval(onlineTimer);
    onlineTimer = setInterval(() => {
        if (onlineTimeStart) {
            const now = new Date();
            const diff = Math.floor((now - onlineTimeStart) / 1000 / 60 / 60);
            const onlineTimeElement = document.getElementById('listenerOnlineTime');
            if (onlineTimeElement) {
                onlineTimeElement.textContent = diff + 'ч';
            }
        }
    }, 60000);
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
