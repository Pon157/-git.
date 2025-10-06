// Функции для работы со слушателями и пользователями
function showUserTab(tabName) {
    console.log('👤 Переключение таба пользователя:', tabName);
    
    // Обновляем активные табы
    document.querySelectorAll('#userInterface .tab').forEach(tab => {
        tab.classList.toggle('active', tab.getAttribute('data-tab') === tabName);
    });

    // Скрываем все разделы
    document.getElementById('listenersTab').classList.add('hidden');
    document.getElementById('userNotificationsTab').classList.add('hidden');
    document.getElementById('userChatSection').classList.add('hidden');
    document.getElementById('userSettings').classList.add('hidden');

    // Показываем выбранный раздел
    switch(tabName) {
        case 'listeners':
            document.getElementById('listenersTab').classList.remove('hidden');
            loadListenerCards();
            break;
        case 'notifications':
            document.getElementById('userNotificationsTab').classList.remove('hidden');
            updateUserNotifications();
            break;
        case 'settings':
            document.getElementById('userSettings').classList.remove('hidden');
            loadUserSettings();
            break;
    }
}

function showListenerTab(tabName) {
    console.log('🎧 Переключение таба слушателя:', tabName);
    
    // Обновляем активные табы
    document.querySelectorAll('#listenerInterface .tab').forEach(tab => {
        tab.classList.toggle('active', tab.getAttribute('data-tab') === tabName);
    });

    // Скрываем все разделы
    document.getElementById('listenerChatsTab').classList.add('hidden');
    document.getElementById('listenerReviewsTab').classList.add('hidden');
    document.getElementById('listenerStatsTab').classList.add('hidden');
    document.getElementById('listenerNotificationsTab').classList.add('hidden');
    document.getElementById('listenerSettings').classList.add('hidden');

    // Показываем выбранный раздел
    switch(tabName) {
        case 'chats':
            document.getElementById('listenerChatsTab').classList.remove('hidden');
            updateListenerChatsList();
            break;
        case 'reviews':
            document.getElementById('listenerReviewsTab').classList.remove('hidden');
            updateListenerReviewsData();
            break;
        case 'stats':
            document.getElementById('listenerStatsTab').classList.remove('hidden');
            updateListenerStats();
            break;
        case 'notifications':
            document.getElementById('listenerNotificationsTab').classList.remove('hidden');
            updateListenerNotifications();
            break;
        case 'settings':
            document.getElementById('listenerSettings').classList.remove('hidden');
            loadListenerSettings();
            break;
    }
}

function loadListenerCards() {
    const container = document.getElementById('listenerCards');
    if (!container) return;
    
    // Фильтруем слушателей (только онлайн и не текущий пользователь)
    const availableListeners = users.filter(u => 
        (u.role === 'listener' || u.role === 'admin') && 
        u.id !== currentUser.id && 
        u.isOnline
    );
    
    console.log('🎧 Доступные слушатели:', availableListeners.length);
    
    if (availableListeners.length === 0) {
        container.innerHTML = `
            <div class="empty-listeners">
                <div class="empty-icon">😔</div>
                <div class="empty-title">Нет доступных слушателей</div>
                <div class="empty-subtitle">Попробуйте позже или выберите случайного слушателя</div>
                <button class="btn btn-primary" onclick="selectRandomListener()">
                    🎲 Выбрать случайного
                </button>
            </div>
        `;
        return;
    }

    container.innerHTML = availableListeners.map(listener => `
        <div class="listener-card" onclick="startChatWithListener('${listener.id}')">
            <div class="listener-header">
                <div class="listener-avatar">${listener.avatar || '👤'}</div>
                <div class="listener-info">
                    <h3 class="listener-name">${listener.displayName || listener.username}</h3>
                    <div class="listener-rating">
                        <span class="stars">${'★'.repeat(Math.floor(listener.rating || 0))}${'☆'.repeat(5-Math.floor(listener.rating || 0))}</span>
                        <span class="rating-value">${(listener.rating || 0).toFixed(1)}</span>
                        <span class="rating-count">(${listener.ratingCount || 0})</span>
                    </div>
                </div>
            </div>
            <div class="listener-details">
                <div class="listener-status online">
                    <span class="status-dot"></span>
                    ● Онлайн
                </div>
                <div class="listener-role">${getRoleDisplayName(listener.role)}</div>
                ${listener.email ? `<div class="listener-email">${listener.email}</div>` : ''}
            </div>
            <div class="listener-actions">
                <button class="btn btn-primary btn-full" onclick="event.stopPropagation(); startChatWithListener('${listener.id}')">
                    💬 Начать чат
                </button>
            </div>
        </div>
    `).join('');
}

