const path = require('path');
const http = require('http');
const express = require('express');
const socketio = require('socket.io');
const Filter = require('bad-words');
const RTCMultiConnectionServer = require('rtcmulticonnection-server');
const { generateMessage, generateLocationMessage } = require('./utils/messages');
const { addUser, removeUser, getUser, getUsersInRoom} = require('./utils/users'); 

const app = express();
const server = http.createServer(app);
const io = socketio(server);

const port = process.env.PORT || 3000;
const publicDirectoryPath = path.join(__dirname, '../public');


// Setup static directory to serve
app.use(express.static(publicDirectoryPath));

io.on('connection', (socket) => {

    console.log('New WS connection');
    
    socket.on('join', (options, callback) => {

        const { error, user } = addUser({id: socket.id, ...options});

        if (error) {
            return callback(error);
        }

        socket.join(user.room);

        socket.emit('message', generateMessage('Welcome!'), 'Admin');
        socket.broadcast.to(user.room).emit(
            'message',
            generateMessage(user.username + ' has joined'),
            'Admin'
        );

        io.to(user.room).emit('roomData', {
            room: user.room,
            users: getUsersInRoom(user.room)
        });
        callback();
    });

    socket.on('sendMessage', (msg, callback) => {
        const filter = new Filter();
        const user = getUser(socket.id);
        if (filter.isProfane(msg)) {
            return callback('Profanity is not allowed!');
        }
        io.to(user.room).emit('message', generateMessage(msg), user.username);
        callback();
    });

    socket.on('disconnect', () => {
        const user = removeUser(socket.id);
        
        if (user) {
            io.to(user.room).emit(
                'message',
                generateMessage(user.username + ' has left'),
                'Admin'
            );
            io.to(user.room).emit('roomData', {
                room: user.room,
                users: getUsersInRoom(user.room)
            })
        }
    });

    socket.on('sendLocation', (coords, callback) => {
        const user = getUser(socket.id);
        io.to(user.room).emit('locationMessage',
            generateLocationMessage(
                'https://google.com/maps?q=' + coords.latitude + ',' + coords.longitude,
                user.username
            )
        );
        callback();
    });

    socket.on('signal', (data) => {

        socket.join(data.room);
        io.to(data.room).emit('signal', {
            signal_type: data.signal_type,
            command: data.command,
            user_data: data.user_data,
            room: data.room
        });
        
    });

    socket.on('vid_join', (data) => {
        socket.join(data.room);
        socket.broadcast.emit('accept_join', data);
    });



});

server.listen(port, () => {
    console.log('Server is up on port ' + port + '.');
});