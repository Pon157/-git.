// Функции для настроек профиля и темы
function getProfileSettingsHTML() {
    const avatars = ['👤', '👨', '👩', '🎧', '👑', '😊', '🤖', '🌟', '🎯', '💫'];
    
    return `
        <div class="profile-settings">
            <h3 class="settings-title">👤 Настройки профиля</h3>
            
            <div class="form-group">
                <label class="form-label">📛 Имя пользователя</label>
                <input type="text" class="form-input" id="profileDisplayName" 
                       value="${currentUser.displayName || currentUser.username}" 
                       placeholder="Введите ваше имя">
            </div>
            
            <div class="form-group">
                <label class="form-label">🖼️ Аватар</label>
                <div class="avatar-selection">
                    ${avatars.map(avatar => `
                        <div class="avatar-option ${currentUser.avatar === avatar ? 'active' : ''}" 
                             data-avatar="${avatar}" onclick="selectAvatar('${avatar}')">
                            ${avatar}
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <div class="form-group">
                <label class="form-label">🔑 Новый пароль</label>
                <input type="password" class="form-input" id="newPassword" 
                       placeholder="Оставьте пустым, если не хотите менять">
            </div>
            
            <div class="form-group">
                <label class="form-label">✅ Подтвердите пароль</label>
                <input type="password" class="form-input" id="confirmPassword" 
                       placeholder="Повторите новый пароль">
            </div>
            
            <button class="btn btn-primary w-full" onclick="updateProfile()">
                <span>💾 Сохранить изменения</span>
            </button>
        </div>
    `;
}

function selectAvatar(avatar) {
    document.querySelectorAll('.avatar-option').forEach(option => {
        option.classList.remove('active');
    });
    document.querySelector(`.avatar-option[data-avatar="${avatar}"]`).classList.add('active');
}

function updateProfile() {
    const displayName = document.getElementById('profileDisplayName').value.trim();
    const newPassword = document.getElementById('newPassword').value.trim();
    const confirmPassword = document.getElementById('confirmPassword').value.trim();
    const selectedAvatar = document.querySelector('.avatar-option.active')?.getAttribute('data-avatar') || '👤';

    if (!displayName) {
        showNotification('❌ Введите имя пользователя!', 'error');
        return;
    }

    if (newPassword && newPassword !== confirmPassword) {
        showNotification('❌ Пароли не совпадают!', 'error');
        return;
    }

    if (newPassword && newPassword.length < 6) {
        showNotification('❌ Пароль должен быть не менее 6 символов!', 'error');
        return;
    }

    const updateData = {
        userId: currentUser.id,
        displayName: displayName,
        avatar: selectedAvatar
    };

    if (newPassword) {
        updateData.password = newPassword;
    }

    socket.emit('update_profile', updateData);
}

function updateUserInterface() {
    if (!currentUser) return;

    const elements = [
        { id: 'userDisplayName', text: currentUser.displayName || currentUser.username },
        { id: 'listenerDisplayName', text: currentUser.displayName || currentUser.username },
        { id: 'adminDisplayName', text: currentUser.displayName || currentUser.username },
        { id: 'userAvatar', text: currentUser.avatar || '👤' },
        { id: 'listenerAvatar', text: currentUser.avatar || '👤' }
    ];

    elements.forEach(element => {
        const el = document.getElementById(element.id);
        if (el) el.textContent = element.text;
    });
}

function showUserThemeSettings() {
    const container = document.getElementById('userThemeSettings');
    container.innerHTML = getProfileSettingsHTML() + getThemeSettingsHTML();
    setupThemeSettings();
}

function showListenerThemeSettings() {
    const container = document.getElementById('listenerThemeSettings');
    container.innerHTML = getProfileSettingsHTML() + getThemeSettingsHTML();
    setupThemeSettings();
}

function showAdminThemeSettings() {
    const container = document.getElementById('adminThemeSettings');
    container.innerHTML = getProfileSettingsHTML() + getThemeSettingsHTML();
    setupThemeSettings();
}

function getThemeSettingsHTML() {
    return `
        <div class="settings-section">
            <h3 class="settings-title">🎨 Тема оформления</h3>
            <div class="theme-selector">
                <div class="theme-option" data-theme="sunrise">
                    <div class="theme-preview" style="background: linear-gradient(135deg, #ff7e5f 0%, #feb47b 100%);"></div>
                    🌅 Рассвет
                </div>
                <div class="theme-option" data-theme="light">
                    <div class="theme-preview" style="background: linear-gradient(135deg, #3498db 0%, #2c3e50 100%);"></div>
                    ☀️ Светлая
                </div>
                <div class="theme-option" data-theme="dark">
                    <div class="theme-preview" style="background: linear-gradient(135deg, #3498db 0%, #34495e 100%);"></div>
                    🌙 Тёмная
                </div>
                <div class="theme-option" data-theme="ocean">
                    <div class="theme-preview" style="background: linear-gradient(135deg, #1e90ff 0%, #00ced1 100%);"></div>
                    🌊 Океан
                </div>
                <div class="theme-option" data-theme="forest">
                    <div class="theme-preview" style="background: linear-gradient(135deg, #228b22 0%, #32cd32 100%);"></div>
                    🌳 Лес
                </div>
                <div class="theme-option" data-theme="midnight">
                    <div class="theme-preview" style="background: linear-gradient(135deg, #8a2be2 0%, #4b0082 100%);"></div>
                    🌌 Полночь
                </div>
                <div class="theme-option" data-theme="coffee">
                    <div class="theme-preview" style="background: linear-gradient(135deg, #8b4513 0%, #d2691e 100%);"></div>
                    ☕ Кофе
                </div>
            </div>
        </div>

        <div class="settings-section">
            <h3 class="settings-title">🔤 Шрифт</h3>
            <div class="font-selector">
                <div class="font-option" data-font="default">🔤 Стандартный</div>
                <div class="font-option" data-font="modern">🔄 Современный</div>
                <div class="font-option" data-font="elegant">💎 Элегантный</div>
                <div class="font-option" data-font="tech">⚙️ Технический</div>
            </div>
        </div>

        <div class="settings-section">
            <h3 class="settings-title">📏 Размер шрифта</h3>
            <div class="font-selector">
                <div class="font-option" data-size="small">🔍 Маленький</div>
                <div class="font-option" data-size="normal">📝 Обычный</div>
                <div class="font-option" data-size="large">🔊 Большой</div>
                <div class="font-option" data-size="xlarge">💥 Очень большой</div>
            </div>
        </div>
    `;
}

function setupThemeSettings() {
    document.querySelectorAll('.theme-option').forEach(option => {
        option.addEventListener('click', function() {
            const theme = this.getAttribute('data-theme');
            changeTheme(theme);
        });
    });

    document.querySelectorAll('.font-option[data-font]').forEach(option => {
        option.addEventListener('click', function() {
            const font = this.getAttribute('data-font');
            changeFont(font);
        });
    });

    document.querySelectorAll('.font-option[data-size]').forEach(option => {
        option.addEventListener('click', function() {
            const size = this.getAttribute('data-size');
            changeFontSize(size);
        });
    });

    updateActiveSettings();
}

function updateActiveSettings() {
    const theme = localStorage.getItem('theme') || 'sunrise';
    const font = localStorage.getItem('font') || 'default';
    const fontSize = localStorage.getItem('fontSize') || 'normal';

    document.querySelectorAll('.theme-option').forEach(option => {
        option.classList.toggle('active', option.getAttribute('data-theme') === theme);
    });

    document.querySelectorAll('.font-option[data-font]').forEach(option => {
        option.classList.toggle('active', option.getAttribute('data-font') === font);
    });

    document.querySelectorAll('.font-option[data-size]').forEach(option => {
        option.classList.toggle('active', option.getAttribute('data-size') === fontSize);
    });
}

function changeTheme(themeName, save = true) {
    document.body.className = document.body.className.replace(/theme-\w+/g, '');
    document.body.classList.add('theme-' + themeName);
    
    if (save) {
        localStorage.setItem('theme', themeName);
        updateActiveSettings();
    }
}

function changeFont(fontName, save = true) {
    document.body.className = document.body.className.replace(/font-\w+/g, '');
    document.body.classList.add('font-' + fontName);
    
    if (save) {
        localStorage.setItem('font', fontName);
        updateActiveSettings();
    }
}

function changeFontSize(size, save = true) {
    document.body.className = document.body.className.replace(/font-size-\w+/g, '');
    document.body.classList.add('font-size-' + size);
    
    if (save) {
        localStorage.setItem('fontSize', size);
        updateActiveSettings();
    }
}

function loadUserPreferences() {
    const theme = localStorage.getItem('theme') || 'sunrise';
    const font = localStorage.getItem('font') || 'default';
    const fontSize = localStorage.getItem('fontSize') || 'normal';
    
    changeTheme(theme, false);
    changeFont(font, false);
    changeFontSize(fontSize, false);
}
