// Функции для админ панели
let currentSection = 'dashboard';

function showAdminPanel() {
    console.log('👑 Показ админ панели');
    hideAllInterfaces();
    document.getElementById('adminPanel').style.display = 'block';
    
    updateAdminProfileUI();
    updateAdminData();
    showSection('dashboard');
}

function showSection(section) {
    console.log('📂 Переключение на раздел:', section);
    
    // Обновляем навигацию
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.getAttribute('data-section') === section);
    });

    // Скрываем все разделы
    document.querySelectorAll('.content-section').forEach(sec => {
        sec.classList.add('hidden');
    });

    // Показываем выбранный раздел
    const targetSection = document.getElementById(section + 'Section');
    if (targetSection) {
        targetSection.classList.remove('hidden');
    }
    
    // Обновляем заголовок
    const titles = {
        dashboard: '📊 Статистика системы',
        chats: '💬 Все чаты',
        users: '👥 Управление пользователями',
        staff: '🎧 Управление персоналом',
        notifications: '📢 Технические уведомления',
        adminSettings: '⚙️ Настройки профиля',
        systemSettings: '🔧 Системные настройки'
    };
    
    const titleElement = document.getElementById('contentTitle');
    if (titleElement) {
        titleElement.textContent = titles[section] || section;
    }
    
    currentSection = section;
    
    // Загружаем данные для раздела
    switch(section) {
        case 'dashboard':
            updateAdminStats();
            break;
        case 'chats':
            updateAdminChatsList();
            break;
        case 'users':
            updateUsersTable();
            break;
        case 'staff':
            updateStaffTable();
            break;
        case 'notifications':
            updateSentNotifications();
            break;
        case 'systemSettings':
            loadSystemSettings();
            break;
    }
}

function updateAdminData() {
    console.log('🔄 Обновление данных админ панели');
    
    updateAdminStats();
    updateOnlineUsersList();
    updateUsersTable();
    updateStaffTable();
    updateAdminChatsList();
    updateSentNotifications();
}

function updateAdminStats() {
    const regularUsers = users.filter(u => u.role === 'user');
    const staff = users.filter(u => u.role === 'listener' || u.role === 'admin');
    const onlineUsers = users.filter(u => u.isOnline);
    const activeChats = chats.filter(c => c.isActive);
    const totalMessages = chats.reduce((total, chat) => total + (chat.messages?.length || 0), 0);
    
    // Обновляем статистику
    const stats = [
        { id: 'totalUsers', value: regularUsers.length },
        { id: 'totalListeners', value: staff.filter(u => u.role === 'listener').length },
        { id: 'activeChats', value: activeChats.length },
        { id: 'onlineUsers', value: onlineUsers.length },
        { id: 'messagesToday', value: totalMessages },
        { id: 'newUsersToday', value: regularUsers.length }
    ];
    
    stats.forEach(stat => {
        const element = document.getElementById(stat.id);
        if (element) {
            element.textContent = stat.value;
        }
    });
    
    // Средний рейтинг слушателей
    const listenersWithRatings = staff.filter(u => u.role === 'listener' && u.ratingCount > 0);
    const avgRating = listenersWithRatings.length > 0 ? 
        listenersWithRatings.reduce((sum, listener) => sum + (listener.rating || 0), 0) / listenersWithRatings.length : 0;
    
    const avgRatingElement = document.getElementById('avgRating');
    if (avgRatingElement) {
        avgRatingElement.textContent = avgRating.toFixed(1);
    }
}

function updateOnlineUsersList() {
    const container = document.getElementById('onlineUsersList');
    const onlineUsers = users.filter(u => u.isOnline);
    
    if (!container) return;
    
    if (onlineUsers.length === 0) {
        container.innerHTML = '<div class="empty-state">Нет пользователей онлайн</div>';
        return;
    }
    
    container.innerHTML = onlineUsers.map(user => `
        <div class="online-user-item">
            <div class="user-status online"></div>
            <div class="user-info">
                <div class="user-name">${user.displayName || user.username}</div>
                <div class="user-role">${getRoleDisplayName(user.role)}</div>
            </div>
            <div class="user-avatar">${user.avatar || '👤'}</div>
        </div>
    `).join('');
}

