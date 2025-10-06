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

// Добавляем новые функции для работы с персоналом
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
        socket.emit('update_staff', { 
            userId,
            username, 
            password: password || undefined, // только если пароль изменен
            displayName: name, 
            role 
        });
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

// Сбрасываем модальное окно при закрытии
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
