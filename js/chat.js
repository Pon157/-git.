// Функции для работы с чатом
function setupChatEventListeners() {
    console.log('🔧 Настройка обработчиков чата...');
    
    // Обработчики Enter для сообщений
    const userMessageInput = document.getElementById('userMessageInput');
    const listenerMessageInput = document.getElementById('listenerMessageInput');
    
    if (userMessageInput) {
        userMessageInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                sendUserMessage();
            }
        });
    }

    if (listenerMessageInput) {
        listenerMessageInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                sendListenerMessage();
            }
        });
    }

    // Обработчики рейтинга
    document.querySelectorAll('.rating-star').forEach(star => {
        star.addEventListener('click', function() {
            selectedRating = parseInt(this.getAttribute('data-rating'));
            updateRatingStars(selectedRating);
        });
    });

    console.log('✅ Обработчики чата настроены');
}

function sendUserMessage() {
    if (!activeChat) {
        showNotification('❌ Сначала выберите слушателя!', 'error');
        return;
    }
    
    const input = document.getElementById('userMessageInput');
    const text = input.value.trim();
    
    if (!text) {
        showNotification('❌ Введите сообщение!', 'error');
        return;
    }

    const message = {
        text: text,
        senderId: currentUser.id,
        timestamp: new Date(),
        id: Date.now().toString() // Временный ID
    };

    console.log('📤 Отправка сообщения:', message);
    
    // Добавляем сообщение сразу в интерфейс отправителя
    addMessageToUserChat(message);
    
    if (socket && socket.connected) {
        socket.emit('send_message', {
            chatId: activeChat.id,
            message: message
        });
    }

    input.value = '';
}

function sendListenerMessage() {
    if (!activeChat) {
        showNotification('❌ Выберите чат для общения!', 'error');
        return;
    }
    
    const input = document.getElementById('listenerMessageInput');
    const text = input.value.trim();
    
    if (!text) {
        showNotification('❌ Введите сообщение!', 'error');
        return;
    }

    const message = {
        text: text,
        senderId: currentUser.id,
        timestamp: new Date(),
        id: Date.now().toString() // Временный ID
    };

    console.log('📤 Отправка сообщения от слушателя:', message);
    
    // Добавляем сообщение сразу в интерфейс отправителя
    addMessageToListenerChat(message);
    
    if (socket && socket.connected) {
        socket.emit('send_message', {
            chatId: activeChat.id,
            message: message
        });
    }

    input.value = '';
}

function handleNewMessage(data) {
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
        updateMessageCount();
        
        // Отображаем сообщение у обоих участников чата
        if (currentUser.role === 'user') {
            // Если сообщение не от текущего пользователя, добавляем его
            if (data.message.senderId !== currentUser.id) {
                addMessageToUserChat(data.message);
            }
        } else if (currentUser.role === 'listener') {
            // Если сообщение не от текущего слушателя, добавляем его
            if (data.message.senderId !== currentUser.id) {
                addMessageToListenerChat(data.message);
            }
        }
    }
}

function addMessageToUserChat(message) {
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
        <div class="message-time">${new Date(message.timestamp).toLocaleTimeString()}</div>
    `;
    container.appendChild(messageDiv);
    container.scrollTop = container.scrollHeight;
    
    // Обновляем счетчик сообщений
    updateMessageCount();
}

function addMessageToListenerChat(message, scroll = true) {
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
        <div class="message-time">${new Date(message.timestamp).toLocaleTimeString()}</div>
    `;
    container.appendChild(messageDiv);
    
    if (scroll) {
        container.scrollTop = container.scrollHeight;
    }
}

function loadUserChatMessages() {
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
        addMessageToUserChat(message, false);
    });
    container.scrollTop = container.scrollHeight;
    
    updateMessageCount();
}

function loadListenerChatMessages() {
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
        addMessageToListenerChat(message, false);
    });
    container.scrollTop = container.scrollHeight;
}

function submitRating() {
    if (selectedRating === 0) {
        showNotification('❌ Выберите оценку!', 'error');
        return;
    }

    if (!currentListener) {
        showNotification('❌ Нет активного чата!', 'error');
        return;
    }

    const reviewText = document.getElementById('reviewText').value.trim();
    
    console.log('⭐ Отправка оценки:', { rating: selectedRating, listenerId: currentListener.id });
    
    if (socket && socket.connected) {
        socket.emit('submit_rating', {
            listenerId: currentListener.id,
            rating: selectedRating,
            comment: reviewText,
            userId: currentUser.id
        });
    }

    showNotification('✅ Оценка отправлена! Спасибо за обратную связь!', 'success');

    selectedRating = 0;
    updateRatingStars(0);
    document.getElementById('reviewText').value = '';
    endChat();
}

function endChat() {
    console.log('🚪 Завершение чата');
    if (activeChat && socket && socket.connected) {
        socket.emit('end_chat', { chatId: activeChat.id });
    }

    document.getElementById('userChatSection').classList.add('hidden');
    document.getElementById('listenersTab').classList.remove('hidden');
    clearInterval(chatTimer);
    activeChat = null;
    currentListener = null;
    chatStartTime = null;
}
