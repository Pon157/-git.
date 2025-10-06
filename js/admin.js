// Функции админ панели
function showAdminPanel() {
    console.log('👑 Показ админ панели');
    hideAllInterfaces();
    document.getElementById('adminPanel').classList.remove('hidden');
    
    document.getElementById('adminDisplayName').textContent = currentUser.displayName || currentUser.username;
    document.getElementById('adminRole').textContent = getRoleDisplayName(currentUser.role);
    
    updateAdminData();
    showAdminThemeSettings();
}

function showSection(section) {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.getAttribute('data-section') === section);
    });

    document.querySelectorAll('.content-section').forEach(sec => {
        sec.classList.add('hidden');
    });

    const sectionElement = document.getElementById(section + 'Section');
    if (sectionElement) {
        sectionElement.classList.remove('hidden');
    }
    
    const titles = {
        dashboard: '📊 Статистика системы',
        chats: '💬 Все чаты',
        users: '👥 Управление пользователями',
        staff: '🎧 Управление персоналом',
        notifications: '📢 Технические уведомления',
        adminSettings: '⚙️ Настройки профиля'
    };
    document.getElementById('contentTitle').textContent = titles[section] || 'Панель управления';
    
    currentSection = section;
}

function showAdminSettings() {
    showSection('adminSettings');
}

function hideAdminSettings() {
    showSection('dashboard');
}

function updateAdminData() {
    const regularUsers = users.filter(u => u.role === 'user');
    const staff = users.filter(u => u.role !== 'user');
    const onlineUsers = users.filter(u => u.isOnline);
    
    document.getElementById('totalUsers').textContent = regularUsers.length;
    document.getElementById('totalListeners').textContent = staff.filter(u => u.role === 'listener').length;
    document.getElementById('activeChats').textContent = chats.filter(c => c.isActive).length;
    
    const listenersWithRatings = staff.filter(u => u.role === 'listener' && u.ratingCount > 0);
    const avgRating = listenersWithRatings.length > 0 ? 
        listenersWithRatings.reduce((sum, listener) => sum + (listener.rating || 0), 0) / listenersWithRatings.length : 0;
    document.getElementById('avgRating').textContent = avgRating.toFixed(1);
    
    updateOnlineUsersList(onlineUsers);
    updateQuickStats();
    updateUsersTable(regularUsers);
    updateStaffTable(staff);
    updateAdminChatsList();
    updateSentNotifications();
}

function updateOnlineUsersList(onlineUsers) {
    const container = document.getElementById('onlineUsersList');
    if (!container) return;
    
    if (onlineUsers.length === 0) {
        container.innerHTML = '<div style="text-align: center; color: #7f8c8d; padding: 20px;">Нет пользователей онлайн</div>';
        return;
    }
    
    container.innerHTML = onlineUsers.map(user => `
        <div style="display: flex; align-items: center; gap: 10px; padding: 8px; border-bottom: 1px solid var(--border-color);">
            <div style="width: 8px; height: 8px; background: #27ae60; border-radius: 50%;"></div>
            <div>
                <div style="font-weight: 600;">${user.displayName || user.username}</div>
                <div style="font-size: 12px; color: #7f8c8d;">${getRoleDisplayName(user.role)}</div>
            </div>
        </div>
    `).join('');
}

function updateQuickStats() {
    const messagesToday = chats.reduce((total, chat) => total + (chat.messages?.length || 0), 0);
    document.getElementById('messagesToday').textContent = messagesToday;
    document.getElementById('newUsersToday').textContent = users.length;
    document.getElementById('avgChatDuration').textContent = '15м';
}