function updateUsersTable() {
    const tbody = document.querySelector('#usersTable tbody');
    const regularUsers = users.filter(u => u.role === 'user');
    
    if (!tbody) return;
    
    if (regularUsers.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="empty-state">
                    😔 Пользователи не найдены
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = regularUsers.map(user => `
        <tr>
            <td>
                <div class="user-cell">
                    <span class="user-avatar-small">${user.avatar || '👤'}</span>
                    <div>
                        <div class="user-name">${user.displayName || user.username}</div>
                        <div class="user-username">@${user.username}</div>
                    </div>
                </div>
            </td>
            <td>${user.email || 'Не указан'}</td>
            <td>
                <span class="status-badge ${user.isOnline ? 'online' : 'offline'}">
                    ${user.isOnline ? '● Онлайн' : '○ Офлайн'}
                </span>
            </td>
            <td>${new Date(user.createdAt).toLocaleDateString('ru-RU')}</td>
            <td>${new Date(user.lastSeen).toLocaleDateString('ru-RU')}</td>
            <td>
                <button class="btn btn-small btn-primary" onclick="promoteToListener('${user.id}')" 
                        title="Сделать слушателем">
                    🎧 Назначить
                </button>
            </td>
        </tr>
    `).join('');
}

function updateStaffTable() {
    const tbody = document.querySelector('#staffTable tbody');
    const staff = users.filter(u => u.role === 'listener' || u.role === 'admin' || u.role === 'owner');
    
    if (!tbody) return;
    
    if (staff.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="empty-state">
                    😔 Персонал не найден
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = staff.map(staffMember => `
        <tr>
            <td>
                <div class="user-cell">
                    <span class="user-avatar-small">${staffMember.avatar || '👤'}</span>
                    <div>
                        <div class="user-name">${staffMember.displayName || staffMember.username}</div>
                        <div class="user-username">@${staffMember.username}</div>
                    </div>
                </div>
            </td>
            <td>${staffMember.email || 'Не указан'}</td>
            <td>${getRoleDisplayName(staffMember.role)}</td>
            <td>
                <span class="status-badge ${staffMember.isOnline ? 'online' : 'offline'}">
                    ${staffMember.isOnline ? '● Онлайн' : '○ Офлайн'}
                </span>
            </td>
            <td>${(staffMember.rating || 0).toFixed(1)} ⭐ (${staffMember.ratingCount || 0})</td>
            <td>
                ${staffMember.role !== 'admin' && staffMember.role !== 'owner' ? 
                    `<button class="btn btn-small btn-outline" onclick="demoteToUser('${staffMember.id}')" 
                            title="Вернуть в пользователи">
                        👤 Вернуть
                    </button>` : 
                    '<span class="role-badge admin">👑 Администратор</span>'
                }
            </td>
        </tr>
    `).join('');
}

function updateAdminChatsList() {
    const container = document.getElementById('adminChatsList');
    
    if (!container) return;
    
    if (chats.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div>😔 Чаты отсутствуют</div>
                <div class="empty-state-subtitle">В системе пока нет чатов</div>
            </div>
        `;
        return;
    }
    
    container.innerHTML = chats.map(chat => {
        const user1 = users.find(u => u.id === chat.user1);
        const user2 = users.find(u => u.id === chat.user2);
        const lastMessage = chat.messages && chat.messages.length > 0 ? 
            chat.messages[chat.messages.length - 1] : null;
        
        return `
            <div class="chat-item ${chat.isActive ? 'active-chat' : 'ended-chat'}" 
                 onclick="selectAdminChat('${chat.id}')">
                <div class="chat-header">
                    <div class="chat-users">
                        <span class="user-badge">${user1 ? (user1.displayName || user1.username) : 'Пользователь'}</span>
                        <span class="chat-connector">↔</span>
                        <span class="user-badge listener">${user2 ? (user2.displayName || user2.username) : 'Слушатель'}</span>
                    </div>
                    <div class="chat-status ${chat.isActive ? 'status-active' : 'status-ended'}">
                        ${chat.isActive ? '● Активный' : '○ Завершен'}
                    </div>
                </div>
                <div class="chat-info">
                    <span class="message-count">${chat.messages ? chat.messages.length : 0} сообщ.</span>
                    <span class="chat-date">${new Date(chat.startTime).toLocaleDateString('ru-RU')}</span>
                </div>
                ${lastMessage ? `
                    <div class="last-message">
                        ${lastMessage.text.substring(0, 50)}${lastMessage.text.length > 50 ? '...' : ''}
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');
}

function selectAdminChat(chatId) {
    const chat = chats.find(c => c.id === chatId);
    if (!chat) return;
    
    // Обновляем выделение
    document.querySelectorAll('.chat-item').forEach(item => {
        item.classList.remove('selected');
    });
    
    const selectedItem = document.querySelector(`.chat-item[onclick="selectAdminChat('${chatId}')"]`);
    if (selectedItem) {
        selectedItem.classList.add('selected');
    }
    
    loadAdminChatMessages(chat);
}

function loadAdminChatMessages(chat) {
    const container = document.getElementById('adminMessagesContainer');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (!chat || !chat.messages || chat.messages.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div>💬 Нет сообщений</div>
                <div class="empty-state-subtitle">В этом чате пока нет сообщений</div>
            </div>
        `;
        return;
    }
    
    chat.messages.forEach(message => {
        const user = users.find(u => u.id === message.senderId);
        const isUser = user && user.role === 'user';
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isUser ? 'user-message' : 'listener-message'}`;
        messageDiv.innerHTML = `
            <div class="message-header">
                <strong>${user ? (user.displayName || user.username) : 'Неизвестный'}</strong>
                <span class="message-time">${new Date(message.timestamp).toLocaleString('ru-RU')}</span>
            </div>
            <div class="message-text">${message.text}</div>
        `;
        container.appendChild(messageDiv);
    });
    
    container.scrollTop = container.scrollHeight;
}

// Модальное окно добавления персонала
function showAddStaffModal() {
    document.getElementById('addStaffModal').classList.add('active');
}

function closeAddStaffModal() {
    document.getElementById('addStaffModal').classList.remove('active');
    document.getElementById('newStaffUsername').value = '';
    document.getElementById('newStaffPassword').value = '';
    document.getElementById('newStaffName').value = '';
    document.getElementById('newStaffEmail').value = '';
    document.getElementById('newStaffRole').value = 'listener';
}

function addNewStaff() {
    const username = document.getElementById('newStaffUsername').value.trim();
    const password = document.getElementById('newStaffPassword').value.trim();
    const name = document.getElementById('newStaffName').value.trim();
    const email = document.getElementById('newStaffEmail').value.trim();
    const role = document.getElementById('newStaffRole').value;

    if (!username || !password || !name) {
        showNotification('❌ Заполните обязательные поля!', 'error');
        return;
    }

    if (username.length < 3) {
        showNotification('❌ Логин должен быть не менее 3 символов!', 'error');
        return;
    }

    if (password.length < 6) {
        showNotification('❌ Пароль должен быть не менее 6 символов!', 'error');
        return;
    }

    if (socket && socket.connected) {
        console.log('➕ Добавление сотрудника:', { username, role });
        socket.emit('register_staff', { 
            username, 
            password, 
            displayName: name, 
            email,
            role 
        });
        closeAddStaffModal();
    } else {
        showNotification('❌ Нет соединения с сервером', 'error');
    }
}

function promoteToListener(userId) {
    if (socket && socket.connected) {
        console.log('🎧 Повышение пользователя до слушателя:', userId);
        socket.emit('change_role', { userId, newRole: 'listener' });
    } else {
        showNotification('❌ Нет соединения с сервером', 'error');
    }
}

function demoteToUser(userId) {
    if (socket && socket.connected) {
        console.log('👤 Понижение слушателя до пользователя:', userId);
        socket.emit('change_role', { userId, newRole: 'user' });
    } else {
        showNotification('❌ Нет соединения с сервером', 'error');
    }
}

// Уведомления
function updateSentNotifications() {
    const container = document.getElementById('sentNotificationsList');
    if (!container) return;
    
    if (notifications.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div>📭 Уведомления отсутствуют</div>
                <div class="empty-state-subtitle">Вы еще не отправляли технических уведомлений</div>
            </div>
        `;
        return;
    }
    
    container.innerHTML = notifications.map(notification => `
        <div class="notification-item">
            <div class="notification-header">
                <div class="notification-title">${notification.title}</div>
                <div class="notification-type ${notification.type}">${getNotificationTypeDisplay(notification.type)}</div>
            </div>
            <div class="notification-text">${notification.text}</div>
            <div class="notification-footer">
                <span class="notification-recipients">${getRecipientDisplayName(notification.recipients)}</span>
                <span class="notification-date">${new Date(notification.timestamp).toLocaleString('ru-RU')}</span>
            </div>
        </div>
    `).join('');
}

function getNotificationTypeDisplay(type) {
    const types = {
        'info': 'ℹ️ Информация',
        'warning': '⚠️ Предупреждение',
        'error': '❌ Ошибка',
        'success': '✅ Успех'
    };
    return types[type] || type;
}

function getRecipientDisplayName(recipients) {
    const names = {
        'all': '👥 Все пользователи',
        'users': '👤 Только пользователи',
        'listeners': '🎧 Только слушатели',
        'admins': '👑 Только администраторы'
    };
    return names[recipients] || recipients;
}

function sendTechnicalNotification() {
    const title = document.getElementById('notificationTitle').value.trim();
    const text = document.getElementById('notificationText').value.trim();
    const recipients = document.getElementById('notificationRecipients').value;
    const type = document.getElementById('notificationType').value;

    if (!title || !text) {
        showNotification('❌ Заполните заголовок и текст уведомления!', 'error');
        return;
    }

    if (socket && socket.connected) {
        console.log('📢 Отправка технического уведомления:', { title, recipients, type });
        socket.emit('send_technical_notification', {
            title,
            text,
            type,
            recipients
        });
        
        // Очищаем форму
        document.getElementById('notificationTitle').value = '';
        document.getElementById('notificationText').value = '';
        
        showNotification('📢 Уведомление отправлено!', 'success');
    } else {
        showNotification('❌ Нет соединения с сервером', 'error');
    }
}

// Системные настройки
function loadSystemSettings() {
    if (!systemSettings) return;
    
    const elements = [
        { id: 'systemTitleInput', value: systemSettings.siteTitle || '' },
        { id: 'systemTheme', value: systemSettings.theme || 'light' },
        { id: 'maxChatDuration', value: systemSettings.maxChatDuration || 60 },
        { id: 'allowUserRegistration', checked: systemSettings.allowUserRegistration !== false }
    ];
    
    elements.forEach(element => {
        const el = document.getElementById(element.id);
        if (el) {
            if (el.type === 'checkbox') {
                el.checked = element.checked;
            } else {
                el.value = element.value;
            }
        }
    });
}

function saveSystemSettings() {
    const settings = {
        siteTitle: document.getElementById('systemTitleInput').value.trim(),
        theme: document.getElementById('systemTheme').value,
        maxChatDuration: parseInt(document.getElementById('maxChatDuration').value) || 60,
        allowUserRegistration: document.getElementById('allowUserRegistration').checked
    };

    if (!settings.siteTitle) {
        showNotification('❌ Заполните название системы!', 'error');
        return;
    }

    if (socket && socket.connected) {
        console.log('💾 Сохранение системных настроек:', settings);
        socket.emit('update_system_settings', settings);
    } else {
        showNotification('❌ Нет соединения с сервером', 'error');
    }
}

// Принудительное обновление данных
function forceRefreshAdminData() {
    console.log('🔄 Принудительное обновление данных админ панели');
    if (socket && socket.connected) {
        socket.emit('force_refresh_data');
        showNotification('🔄 Данные обновляются...', 'info');
    }
}

// Настройки профиля администратора
function showAdminSettings() {
    showSection('adminSettings');
    loadAdminProfileSettings();
}

function loadAdminProfileSettings() {
    if (!currentUser) return;
    
    document.getElementById('adminProfileName').value = currentUser.displayName || '';
    document.getElementById('adminProfileEmail').value = currentUser.email || '';
    document.getElementById('adminProfileAvatar').value = currentUser.avatar || '👤';
}

function saveAdminProfile() {
    const displayName = document.getElementById('adminProfileName').value.trim();
    const email = document.getElementById('adminProfileEmail').value.trim();
    const avatar = document.getElementById('adminProfileAvatar').value.trim();
    const newPassword = document.getElementById('adminProfilePassword').value;

    const updates = {};
    if (displayName) updates.displayName = displayName;
    if (email) updates.email = email;
    if (avatar) updates.avatar = avatar;
    if (newPassword) updates.password = newPassword;

    if (Object.keys(updates).length === 0) {
        showNotification('ℹ️ Нет изменений для сохранения', 'info');
        return;
    }

    if (socket && socket.connected) {
        socket.emit('update_profile', {
            userId: currentUser.id,
            ...updates
        });
        
        // Очищаем поле пароля
        document.getElementById('adminProfilePassword').value = '';
    }
}
