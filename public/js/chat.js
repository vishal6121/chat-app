// const socket = io();

// Elements
const $messageForm = document.querySelector('#message-form');
const $messageFormInput = document.querySelector('input');
const $messageFormButton = document.querySelector('button');
const $locationButton = document.querySelector('#send-location');
const $messages = document.querySelector('#messages');
const $callBtn = document.querySelector('#call');
const $acceptBtn = document.querySelector('#accept');

var isInitiator = false;

// Templates
const messageTemplate = document.querySelector('#message-template').innerHTML;
const locationMessageTemplate = document.querySelector('#location-message-template').innerHTML;
const sidebarTemplate = document.querySelector('#sidebar-template').innerHTML;

// Options
const { username, room } = Qs.parse(location.search, { ignoreQueryPrefix: true } );

const autoScroll = () => {
    // New message element
    const $newMessage = $messages.lastElementChild;

    // height of the new message
    const newMessageStyles = getComputedStyle($newMessage);
    const newMessageMargin = parseInt(newMessageStyles.marginBottom);
    const newMessageHeight = $newMessage.offsetHeight + newMessageMargin;

    // Visible height
    const visibleHeight = $messages.offsetHeight;

    // Height of message container
    const containerHeight = $messages.scrollHeight;

    // How far have i scrolled
    const scrollOffset = $messages.scrollTop + visibleHeight;

    if (containerHeight - newMessageHeight <= scrollOffset) {
        $messages.scrollTop = $messages.scrollHeight;
    }
}

socket.on('message', (message, username = '') => {
    const html = Mustache.render(messageTemplate, {
        message: message.text,
        username,
        createdAt: moment(message.createdAt).format('h:mm a')
    });
    $messages.insertAdjacentHTML("beforeend", html);
    autoScroll();
});

socket.on('locationMessage', (message, username = '') => {

    const html = Mustache.render(locationMessageTemplate, {
        url: message.url,
        username,
        createdAt: moment(message.createdAt).format('h:mm a')
    });
    $messages.insertAdjacentHTML("beforeend", html);
    autoScroll();
});

socket.on('roomData', ({ room, users }) => {
    const html = Mustache.render(sidebarTemplate, {
        room,
        users
    });
    document.querySelector('#sidebar').innerHTML = html;
});

$messageForm.addEventListener('submit', (e) => {
    e.preventDefault();

    $messageFormButton.setAttribute('disabled', 'disabled');
    // disable
    const message = e.target.elements.message;
    socket.emit('sendMessage', message.value, (error) => {
        $messageFormButton.removeAttribute('disabled');
        $messageFormInput.value = '';
        $messageFormInput.focus();

        // enable
        if (error) {
            return console.log(error);
        }
        console.log('The message was delivered:');
    });

});

$locationButton.addEventListener('click', (e) => {

    if (!navigator.geolocation) {
        return alert('Geolocation is not supported by your browser');
    }
    $locationButton.setAttribute('disabled', 'disabled');

    navigator.geolocation.getCurrentPosition((position) => {
        // console.log(position.coords);
        socket.emit('sendLocation', {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
        }, () => {
            $locationButton.removeAttribute('disabled');
            console.log('Location Shared!!');
        });
    });

});

socket.emit('join', { username, room }, (error) => {
    if (error) {
        alert(error);
        location.href = '/';
    }
});


$callBtn.addEventListener('click', (e) => {
    console.log('calling');
    isInitiator = true;
    let vid_room = Math.floor(100000 + Math.random() * 900000);
    socket.emit('vid_join', {
        "room": vid_room
    });


});

socket.on('accept_join', (data) => {

    if (!isInitiator) {
        console.log('accepting');
        if (!rtcPeerConn) {
            if (confirm(data.name + " is calling, do you want to connect?")) {
                startSignaling(data.room);
            }
        }
    }

});