function updateUsersTable(regularUsers) {
    const tbody = document.querySelector('#usersTable tbody');
    if (!tbody) return;
    
    if (regularUsers.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center" style="padding: 40px; color: #7f8c8d;">
                    😔 Пользователи не найдены
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = regularUsers.map(user => `
        <tr>
            <td>
                <div style="display: flex; align-items: center; gap: 10px;">
                    <div style="width: 8px; height: 8px; border-radius: 50%; background: ${user.isOnline ? '#27ae60' : '#7f8c8d'};"></div>
                    ${user.username}
                </div>
            </td>
            <td>${user.displayName || user.username}</td>
            <td>
                <span class="role-badge role-user">
                    ${getRoleDisplayName(user.role)}
                </span>
            </td>
            <td>
                <span class="${user.isOnline ? 'status-online' : 'status-offline'}">
                    ${user.isOnline ? '● Онлайн' : '○ Офлайн'}
                </span>
            </td>
            <td>
                <button class="btn btn-small btn-primary" onclick="promoteToListener('${user.id}')" title="Сделать слушателем">
                    🎧 Повысить
                </button>
            </td>
        </tr>
    `).join('');
}

function updateStaffTable(staff) {
    const tbody = document.querySelector('#staffTable tbody');
    if (!tbody) return;
    
    if (staff.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center" style="padding: 40px; color: #7f8c8d;">
                    😔 Персонал не найден
                    <div style="margin-top: 10px; font-size: 14px;">
                        <button class="btn btn-primary btn-small" onclick="showAddStaffModal()">
                            ➕ Добавить первого сотрудника
                        </button>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = staff.map(staffMember => `
        <tr>
            <td>
                <div style="display: flex; align-items: center; gap: 10px;">
                    <div style="width: 8px; height: 8px; border-radius: 50%; background: ${staffMember.isOnline ? '#27ae60' : '#7f8c8d'};"></div>
                    ${staffMember.username}
                </div>
            </td>
            <td>${staffMember.displayName || staffMember.username}</td>
            <td>
                <span class="role-badge role-${staffMember.role}">
                    ${getRoleDisplayName(staffMember.role)}
                </span>
            </td>
            <td>
                <span class="${staffMember.isOnline ? 'status-online' : 'status-offline'}">
                    ${staffMember.isOnline ? '● Онлайн' : '○ Офлайн'}
                </span>
            </td>
            <td>
                ${staffMember.role === 'listener' ? 
                    `<div style="display: flex; align-items: center; gap: 5px;">
                        <span style="color: #f39c12;">★</span>
                        <span>${(staffMember.rating || 0).toFixed(1)}</span>
                        <span style="font-size: 12px; color: #7f8c8d;">(${staffMember.ratingCount || 0})</span>
                    </div>` : 
                    '<span style="color: #7f8c8d; font-size: 12px;">—</span>'
                }
            </td>
            <td>
                <div style="display: flex; gap: 5px; flex-wrap: wrap;">
                    ${staffMember.role !== 'admin' ? 
                        `<button class="btn btn-small btn-secondary" onclick="demoteToUser('${staffMember.id}')" title="Понизить до пользователя">
                            👤
                        </button>` : 
                        '<span style="color: #7f8c8d; font-size: 12px;" title="Администратор">👑</span>'
                    }
                    <button class="btn btn-small btn-primary" onclick="editStaff('${staffMember.id}')" title="Редактировать">
                        ✏️
                    </button>
                    ${staffMember.role !== 'admin' ? 
                        `<button class="btn btn-small btn-danger" onclick="deleteStaff('${staffMember.id}')" title="Удалить">
                            🗑️
                        </button>` : ''
                    }
                </div>
            </td>
        </tr>
    `).join('');
}

function updateAdminChatsList() {
    const container = document.getElementById('adminChatsList');
    if (!container) return;
    
    if (chats.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #7f8c8d;">
                <div>😔 Чаты отсутствуют</div>
                <div style="font-size: 14px; margin-top: 10px;">В системе пока нет чатов</div>
            </div>
        `;
        return;
    }
    
    container.innerHTML = chats.map(chat => {
        const user1 = users.find(u => u.id === chat.user1);
        const user2 = users.find(u => u.id === chat.user2);
        return `
            <div class="chat-item" data-chat-id="${chat.id}" onclick="selectAdminChat('${chat.id}')">
                <div style="font-weight: 600;">
                    ${user1 ? (user1.displayName || user1.username) : 'Пользователь'} 
                    ↔ 
                    ${user2 ? (user2.displayName || user2.username) : 'Слушатель'}
                </div>
                <div style="font-size: 12px; color: #7f8c8d;">
                    ${chat.isActive ? '● Активный' : '○ Завершен'} • 
                    ${chat.messages ? chat.messages.length : 0} сообщ.
                </div>
                <div style="font-size: 11px; color: #7f8c8d; margin-top: 5px;">
                    ${new Date(chat.startTime).toLocaleDateString('ru-RU')}
                </div>
            </div>
        `;
    }).join('');
}

function selectAdminChat(chatId) {
    const chat = chats.find(c => c.id === chatId);
    if (!chat) return;
    
    document.querySelectorAll('.chat-item').forEach(item => {
        item.classList.remove('active');
    });
    const selectedItem = document.querySelector(`.chat-item[data-chat-id="${chatId}"]`);
    if (selectedItem) {
        selectedItem.classList.add('active');
    }
    
    loadAdminChatMessages(chat);
}

function loadAdminChatMessages(chat) {
    const container = document.getElementById('adminMessagesContainer');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (!chat || !chat.messages || chat.messages.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; color: #7f8c8d; margin-top: 50px;">
                <div>💬 Нет сообщений</div>
                <div style="font-size: 14px; margin-top: 10px;">В этом чате пока нет сообщений</div>
            </div>
        `;
        return;
    }
    
    chat.messages.forEach(message => {
        const messageDiv = document.createElement('div');
        const user = users.find(u => u.id === message.senderId);
        const isUser = user && user.role === 'user';
        
        messageDiv.className = `message ${isUser ? 'user' : 'other'}`;
        messageDiv.innerHTML = `
            <div><strong>${user ? (user.displayName || user.username) : 'Неизвестный'}:</strong> ${message.text}</div>
            <div class="message-time">${new Date(message.timestamp).toLocaleTimeString()}</div>
        `;
        container.appendChild(messageDiv);
    });
    
    container.scrollTop = container.scrollHeight;
}

function showAddStaffModal() {
    document.getElementById('addStaffModal').classList.remove('hidden');
}

function closeAddStaffModal() {
    document.getElementById('addStaffModal').classList.add('hidden');
    document.getElementById('newStaffUsername').value = '';
    document.getElementById('newStaffPassword').value = '';
    document.getElementById('newStaffName').value = '';
    document.getElementById('newStaffRole').value = 'listener';
    
    // Возвращаем оригинальную кнопку
    const btn = document.querySelector('#addStaffModal .btn-primary');
    btn.innerHTML = '<span>➕ Добавить сотрудника</span>';
    btn.onclick = addNewStaff;
}

function addNewStaff() {
    const username = document.getElementById('newStaffUsername').value.trim();
    const password = document.getElementById('newStaffPassword').value.trim();
    const name = document.getElementById('newStaffName').value.trim();
    const role = document.getElementById('newStaffRole').value;

    if (!username || !password || !name) {
        showNotification('❌ Заполните все поля!', 'error');
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
            role 
        });
    } else {
        showNotification('❌ Нет соединения с сервером', 'error');
    }

    closeAddStaffModal();
}

