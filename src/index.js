const express = require('express');
const path = require('path');
const http = require('http');
const socketio = require('socket.io');
const Filter = require('bad-words');
const { generateMessage, generateLocationMessage } = require('./utils/messages');
const { addUser, removeUser, getUser, getUsersInRoom } = require('./utils/users');

const app = express();
const server = http.createServer(app);
const io = socketio(server);

// define paths for express config
const publicPath = path.join(__dirname, '../public');

// setup static directory to serve (css, jpg, png)
app.use(express.static(publicPath));

const port = process.env.PORT;

io.on('connection', (socket) => {
    console.log('New WebSocket connection');

    socket.on('join', (options, callback) => {

        const {error, user} = addUser({ id: socket.id, ...options })

        if (error) {
            return callback(error)
        }

        socket.join(user.room)

        // send welcome message to every client
        socket.emit('message', generateMessage('Admin', `Welcome ${user.username}!`));
        socket.broadcast.to(user.room).emit('message', generateMessage('Admin', `${user.username} has joined ${user.room}!`)) // send to every client except own client
        io.to(user.room).emit('roomData', {
            room: user.room,
            users: getUsersInRoom(user.room),
        })

        callback()

        // socket.emit, io.emit, socket.broadcast.emit -> send to all
        // io.to.emit, socket.broadcast.ro.emit -> send to room only
    })

    // send message to every client when someone sends a message
    socket.on('sendMessage', (message, callback) => {
        const user = getUser(socket.id);
        const filter = new Filter();

        if (filter.isProfane(message)) {
            return callback('Profanity is not allowed!')
        }

        io.to(user.room).emit('message', generateMessage(user.username, message)) // send to every client in room
        callback()
    })

    // send message to every client when someone shares his location
    socket.on('sendLocation', (coords, callback) => {
        const user = getUser(socket.id);
        io.to(user.room).emit('locationMessage', generateLocationMessage(user.username, `https://google.com/maps?q=${coords.lat},${coords.lon}`)) // send to every client in room
        callback();
    })

    // send message to every client when someone exits the chat
    socket.on('disconnect', () => {
        const user = removeUser(socket.id)

        if (user) {
            io.to(user.room).emit('message', generateMessage('Admin', `${user.username} has left!`)) // send to every client in room
            io.to(user.room).emit('roomData', {
                room: user.room,
                users: getUsersInRoom(user.room),
            })
        }     
    })
})

server.listen(port, () => {
    console.log(`Server is started on port ${port}`);
});