function selectRandomListener() {
    const availableListeners = users.filter(u => 
        (u.role === 'listener' || u.role === 'admin') && 
        u.isOnline && 
        u.id !== currentUser.id
    );
    
    if (availableListeners.length === 0) {
        showNotification('❌ Нет доступных слушателей онлайн!', 'error');
        return;
    }
    
    const randomListener = availableListeners[Math.floor(Math.random() * availableListeners.length)];
    showNotification(`🎲 Выбран слушатель: ${randomListener.displayName || randomListener.username}`, 'info');
    startChatWithListener(randomListener.id);
}

function updateListenerChatsList() {
    const container = document.getElementById('listenerChatsList');
    if (!container) return;
    
    // Фильтруем чаты слушателя
    const listenerChats = chats.filter(chat => 
        chat.user2 === currentUser.id && chat.isActive
    );
    
    console.log('💬 Активные чаты слушателя:', listenerChats.length);
    
    if (listenerChats.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">😴</div>
                <div class="empty-title">Активные чаты отсутствуют</div>
                <div class="empty-subtitle">Ожидайте подключения пользователей</div>
            </div>
        `;
        return;
    }
    
    container.innerHTML = listenerChats.map(chat => {
        const user = users.find(u => u.id === chat.user1);
        const lastMessage = chat.messages && chat.messages.length > 0 ? 
            chat.messages[chat.messages.length - 1] : null;
        
        return `
            <div class="chat-item ${activeChat && activeChat.id === chat.id ? 'active' : ''}" 
                 onclick="selectListenerChat('${chat.id}')">
                <div class="chat-header">
                    <div class="chat-user">
                        <span class="user-avatar-small">${user ? (user.avatar || '👤') : '👤'}</span>
                        <div class="user-info">
                            <div class="user-name">${user ? (user.displayName || user.username) : 'Пользователь'}</div>
                            <div class="chat-status active">● Активный</div>
                        </div>
                    </div>
                    <div class="chat-meta">
                        <span class="message-count">${chat.messages ? chat.messages.length : 0} сообщ.</span>
                    </div>
                </div>
                ${lastMessage ? `
                    <div class="last-message">
                        ${lastMessage.text.substring(0, 60)}${lastMessage.text.length > 60 ? '...' : ''}
                    </div>
                    <div class="message-time">
                        ${new Date(lastMessage.timestamp).toLocaleTimeString('ru-RU')}
                    </div>
                ` : `
                    <div class="last-message empty">Нет сообщений</div>
                `}
            </div>
        `;
    }).join('');
}

function selectListenerChat(chatId) {
    const chat = chats.find(chat => chat.id === chatId);
    if (!chat) {
        showNotification('❌ Чат не найден!', 'error');
        return;
    }

    activeChat = chat;
    
    // Обновляем выделение
    document.querySelectorAll('.chat-item').forEach(item => {
        item.classList.remove('active');
    });
    
    const selectedItem = document.querySelector(`.chat-item[onclick="selectListenerChat('${chatId}')"]`);
    if (selectedItem) {
        selectedItem.classList.add('active');
    }
    
    // Показываем чат
    document.getElementById('listenerChatsTab').classList.add('hidden');
    document.getElementById('listenerChatSection').classList.remove('hidden');
    
    // Загружаем сообщения
    loadListenerChatMessages();
    
    // Запускаем таймер если его нет
    if (!chatStartTime) {
        chatStartTime = new Date(chat.startTime);
        startChatTimer();
    }
    
    showNotification('💬 Чат выбран', 'info');
}

function updateListenerReviewsData() {
    const container = document.getElementById('listenerReviewsList');
    if (!container) return;
    
    // Фильтруем оценки для текущего слушателя
    const listenerRatings = ratings.filter(r => r.listenerId === currentUser.id);
    
    console.log('⭐ Отзывы слушателя:', listenerRatings.length);
    
    if (listenerRatings.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">⭐</div>
                <div class="empty-title">Отзывы отсутствуют</div>
                <div class="empty-subtitle">Ваши пользователи еще не оставили отзывов</div>
            </div>
        `;
        return;
    }
    
    container.innerHTML = listenerRatings.map(rating => {
        const user = users.find(u => u.id === rating.userId);
        const stars = '★'.repeat(rating.rating) + '☆'.repeat(5 - rating.rating);
        
        return `
            <div class="review-item">
                <div class="review-header">
                    <div class="reviewer-info">
                        <span class="reviewer-avatar">${user ? (user.avatar || '👤') : '👤'}</span>
                        <div>
                            <div class="reviewer-name">${user ? (user.displayName || user.username) : 'Аноним'}</div>
                            <div class="review-date">${new Date(rating.timestamp).toLocaleDateString('ru-RU')}</div>
                        </div>
                    </div>
                    <div class="review-rating">
                        <span class="stars">${stars}</span>
                        <span class="rating-value">${rating.rating}.0</span>
                    </div>
                </div>
                <div class="review-comment">${rating.comment || 'Без комментария'}</div>
            </div>
        `;
    }).join('');
}

