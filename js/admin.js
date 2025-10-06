// Функции админ панели
function showAdminSection(section) {
    console.log('Переключение на раздел:', section);
    
    // Скрыть все разделы
    document.querySelectorAll('.admin-section').forEach(sec => {
        sec.classList.add('hidden');
    });
    
    // Показать выбранный
    const target = document.getElementById(section + 'Section');
    if (target) {
        target.classList.remove('hidden');
    }
    
    // Обновить навигацию
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.getAttribute('data-section') === section);
    });
    
    // Загрузить данные для раздела
    switch(section) {
        case 'users':
            loadUsersSection();
            break;
        case 'staff':
            loadStaffSection();
            break;
        case 'chats':
            loadChatsSection();
            break;
    }
}

function loadUsersSection() {
    updateUsersTable();
}

function loadStaffSection() {
    updateStaffTable();
}

function loadChatsSection() {
    updateAdminChats();
}

function updateUsersTable() {
    const tbody = document.querySelector('#usersTable tbody');
    if (!tbody) return;

    const regularUsers = users.filter(u => u.role === 'user');
    
    if (regularUsers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">Нет пользователей</td></tr>';
        return;
    }

    tbody.innerHTML = regularUsers.map(user => `
        <tr>
            <td>
                <div class="user-info">
                    <span class="avatar">${user.avatar || '👤'}</span>
                    <div>
                        <div class="username">${user.username}</div>
                        <div class="display-name">${user.displayName}</div>
                    </div>
                </div>
            </td>
            <td>${user.email || '-'}</td>
            <td>
                <span class="status ${user.isOnline ? 'online' : 'offline'}">
                    ${user.isOnline ? '● Онлайн' : '○ Офлайн'}
                </span>
            </td>
            <td>${new Date(user.createdAt).toLocaleDateString()}</td>
            <td>
                <button class="btn btn-small" onclick="promoteToListener('${user.id}')">
                    🎧 Слушатель
                </button>
            </td>
        </tr>
    `).join('');
}

function updateStaffTable() {
    const tbody = document.querySelector('#staffTable tbody');
    if (!tbody) return;

    const staff = users.filter(u => u.role === 'listener' || u.role === 'admin');
    
    if (staff.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">Нет персонала</td></tr>';
        return;
    }

    tbody.innerHTML = staff.map(staff => `
        <tr>
            <td>
                <div class="user-info">
                    <span class="avatar">${staff.avatar}</span>
                    <div>
                        <div class="username">${staff.username}</div>
                        <div class="display-name">${staff.displayName}</div>
                    </div>
                </div>
            </td>
            <td>${staff.email || '-'}</td>
            <td>${getRoleDisplay(staff.role)}</td>
            <td>
                <span class="status ${staff.isOnline ? 'online' : 'offline'}">
                    ${staff.isOnline ? '● Онлайн' : '○ Офлайн'}
                </span>
            </td>
            <td>
                ${staff.role !== 'admin' ? `
                    <button class="btn btn-small btn-outline" onclick="demoteToUser('${staff.id}')">
                        👤 Пользователь
                    </button>
                ` : '<span class="role-badge">Админ</span>'}
            </td>
        </tr>
    `).join('');
}

function updateAdminChats() {
    const container = document.getElementById('adminChatsList');
    if (!container) return;

    if (chats.length === 0) {
        container.innerHTML = '<div class="empty-state">Нет чатов</div>';
        return;
    }

    container.innerHTML = chats.map(chat => {
        const user1 = users.find(u => u.id === chat.user1);
        const user2 = users.find(u => u.id === chat.user2);
        const lastMessage = chat.messages && chat.messages.length > 0 
            ? chat.messages[chat.messages.length - 1] 
            : null;

        return `
            <div class="chat-item">
                <div class="chat-header">
                    <div class="chat-users">
                        <span class="user">${user1?.displayName || 'Пользователь'}</span>
                        <span class="connector">↔</span>
                        <span class="user listener">${user2?.displayName || 'Слушатель'}</span>
                    </div>
                    <span class="chat-status ${chat.isActive ? 'active' : 'ended'}">
                        ${chat.isActive ? '● Активен' : '○ Завершен'}
                    </span>
                </div>
                ${lastMessage ? `
                    <div class="last-message">
                        ${lastMessage.text.substring(0, 50)}${lastMessage.text.length > 50 ? '...' : ''}
                    </div>
                ` : ''}
                <div class="chat-info">
                    <span>Сообщений: ${chat.messages?.length || 0}</span>
                    <span>${new Date(chat.startTime).toLocaleDateString()}</span>
                </div>
            </div>
        `;
    }).join('');
}

function getRoleDisplay(role) {
    const roles = {
        'owner': '👑 Владелец',
        'admin': '⚙️ Админ', 
        'listener': '🎧 Слушатель',
        'user': '👤 Пользователь'
    };
    return roles[role] || role;
}

function promoteToListener(userId) {
    if (!socket || !socket.connected) {
        showNotification('Нет соединения', 'error');
        return;
    }

    console.log('Повышение пользователя:', userId);
    socket.emit('change_role', { userId, newRole: 'listener' });
    showNotification('Пользователь повышен до слушателя', 'success');
}

function demoteToUser(userId) {
    if (!socket || !socket.connected) {
        showNotification('Нет соединения', 'error');
        return;
    }

    console.log('Понижение слушателя:', userId);
    socket.emit('change_role', { userId, newRole: 'user' });
    showNotification('Слушатель понижен до пользователя', 'success');
}

function showAddStaffModal() {
    document.getElementById('addStaffModal').style.display = 'block';
}

function closeAddStaffModal() {
    document.getElementById('addStaffModal').style.display = 'none';
    // Очистить форму
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
        showNotification('Заполните обязательные поля', 'error');
        return;
    }

    if (password.length < 6) {
        showNotification('Пароль должен быть не менее 6 символов', 'error');
        return;
    }

    if (!socket || !socket.connected) {
        showNotification('Нет соединения', 'error');
        return;
    }

    console.log('Добавление персонала:', username);
    socket.emit('register_staff', {
        username,
        password, 
        displayName: name,
        email,
        role
    });

    closeAddStaffModal();
}

// Инициализация админки
document.addEventListener('DOMContentLoaded', function() {
    // Показать dashboard по умолчанию
    showAdminSection('users');
});
