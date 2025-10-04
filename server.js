const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

let messages = [];

io.on('connection', (socket) => {
  console.log('✅ User connected');
  socket.emit('message_history', messages);
  
  socket.on('send_message', (data) => {
    const message = {
      id: Date.now(),
      username: data.username,
      text: data.text,
      timestamp: new Date().toISOString()
    };
    messages.push(message);
    io.emit('new_message', message);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log('🚀 Server started on port', PORT);
});