function editStaff(userId) {
    const staffMember = users.find(u => u.id === userId);
    if (!staffMember) return;
    
    // Заполняем модальное окно данными сотрудника
    document.getElementById('newStaffUsername').value = staffMember.username;
    document.getElementById('newStaffName').value = staffMember.displayName || '';
    document.getElementById('newStaffRole').value = staffMember.role;
    
    // Меняем текст кнопки
    const btn = document.querySelector('#addStaffModal .btn-primary');
    btn.innerHTML = '<span>💾 Сохранить изменения</span>';
    btn.onclick = function() { updateStaff(userId); };
    
    showAddStaffModal();
}

function updateStaff(userId) {
    const username = document.getElementById('newStaffUsername').value.trim();
    const password = document.getElementById('newStaffPassword').value.trim();
    const name = document.getElementById('newStaffName').value.trim();
    const role = document.getElementById('newStaffRole').value;

    if (!username || !name) {
        showNotification('❌ Заполните обязательные поля!', 'error');
        return;
    }

    if (socket && socket.connected) {
        console.log('✏️ Обновление сотрудника:', { userId, username, role });
        const updateData = { 
            userId,
            username, 
            displayName: name, 
            role 
        };
        
        // Добавляем пароль только если он был изменен
        if (password) {
            if (password.length < 6) {
                showNotification('❌ Пароль должен быть не менее 6 символов!', 'error');
                return;
            }
            updateData.password = password;
        }
        
        socket.emit('update_staff', updateData);
    }

    closeAddStaffModal();
}

function deleteStaff(userId) {
    if (confirm('❌ Вы уверены, что хотите удалить этого сотрудника?')) {
        if (socket && socket.connected) {
            console.log('🗑️ Удаление сотрудника:', userId);
            socket.emit('delete_staff', { userId });
        }
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

function sendTechnicalNotification() {
    const title = document.getElementById('notificationTitle').value.trim();
    const text = document.getElementById('notificationText').value.trim();
    const type = document.getElementById('notificationType').value;
    const recipients = document.getElementById('notificationRecipients').value;

    if (!title || !text) {
        showNotification('❌ Заполните заголовок и текст уведомления!', 'error');
        return;
    }

    if (socket && socket.connected) {
        console.log('📢 Отправка технического уведомления:', { title, type, recipients });
        socket.emit('send_notification', {
            title,
            text,
            type,
            recipients
        });
        
        // Очищаем форму
        document.getElementById('notificationTitle').value = '';
        document.getElementById('notificationText').value = '';
        
        showNotification('✅ Уведомление отправлено!', 'success');
    } else {
        showNotification('❌ Нет соединения с сервером', 'error');
    }
}

function updateSentNotifications() {
    const container = document.getElementById('sentNotificationsContainer');
    if (!container) return;
    
    // Здесь должна быть логика загрузки отправленных уведомлений
    // Показываем заглушку
    container.innerHTML = `
        <div style="text-align: center; padding: 20px; color: #7f8c8d;">
            <div>📢 История уведомлений</div>
            <div style="font-size: 14px; margin-top: 10px;">Здесь будет отображаться история отправленных уведомлений</div>
        </div>
    `;
}
