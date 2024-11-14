const WebSocket = require('ws'); // Import the 'ws' package

const socket = new WebSocket('ws://127.0.0.1:8000/ws/poll/6/'); // Replace with the correct poll_id

socket.on('open', function() {
  console.log("Connection established");
});

socket.on('message', function(data) {
  const message = JSON.parse(data);
  console.log("Received message: ", message);
});

socket.on('close', function() {
  console.log("Connection closed");
});

