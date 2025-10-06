// Модуль слушателей
const listeners = {
    // Загрузить карточки слушателей
    loadCards() {
        const container = document.getElementById('listenerCards');
        if (!container) return;
        
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
            <div class="listener-card" onclick="listeners.startChat('${listener.id}')">
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
                    ${utils.getRoleDisplayName(listener.role)}
                </div>
                ${listener.isOnline ? `
                    <div style="font-size: 12px; color: #27ae60; margin-top: 5px;">
                        ✅ Готов помочь
                    </div>
                ` : ''}
            </div>
        `).join('');
    },

    // Выбрать случайного слушателя
    selectRandom() {
        const listeners = users.filter(u => 
            (u.role === 'listener' || u.role === 'admin') && 
            u.isOnline && 
            u.id !== currentUser.id
        );
        if (listeners.length === 0) {
            utils.showNotification('❌ Нет доступных слушателей онлайн!', 'error');
            return;
        }
        
        const randomListener = listeners[Math.floor(Math.random() * listeners.length)];
        this.startChat(randomListener.id);
    },

    // Начать чат со слушателем
    startChat(listenerId) {
        const listener = users.find(u => u.id === listenerId);
        if (!listener) {
            utils.showNotification('❌ Слушатель не найден!', 'error');
            return;
        }

        currentListener = listener;
        
        console.log('💬 Начало чата с:', listener.displayName || listener.username);
        
        // Создаем новый чат через сервер
        socket.emit('create_chat', {
            user1: currentUser.id,
            user2: listenerId
        });

        // Показываем чат
        utils.hideElement('listenersTab');
        utils.hideElement('userNotificationsTab');
        utils.showElement('userChatSection');
        
        const ratingElement = document.getElementById('currentListenerRating');
        if (ratingElement) {
            ratingElement.textContent = (listener.rating || 0).toFixed(1);
        }
        
        // Запускаем таймер
        chatStartTime = new Date();
        chat.startChatTimer();
    },

    // Инициализация
    init() {
        this.setupEventListeners();
    },

    // Настройка обработчиков событий
    setupEventListeners() {
        document.getElementById('randomListenerBtn')?.addEventListener('click', () => {
            this.selectRandom();
        });
    }
};
