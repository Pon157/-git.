// Модуль настроек
const settings = {
    // Загрузить настройки пользователя
    loadUserPreferences() {
        const theme = localStorage.getItem('theme') || 'sunrise';
        const font = localStorage.getItem('font') || 'default';
        const fontSize = localStorage.getItem('fontSize') || 'normal';
        
        this.changeTheme(theme, false);
        this.changeFont(font, false);
        this.changeFontSize(fontSize, false);
    },

    // Получить HTML настроек профиля
    getProfileSettingsHTML() {
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
                                 data-avatar="${avatar}" onclick="settings.selectAvatar('${avatar}')">
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
                
                <button class="btn btn-primary w-full" onclick="settings.updateProfile()">
                    <span>💾 Сохранить изменения</span>
                </button>
            </div>
        `;
    },

    // Получить HTML настроек темы
    getThemeSettingsHTML() {
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
    },

    // Настроить обработчики событий тем
    setupThemeSettings() {
        document.querySelectorAll('.theme-option').forEach(option => {
            option.addEventListener('click', function() {
                const theme = this.getAttribute('data-theme');
                settings.changeTheme(theme);
            });
        });

        document.querySelectorAll('.font-option[data-font]').forEach(option => {
            option.addEventListener('click', function() {
                const font = this.getAttribute('data-font');
                settings.changeFont(font);
            });
        });

        document.querySelectorAll('.font-option[data-size]').forEach(option => {
            option.addEventListener('click', function() {
                const size = this.getAttribute('data-size');
                settings.changeFontSize(size);
            });
        });

        this.updateActiveSettings();
    },

    // Обновить активные настройки
    updateActiveSettings() {
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
    },

    // Выбрать аватар
    selectAvatar(avatar) {
        document.querySelectorAll('.avatar-option').forEach(option => {
            option.classList.remove('active');
        });
        const selectedOption = document.querySelector(`.avatar-option[data-avatar="${avatar}"]`);
        if (selectedOption) selectedOption.classList.add('active');
    },

    // Обновить профиль
    updateProfile() {
        const displayName = document.getElementById('profileDisplayName')?.value.trim();
        const newPassword = document.getElementById('newPassword')?.value.trim();
        const confirmPassword = document.getElementById('confirmPassword')?.value.trim();
        const selectedAvatar = document.querySelector('.avatar-option.active')?.getAttribute('data-avatar') || '👤';

        if (!displayName) {
            utils.showNotification('❌ Введите имя пользователя!', 'error');
            return;
        }

        if (newPassword && newPassword !== confirmPassword) {
            utils.showNotification('❌ Пароли не совпадают!', 'error');
            return;
        }

        if (newPassword && newPassword.length < 6) {
            utils.showNotification('❌ Пароль должен быть не менее 6 символов!', 'error');
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

        console.log('💾 Обновление профиля:', updateData);
        socket.emit('update_profile', updateData);
    },

    // Изменить тему
    changeTheme(themeName, save = true) {
        document.body.className = document.body.className.replace(/theme-\w+/g, '');
        document.body.classList.add('theme-' + themeName);
        
        if (save) {
            localStorage.setItem('theme', themeName);
            this.updateActiveSettings();
        }
    },

    // Изменить шрифт
    changeFont(fontName, save = true) {
        document.body.className = document.body.className.replace(/font-\w+/g, '');
        document.body.classList.add('font-' + fontName);
        
        if (save) {
            localStorage.setItem('font', fontName);
            this.updateActiveSettings();
        }
    },

    // Изменить размер шрифта
    changeFontSize(size, save = true) {
        document.body.className = document.body.className.replace(/font-size-\w+/g, '');
        document.body.classList.add('font-size-' + size);
        
        if (save) {
            localStorage.setItem('fontSize', size);
            this.updateActiveSettings();
        }
    },

    // Инициализация модуля
    init() {
        console.log('🔧 Инициализация модуля настроек...');
        this.setupGlobalEventListeners();
    },

    // Настройка глобальных обработчиков событий
    setupGlobalEventListeners() {
        // Обработчики для выбора аватара
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('avatar-option')) {
                const avatar = e.target.getAttribute('data-avatar');
                this.selectAvatar(avatar);
            }
        });

        // Обработчики для тем
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('theme-option')) {
                const theme = e.target.getAttribute('data-theme');
                this.changeTheme(theme);
            }
        });

        // Обработчики для шрифтов
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('font-option') && e.target.hasAttribute('data-font')) {
                const font = e.target.getAttribute('data-font');
                this.changeFont(font);
            }
        });

        // Обработчики для размеров шрифта
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('font-option') && e.target.hasAttribute('data-size')) {
                const size = e.target.getAttribute('data-size');
                this.changeFontSize(size);
            }
        });

        // Обработчик для обновления профиля
        document.addEventListener('click', (e) => {
            if (e.target.closest && e.target.closest('button') && e.target.closest('button').textContent.includes('Сохранить изменения')) {
                this.updateProfile();
            }
        });
    }
};

// Настройки пользователя
const userSettings = {
    show() {
        console.log('👤 Показ настроек пользователя');
        utils.hideElement('listenersTab');
        utils.hideElement('userChatSection');
        utils.hideElement('userNotificationsTab');
        utils.showElement('userSettings');
        
        // Обновляем настройки профиля
        this.showThemeSettings();
    },

    hide() {
        console.log('👤 Скрытие настроек пользователя');
        utils.hideElement('userSettings');
        utils.showElement('listenersTab');
    },

    showThemeSettings() {
        const container = document.getElementById('userThemeSettings');
        if (!container) return;
        container.innerHTML = settings.getProfileSettingsHTML() + settings.getThemeSettingsHTML();
        settings.setupThemeSettings();
    },

    init() {
        console.log('🔧 Инициализация настроек пользователя');
        document.addEventListener('click', (e) => {
            if (e.target.id === 'userSettingsBtn') {
                this.show();
            }
            if (e.target.id === 'userBackBtn') {
                this.hide();
            }
        });
    }
};

// Настройки слушателя
const listenerSettings = {
    show() {
        console.log('🎧 Показ настроек слушателя');
        utils.hideElement('listenerChatsTab');
        utils.hideElement('listenerReviewsTab');
        utils.hideElement('listenerStatsTab');
        utils.hideElement('listenerNotificationsTab');
        utils.showElement('listenerSettings');
        
        // Обновляем настройки профиля
        this.showThemeSettings();
    },

    hide() {
        console.log('🎧 Скрытие настроек слушателя');
        utils.hideElement('listenerSettings');
        utils.showElement('listenerChatsTab');
    },

    showThemeSettings() {
        const container = document.getElementById('listenerThemeSettings');
        if (!container) return;
        container.innerHTML = settings.getProfileSettingsHTML() + settings.getThemeSettingsHTML();
        settings.setupThemeSettings();
    },

    init() {
        console.log('🔧 Инициализация настроек слушателя');
        document.addEventListener('click', (e) => {
            if (e.target.id === 'listenerSettingsBtn') {
                this.show();
            }
            if (e.target.id === 'listenerBackBtn') {
                this.hide();
            }
        });
    }
};

// Настройки администратора
const adminSettings = {
    show() {
        console.log('👑 Показ настроек администратора');
        admin.showSection('adminSettings');
        
        // Обновляем настройки профиля
        this.showThemeSettings();
    },

    hide() {
        console.log('👑 Скрытие настроек администратора');
        admin.showSection('dashboard');
    },

    showThemeSettings() {
        const container = document.getElementById('adminThemeSettings');
        if (!container) return;
        container.innerHTML = settings.getProfileSettingsHTML() + settings.getThemeSettingsHTML();
        settings.setupThemeSettings();
    },

    init() {
        console.log('🔧 Инициализация настроек администратора');
        document.addEventListener('click', (e) => {
            if (e.target.id === 'adminSettingsBtn') {
                this.show();
            }
            if (e.target.id === 'adminBackBtn') {
                this.hide();
            }
        });
    }
};
