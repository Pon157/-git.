// Модуль чата
const chat = {
    // Инициализация модуля
    init() {
        this.setupEventListeners();
    },

    // Настройка обработчиков событий
    setupEventListeners() {
        console.log('🔧 Настройка обработчиков чата...');
        
        // Обработчики Enter для полей ввода сообщений
        document.getElementById('userMessageInput')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.sendUserMessage();
            }
        });

        document.getElementById('listenerMessageInput')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.sendListenerMessage();
            }
        });

        // Кнопки отправки сообщений
        document.getElementById('userSendBtn')?.addEventListener('click', () => this.sendUserMessage());
        document.getElementById('listenerSendBtn')?.addEventListener('click', () => this.sendListenerMessage());

        // Обработчики рейтинга
        document.querySelectorAll('.rating-star').forEach(star => {
            star.addEventListener('click', function() {
                selectedRating = parseInt(this.getAttribute('data-rating'));
                chat.updateRatingStars(selectedRating);
            });
        });

        // Кнопки чата
        document.getElementById('submitRatingBtn')?.addEventListener('click', () => this.submitRating());
        document.getElementById('endChatBtn')?.addEventListener('click', () => this.end());
    },

    // Отправить сообщение от пользователя
    sendUserMessage() {
        if (!activeChat) {
            utils.showNotification('❌ Сначала выберите слушателя!', 'error');
            return;
        }
        
        const input = document.getElementById('userMessageInput');
        const text = input.value.trim();
        
        if (!text) {
            utils.showNotification('❌ Введите сообщение!', 'error');
            return;
        }

        const message = {
            text: text,
            senderId: currentUser.id,
            timestamp: new Date()
        };

        console.log('📤 Отправка сообщения:', message);
        
        // Добавляем сообщение сразу в интерфейс отправителя
        this.addMessageToUserChat(message);
        
        socket.emit('send_message', {
            chatId: activeChat.id,
            message: message
        });

        input.value = '';
    },

    // Отправить сообщение от слушателя
    sendListenerMessage() {
        if (!activeChat) {
            utils.showNotification('❌ Выберите чат для общения!', 'error');
            return;
        }
        
        const input = document.getElementById('listenerMessageInput');
        const text = input.value.trim();
        
        if (!text) {
            utils.showNotification('❌ Введите сообщение!', 'error');
            return;
        }

        const message = {
            text: text,
            senderId: currentUser.id,
            timestamp: new Date()
        };

        console.log('📤 Отправка сообщения от слушателя:', message);
        
        // Добавляем сообщение сразу в интерфейс отправителя
        this.addMessageToListenerChat(message);
        
        socket.emit('send_message', {
            chatId: activeChat.id,
            message: message
        });

        input.value = '';
    },

    // Обработка нового сообщения
    handleNewMessage(data) {
        console.log('📨 Обработка нового сообщения:', data);
        
        // Проверяем, не было ли уже обработано это сообщение
        if (messageIds.has(data.message.id)) {
            console.log('⚠️ Сообщение уже обработано, пропускаем:', data.message.id);
            return;
        }
        
        messageIds.add(data.message.id);
        
        if (activeChat && activeChat.id === data.chatId) {
            if (!activeChat.messages) activeChat.messages = [];
            activeChat.messages.push(data.message);
            
            // Обновляем счетчик сообщений
            this.updateMessageCount();
            
            // Отображаем сообщение у обоих участников чата
            if (currentUser.role === 'user') {
                if (data.message.senderId !== currentUser.id) {
                    this.addMessageToUserChat(data.message);
                }
            } else if (currentUser.role === 'listener') {
                if (data.message.senderId !== currentUser.id) {
                    this.addMessageToListenerChat(data.message);
                }
            }
        }
    },

    // Добавить сообщение в чат пользователя
    addMessageToUserChat(message) {
        const container = document.getElementById('userMessagesContainer');
        if (!container) return;
        
        // Очищаем приветственное сообщение
        if (container.children.length === 1 && container.children[0].textContent.includes('Чат начат')) {
            container.innerHTML = '';
        }
        
        const messageDiv = document.createElement('div');
        const isCurrentUser = message.senderId === currentUser.id;
        messageDiv.className = `message ${isCurrentUser ? 'user' : 'other'}`;
        messageDiv.innerHTML = `
            <div>${message.text}</div>
            <div class="message-time">${utils.formatTime(message.timestamp)}</div>
        `;
        container.appendChild(messageDiv);
        container.scrollTop = container.scrollHeight;
        
        this.updateMessageCount();
    },

    // Добавить сообщение в чат слушателя
    addMessageToListenerChat(message, scroll = true) {
        const container = document.getElementById('listenerMessagesContainer');
        if (!container) return;
        
        // Очищаем приветственное сообщение
        if (container.children.length === 1 && container.children[0].textContent.includes('Выберите чат')) {
            container.innerHTML = '';
        }
        
        const messageDiv = document.createElement('div');
        const isCurrentUser = message.senderId === currentUser.id;
        messageDiv.className = `message ${isCurrentUser ? 'user' : 'other'}`;
        messageDiv.innerHTML = `
            <div>${message.text}</div>
            <div class="message-time">${utils.formatTime(message.timestamp)}</div>
        `;
        container.appendChild(messageDiv);
        
        if (scroll) {
            container.scrollTop = container.scrollHeight;
        }
    },

    // Загрузить сообщения пользователя
    loadUserChatMessages() {
        const container = document.getElementById('userMessagesContainer');
        if (!container) return;
        
        container.innerHTML = '';
        
        if (!activeChat || !activeChat.messages || activeChat.messages.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; color: #7f8c8d; margin-top: 50px;">
                    <div>💬 Нет сообщений</div>
                    <div style="font-size: 14px; margin-top: 10px;">Начните общение с вашим слушателем</div>
                </div>
            `;
            return;
        }
        
        activeChat.messages.forEach(message => {
            this.addMessageToUserChat(message, false);
        });
        container.scrollTop = container.scrollHeight;
        
        this.updateMessageCount();
    },

    // Загрузить сообщения слушателя
    loadListenerChatMessages() {
        const container = document.getElementById('listenerMessagesContainer');
        if (!container) return;
        
        container.innerHTML = '';
        
        if (!activeChat || !activeChat.messages || activeChat.messages.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; color: #7f8c8d; margin-top: 50px;">
                    <div>💬 Нет сообщений</div>
                    <div style="font-size: 14px; margin-top: 10px;">Начните общение с пользователем</div>
                </div>
            `;
            return;
        }
        
        activeChat.messages.forEach(message => {
            this.addMessageToListenerChat(message, false);
        });
        container.scrollTop = container.scrollHeight;
    },

    // Обновить счетчик сообщений
    updateMessageCount() {
        if (activeChat && activeChat.messages) {
            const element = document.getElementById('messageCount');
            if (element) {
                element.textContent = activeChat.messages.length;
            }
        }
    },

    // Обновить звезды рейтинга
    updateRatingStars(rating) {
        document.querySelectorAll('.rating-star').forEach((star, index) => {
            star.classList.toggle('active', index < rating);
        });
    },

    // Отправить оценку
    submitRating() {
        if (selectedRating === 0) {
            utils.showNotification('❌ Выберите оценку!', 'error');
            return;
        }

        if (!currentListener) {
            utils.showNotification('❌ Нет активного чата!', 'error');
            return;
        }

        const reviewText = document.getElementById('reviewText')?.value.trim() || '';
        
        console.log('⭐ Отправка оценки:', { rating: selectedRating, listenerId: currentListener.id });
        
        socket.emit('submit_rating', {
            listenerId: currentListener.id,
            rating: selectedRating,
            comment: reviewText,
            userId: currentUser.id
        });

        utils.showNotification('✅ Оценка отправлена! Спасибо за обратную связь!', 'success');

        selectedRating = 0;
        this.updateRatingStars(0);
        const reviewTextElement = document.getElementById('reviewText');
        if (reviewTextElement) reviewTextElement.value = '';
        this.end();
    },

    // Завершить чат
    end() {
        console.log('🚪 Завершение чата');
        if (activeChat) {
            socket.emit('end_chat', { chatId: activeChat.id });
        }

        utils.hideElement('userChatSection');
        utils.showElement('listenersTab');
        clearInterval(chatTimer);
        activeChat = null;
        currentListener = null;
        chatStartTime = null;
    },

    // Запустить таймер чата
    startChatTimer() {
        clearInterval(chatTimer);
        chatTimer = setInterval(() => {
            if (!chatStartTime) return;
            const now = new Date();
            const diff = Math.floor((now - chatStartTime) / 1000);
            const minutes = Math.floor(diff / 60);
            const seconds = diff % 60;
            const durationElement = document.getElementById('chatDuration');
            if (durationElement) {
                durationElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            }
        }, 1000);
    },

    // Обновить список чатов слушателя
    updateListenerChatsList() {
        const container = document.getElementById('listenerChatsList');
        if (!container) return;
        
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
                <div class="chat-item" data-chat-id="${chat.id}" onclick="chat.selectListenerChat('${chat.id}')">
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
    },

    // Выбрать чат слушателя
    selectListenerChat(chatId) {
        activeChat = chats.find(chat => chat.id === chatId);
        if (!activeChat) return;
        
        document.querySelectorAll('.chat-item').forEach(item => {
            item.classList.remove('active');
        });
        const selectedItem = document.querySelector(`.chat-item[data-chat-id="${chatId}"]`);
        if (selectedItem) selectedItem.classList.add('active');
        
        this.loadListenerChatMessages();
    },

    // Обновить данные отзывов слушателя
    updateListenerReviewsData() {
        const listenerRatings = ratings.filter(r => r.listenerId === currentUser.id);
        this.updateListenerReviews(listenerRatings);
    },

    // Обновить отзывы слушателя
    updateListenerReviews(ratingsData) {
        const container = document.getElementById('listenerReviewsContainer');
        if (!container) return;
        
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
                        ${utils.formatDate(review.timestamp)}
                    </div>
                    ${review.comment ? `
                        <div class="review-text" style="margin-top: 10px; padding-top: 10px; border-top: 1px solid var(--border-color);">
                            ${review.comment}
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');
    },

    // Обновить статистику слушателя
    updateListenerStats() {
        const listenerChats = chats.filter(chat => chat.user2 === currentUser.id);
        const completedChats = listenerChats.filter(chat => !chat.isActive);
        const totalMessages = listenerChats.reduce((total, chat) => total + (chat.messages?.length || 0), 0);
        
        const totalChatsElement = document.getElementById('listenerTotalChats');
        const avgRatingElement = document.getElementById('listenerAvgRating');
        const responseTimeElement = document.getElementById('listenerResponseTime');
        
        if (totalChatsElement) totalChatsElement.textContent = completedChats.length;
        if (avgRatingElement) avgRatingElement.textContent = (currentUser.rating || 0).toFixed(1);
        if (responseTimeElement) responseTimeElement.textContent = '45с';
    }
};
