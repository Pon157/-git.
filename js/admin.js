// Модуль администратора
const admin = {
    // Показать секцию
    showSection(section) {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active', item.getAttribute('data-section') === section);
        });

        document.querySelectorAll('.content-section').forEach(sec => {
            sec.classList.add('hidden');
        });

        document.getElementById(section + 'Section').classList.remove('hidden');
        
        const titles = {
            dashboard: '📊 Статистика системы',
            chats: '💬 Все чаты',
            users: '👥 Управление пользователями',
            staff: '🎧 Управление персоналом',
            notifications: '📢 Технические уведомления',
            adminSettings: '⚙️ Настройки профиля'
        };
        document.getElementById('contentTitle').textContent = titles[section];
        
        currentSection = section;
    },

    // Обновить данные админки
    updateData() {
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
        
        this.updateOnlineUsersList(onlineUsers);
        this.updateQuickStats();
        this.updateUsersTable(regularUsers);
        this.updateStaffTable(staff);
        this.updateAdminChatsList();
        notifications.updateSentNotifications();
    },

    // Обновить список онлайн пользователей
    updateOnlineUsersList(onlineUsers) {
        const container = document.getElementById('onlineUsersList');
        if (onlineUsers.length === 0) {
            container.innerHTML = '<div style="text-align: center; color: #7f8c8d; padding: 20px;">Нет пользователей онлайн</div>';
            return;
        }
        
        container.innerHTML = onlineUsers.map(user => `
            <div style="display: flex; align-items: center; gap: 10px; padding: 8px; border-bottom: 1px solid var(--border-color);">
                <div style="width: 8px; height: 8px; background: #27ae60; border-radius: 50%;"></div>
                <div>
                    <div style="font-weight: 600;">${user.displayName || user.username}</div>
                    <div style="font-size: 12px; color: #7f8c8d;">${utils.getRoleDisplayName(user.role)}</div>
                </div>
            </div>
        `).join('');
    },

    // Обновить быструю статистику
    updateQuickStats() {
        document.getElementById('messagesToday').textContent = chats.reduce((total, chat) => total + (chat.messages?.length || 0), 0);
        document.getElementById('newUsersToday').textContent = users.length;
        document.getElementById('avgChatDuration').textContent = '15м';
    },

    // Обновить таблицу пользователей
    updateUsersTable(regularUsers) {
        const tbody = document.querySelector('#usersTable tbody');
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
                <td>${user.username}</td>
                <td>${user.displayName || user.username}</td>
                <td>${utils.getRoleDisplayName(user.role)}</td>
                <td>
                    <span class="${user.isOnline ? 'status-online' : 'status-offline'}">
                        ${user.isOnline ? '● Онлайн' : '○ Офлайн'}
                    </span>
                </td>
                <td>
                    <button class="btn btn-small btn-primary" onclick="admin.promoteToListener('${user.id}')">
                        🎧 Слушатель
                    </button>
                </td>
            </tr>
        `).join('');
    },

    // Обновить таблицу персонала
    updateStaffTable(staff) {
        const tbody = document.querySelector('#staffTable tbody');
        if (staff.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center" style="padding: 40px; color: #7f8c8d;">
                        😔 Персонал не найден
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = staff.map(staffMember => `
            <tr>
                <td>${staffMember.username}</td>
                <td>${staffMember.displayName || staffMember.username}</td>
                <td>${utils.getRoleDisplayName(staffMember.role)}</td>
                <td>
                    <span class="${staffMember.isOnline ? 'status-online' : 'status-offline'}">
                        ${staffMember.isOnline ? '● Онлайн' : '○ Офлайн'}
                    </span>
                </td>
                <td>
                    ${staffMember.role !== 'admin' ? 
                        `<button class="btn btn-small btn-primary" onclick="admin.demoteToUser('${staffMember.id}')">
                            👤 Пользователь
                        </button>` : 
                        '<span style="color: #7f8c8d; font-size: 12px;">👑 Администратор</span>'
                    }
                </td>
            </tr>
        `).join('');
    },

    // Обновить список чатов админа
    updateAdminChatsList() {
        const container = document.getElementById('adminChatsList');
        
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
                <div class="chat-item" data-chat-id="${chat.id}" onclick="admin.selectChat('${chat.id}')">
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
                        ${utils.formatDate(chat.startTime)}
                    </div>
                </div>
            `;
        }).join('');
    },

    // Выбрать чат для просмотра
    selectChat(chatId) {
        const chat = chats.find(c => c.id === chatId);
        if (!chat) return;
        
        document.querySelectorAll('.chat-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`.chat-item[data-chat-id="${chatId}"]`).classList.add('active');
        
        this.loadChatMessages(chat);
    },

    // Загрузить сообщения чата
    loadChatMessages(chat) {
        const container = document.getElementById('adminMessagesContainer');
        
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
                <div class="message-time">${utils.formatTime(message.timestamp)}</div>
            `;
            container.appendChild(messageDiv);
        });
        
        container.scrollTop = container.scrollHeight;
    },

    // Показать модальное окно добавления сотрудника
    showAddStaffModal() {
        document.getElementById('addStaffModal').style.display = 'flex';
    },

    // Закрыть модальное окно добавления сотрудника
    closeAddStaffModal() {
        document.getElementById('addStaffModal').style.display = 'none';
        document.getElementById('newStaffUsername').value = '';
        document.getElementById('newStaffPassword').value = '';
        document.getElementById('newStaffName').value = '';
        document.getElementById('newStaffRole').value = 'listener';
    },

    // Добавить нового сотрудника
    addNewStaff() {
        const username = document.getElementById('newStaffUsername').value.trim();
        const password = document.getElementById('newStaffPassword').value.trim();
        const name = document.getElementById('newStaffName').value.trim();
        const role = document.getElementById('newStaffRole').value;

        if (!username || !password || !name) {
            utils.showNotification('❌ Заполните все поля!', 'error');
            return;
        }

        if (socket && socket.connected) {
            socket.emit('register_staff', { 
                username, 
                password, 
                displayName: name, 
                role 
            });
        } else {
            utils.showNotification('❌ Нет соединения с сервером', 'error');
        }

        this.closeAddStaffModal();
    },

    // Повысить до слушателя
    promoteToListener(userId) {
        if (socket && socket.connected) {
            socket.emit('change_role', { userId, newRole: 'listener' });
        } else {
            utils.showNotification('❌ Нет соединения с сервером', 'error');
        }
    },

    // Понизить до пользователя
    demoteToUser(userId) {
        if (socket && socket.connected) {
            socket.emit('change_role', { userId, newRole: 'user' });
        } else {
            utils.showNotification('❌ Нет соединения с сервером', 'error');
        }
    }
};