function updateListenerStats() {
    console.log('📊 Обновление статистики слушателя');
    
    if (!currentUser) return;
    
    // Подсчитываем статистику
    const listenerChats = chats.filter(chat => chat.user2 === currentUser.id);
    const completedChats = listenerChats.filter(chat => !chat.isActive).length;
    const activeChats = listenerChats.filter(chat => chat.isActive).length;
    const totalMessages = listenerChats.reduce((total, chat) => total + (chat.messages?.length || 0), 0);
    const avgMessagesPerChat = completedChats > 0 ? (totalMessages / completedChats).toFixed(1) : 0;
    
    // Среднее время ответа (заглушка)
    const avgResponseTime = '45с';
    
    // Общее время онлайн (заглушка)
    const totalOnlineTime = '2ч 15м';
    
    // Обновляем элементы
    const stats = [
        { id: 'listenerTotalChats', value: completedChats },
        { id: 'listenerActiveChats', value: activeChats },
        { id: 'listenerAvgRating', value: (currentUser.rating || 0).toFixed(1) },
        { id: 'listenerTotalMessages', value: totalMessages },
        { id: 'listenerAvgMessages', value: avgMessagesPerChat },
        { id: 'listenerResponseTime', value: avgResponseTime },
        { id: 'listenerOnlineTime', value: totalOnlineTime }
    ];
    
    stats.forEach(stat => {
        const element = document.getElementById(stat.id);
        if (element) {
            element.textContent = stat.value;
        }
    });
}

function updateUserNotifications() {
    const container = document.getElementById('userNotificationsList');
    if (!container) return;
    
    const userNotifications = notifications.filter(notification => 
        notification.recipients === 'all' || notification.recipients === 'users'
    );
    
    if (userNotifications.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📭</div>
                <div class="empty-title">Уведомления отсутствуют</div>
                <div class="empty-subtitle">Здесь будут появляться важные уведомления</div>
            </div>
        `;
        return;
    }
    
    container.innerHTML = userNotifications.map(notification => `
        <div class="notification-item">
            <div class="notification-header">
                <div class="notification-title">${notification.title}</div>
                <div class="notification-type ${notification.type}"></div>
            </div>
            <div class="notification-text">${notification.text}</div>
            <div class="notification-footer">
                <span class="notification-date">${new Date(notification.timestamp).toLocaleString('ru-RU')}</span>
            </div>
        </div>
    `).join('');
}

function updateListenerNotifications() {
    const container = document.getElementById('listenerNotificationsList');
    if (!container) return;
    
    const listenerNotifications = notifications.filter(notification => 
        notification.recipients === 'all' || notification.recipients === 'listeners'
    );
    
    if (listenerNotifications.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📭</div>
                <div class="empty-title">Уведомления отсутствуют</div>
                <div class="empty-subtitle">Здесь будут появляться важные уведомления</div>
            </div>
        `;
        return;
    }
    
    container.innerHTML = listenerNotifications.map(notification => `
        <div class="notification-item">
            <div class="notification-header">
                <div class="notification-title">${notification.title}</div>
                <div class="notification-type ${notification.type}"></div>
            </div>
            <div class="notification-text">${notification.text}</div>
            <div class="notification-footer">
                <span class="notification-date">${new Date(notification.timestamp).toLocaleString('ru-RU')}</span>
            </div>
        </div>
    `).join('');
}

// Функции настроек
function showUserSettings() {
    showUserTab('settings');
}

function showListenerSettings() {
    showListenerTab('settings');
}

