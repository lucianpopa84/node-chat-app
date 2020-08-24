const socket = io();

// Elements
const $messageForm = document.querySelector('#msg-form');
const $messageFormInput = $messageForm.querySelector('input');
const $messageFormButton = $messageForm.querySelector('button');
const $sendLocationButton = document.querySelector('#send-location');
const $messages = document.querySelector('#messages');
const $sidebar = document.querySelector('#sidebar');

// Templates
const messageTemplate = document.querySelector('#message-template').innerHTML;
const locationMssageTemplate = document.querySelector('#location-message-template').innerHTML;
const sidebarTemplate = document.querySelector('#sidebar-template').innerHTML;

// Options
const { username, room } = Qs.parse(location.search, { ignoreQueryPrefix: true })

const autoscroll = () => {
    // get new message element
    const $newMessage = $messages.lastElementChild

    // get heigth of the new message
    const newMessageStyles = getComputedStyle($newMessage)
    const newMessageMargin = parseInt(newMessageStyles.marginBottom)
    const newMessageHeight = $newMessage.offsetHeight + newMessageMargin

    // visible height
    const visibleHeight = $messages.offsetHeight

    // height of messages container
    const containerHeight = $messages.scrollHeight

    // how far have i scrolled?
    const scrollOffset = $messages.scrollTop + visibleHeight

    if (containerHeight - newMessageHeight <= scrollOffset) {
        $messages.scrollTop = $messages.scrollHeight // scroll to the bottom
    }
}

// server (emit) -> client (receive) --acknowledgement -> server
// client (emit) -> server (receive) --acknowledgement -> client

socket.on('message', (message) => {
    const html = Mustache.render(messageTemplate, {
        username: message.username,
        message: message.text,
        createdAt: moment(message.createdAt).format('H:mm')
    })
    $messages.insertAdjacentHTML("beforeend", html); // insert html content at the end
    autoscroll()
})

socket.on('locationMessage', (locationMessage) => {
    const html = Mustache.render(locationMssageTemplate, {
        username: locationMessage.username,
        url: locationMessage.url,
        createdAt: moment(locationMessage.createdAt).format('H:mm')
    })
    $messages.insertAdjacentHTML("beforeend", html); // insert html content at the end
    autoscroll()
})

socket.on('roomData', ({ room, users }) => {
    const html = Mustache.render(sidebarTemplate, {
        room,
        users
    })

    $sidebar.innerHTML = html; 
})

$messageForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    $messageFormButton.disabled = true; // disable button while sending message
    
    const message = e.target.elements.message.value;

    socket.emit('sendMessage', message, (error) => {
        
        $messageFormButton.disabled = false; // re-enable button after message sent
        $messageFormInput.value = ''; // clear text input
        $messageFormInput.focus(); // set focus to text input

        if (error) {
            return console.log(error)
        }

        console.log(`The message "${message}" was delivered`)
    })
})

$sendLocationButton.addEventListener('click', () => {
    
    if (!navigator.geolocation) {
        return alert('Geolocation is not supported by your browser')
    }

    $sendLocationButton.disabled = true; // disable button while sending location

    navigator.geolocation.getCurrentPosition((position, error) => {
        $sendLocationButton.disabled = false; // re-enable button after location sent

        if (error) {
            return console.log(error);
        }

        socket.emit('sendLocation', {
            lat: position.coords.latitude,
            lon: position.coords.longitude
        }, () => {
            console.log('Location shared!')
        })
    })
})

socket.emit('join', { username, room }, (error) => {
    if (error) {
        alert(error)
        location.href = '/'
    }
})