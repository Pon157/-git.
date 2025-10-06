// Функции чата
function sendUserMessage() {
    const input = document.getElementById('userMessageInput');
    const text = input.value.trim();

    if (!text || !activeChat) {
        showNotification('Введите сообщение', 'error');
        return;
    }

    console.log('Отправка сообщения:', text);
    socket.emit('send_message', {
        chatId: activeChat.id,
        message: { text }
    });

    input.value = '';
}

function sendListenerMessage() {
    const input = document.getElementById('listenerMessageInput');
    const text = input.value.trim();

    if (!text || !activeChat) {
        showNotification('Введите сообщение', 'error');
        return;
    }

    console.log('Отправка сообщения слушателем:', text);
    socket.emit('send_message', {
        chatId: activeChat.id,
        message: { text }
    });

    input.value = '';
}

function endChat() {
    if (!activeChat) return;

    console.log('Завершение чата');
    
    if (currentUser.role === 'user') {
        // Показать модалку оценки
        showRatingModal();
    } else {
        // Для слушателя просто завершить чат
        activeChat.isActive = false;
        hideChatInterface();
    }
}

function showRatingModal() {
    document.getElementById('ratingModal').style.display = 'block';
}

function closeRatingModal() {
    document.getElementById('ratingModal').style.display = 'none';
    hideChatInterface();
}

function submitRating() {
    const rating = document.querySelector('input[name="rating"]:checked');
    const comment = document.getElementById('ratingComment').value.trim();

    if (!rating) {
        showNotification('Выберите оценку', 'error');
        return;
    }

    if (!activeChat || !currentUser) return;

    const listenerId = activeChat.user2 === currentUser.id ? activeChat.user1 : activeChat.user2;
    
    console.log('Отправка оценки:', rating.value);
    socket.emit('submit_rating', {
        listenerId: listenerId,
        userId: currentUser.id,
        rating: parseInt(rating.value),
        comment: comment
    });

    closeRatingModal();
    hideChatInterface();
}

function hideChatInterface() {
    if (currentUser.role === 'user') {
        document.getElementById('userChatSection').style.display = 'none';
        document.getElementById('listenersTab').style.display = 'block';
    } else if (currentUser.role === 'listener') {
        document.getElementById('listenerChatSection').style.display = 'none';
        document.getElementById('listenerChatsTab').style.display = 'block';
    }
    
    activeChat = null;
}

// Enter для отправки сообщений
document.addEventListener('DOMContentLoaded', function() {
    // Для пользователя
    const userInput = document.getElementById('userMessageInput');
    if (userInput) {
        userInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') sendUserMessage();
        });
    }

    // Для слушателя
    const listenerInput = document.getElementById('listenerMessageInput');
    if (listenerInput) {
        listenerInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') sendListenerMessage();
        });
    }
});