function loadUserSettings() {
    if (!currentUser) return;
    
    const elements = [
        { id: 'userProfileName', value: currentUser.displayName || '' },
        { id: 'userProfileEmail', value: currentUser.email || '' },
        { id: 'userProfileAvatar', value: currentUser.avatar || '👤' }
    ];
    
    elements.forEach(element => {
        const el = document.getElementById(element.id);
        if (el) {
            el.value = element.value;
        }
    });
    
    // Загружаем настройки уведомлений
    if (currentUser.settings) {
        const settings = currentUser.settings;
        document.getElementById('userNotifications').checked = settings.notifications !== false;
        document.getElementById('userSound').checked = settings.sound !== false;
        
        const themeSelect = document.getElementById('userTheme');
        if (themeSelect) {
            themeSelect.value = settings.theme || 'light';
        }
    }
}

function loadListenerSettings() {
    if (!currentUser) return;
    
    const elements = [
        { id: 'listenerProfileName', value: currentUser.displayName || '' },
        { id: 'listenerProfileEmail', value: currentUser.email || '' },
        { id: 'listenerProfileAvatar', value: currentUser.avatar || '🎧' }
    ];
    
    elements.forEach(element => {
        const el = document.getElementById(element.id);
        if (el) {
            el.value = element.value;
        }
    });
    
    // Загружаем настройки уведомлений
    if (currentUser.settings) {
        const settings = currentUser.settings;
        document.getElementById('listenerNotifications').checked = settings.notifications !== false;
        document.getElementById('listenerSound').checked = settings.sound !== false;
        
        const themeSelect = document.getElementById('listenerTheme');
        if (themeSelect) {
            themeSelect.value = settings.theme || 'light';
        }
    }
}

function saveUserProfile() {
    const displayName = document.getElementById('userProfileName').value.trim();
    const email = document.getElementById('userProfileEmail').value.trim();
    const avatar = document.getElementById('userProfileAvatar').value.trim();
    const newPassword = document.getElementById('userProfilePassword').value;
    const notifications = document.getElementById('userNotifications').checked;
    const sound = document.getElementById('userSound').checked;
    const theme = document.getElementById('userTheme').value;

    const updates = {
        displayName: displayName || currentUser.username,
        email: email,
        avatar: avatar,
        settings: {
            ...currentUser.settings,
            notifications: notifications,
            sound: sound,
            theme: theme
        }
    };

    if (newPassword) {
        updates.password = newPassword;
    }

    if (socket && socket.connected) {
        socket.emit('update_profile', {
            userId: currentUser.id,
            ...updates
        });
        
        // Очищаем поле пароля
        document.getElementById('userProfilePassword').value = '';
        
        // Сохраняем тему
        localStorage.setItem('theme', theme);
        document.body.setAttribute('data-theme', theme);
    }
}

function saveListenerProfile() {
    const displayName = document.getElementById('listenerProfileName').value.trim();
    const email = document.getElementById('listenerProfileEmail').value.trim();
    const avatar = document.getElementById('listenerProfileAvatar').value.trim();
    const newPassword = document.getElementById('listenerProfilePassword').value;
    const notifications = document.getElementById('listenerNotifications').checked;
    const sound = document.getElementById('listenerSound').checked;
    const theme = document.getElementById('listenerTheme').value;

    const updates = {
        displayName: displayName || currentUser.username,
        email: email,
        avatar: avatar,
        settings: {
            ...currentUser.settings,
            notifications: notifications,
            sound: sound,
            theme: theme
        }
    };

    if (newPassword) {
        updates.password = newPassword;
    }

    if (socket && socket.connected) {
        socket.emit('update_profile', {
            userId: currentUser.id,
            ...updates
        });
        
        // Очищаем поле пароля
        document.getElementById('listenerProfilePassword').value = '';
        
        // Сохраняем тему
        localStorage.setItem('theme', theme);
        document.body.setAttribute('data-theme', theme);
    }
}

function updateRatingsUI() {
    // Обновляем рейтинги в карточках слушателей
    if (currentUser && currentUser.role === 'user') {
        loadListenerCards();
    }
    
    // Обновляем отзывы слушателя
    if (currentUser && currentUser.role === 'listener') {
        updateListenerReviewsData();
        updateListenerStats();
    }
}

// Инициализация слушателя
document.addEventListener('DOMContentLoaded', function() {
    // Показать чаты по умолчанию
    if (document.getElementById('listenerInterface').style.display === 'block') {
        showListenerTab('chats');
    }
});
