const chatForm = document.getElementById('chat-form');
const chatMessages = document.querySelector('.chat-messages');
const roomName = document.getElementById('room-name');
const userList = document.getElementById('users');
// const moment = require('./utils/messages');


// Get username and room from URL
const { username, room } = Qs.parse(location.search, {
  ignoreQueryPrefix: true,
});

const socket = io();

// Join chatroom
socket.emit('joinRoom', { username, room });

// Get room and users
socket.on('roomUsers', ({ room, users }) => {
  outputRoomName(room);
  outputUsers(users);
});

// Message from server
socket.on('message', (message) => {
  console.log(message);
  outputMessage(message);

  // Scroll down
  chatMessages.scrollTop = chatMessages.scrollHeight;
});

socket.on('locationMessage', (message) => {
  console.log(message);
  locationMessage(message);

  chatMessages.scrollTop = chatMessages.scrollHeight;

})

// Message submit
chatForm.addEventListener('submit', (e) => {
  e.preventDefault();

  // Get message text
  let msg = e.target.elements.msg.value;

  msg = msg.trim();

  if (!msg) {
    return false;
  }

  // Emit message to server
  socket.emit('chatMessage', msg);

  // Clear input
  e.target.elements.msg.value = '';
  e.target.elements.msg.focus();
});



//Output message to Dom
function outputMessage(message) {
  const div = document.createElement('div');
  div.classList.add('message');
  div.innerHTML =`<p class="meta">  <span>${message.username}</span>   <em> ${message.time}<em></p>
  <p class="text">
  ${message.text} </p>
  ` 

  document.querySelector('.chat-messages').appendChild(div)
}

//output locationMessage to Dom
function locationMessage(message) {
  const div = document.createElement('div');
  const a = document.createElement('a');
  div.classList.add('message');
  div.appendChild(a); 
  a.innerHTML =`<p class="meta">  <span>${message.username}</span>   <em> ${message.time}<em></p>
  <p class="text">
   <a  href='${message.url}' target='_blank'><i class="fas fa-map-marker-alt"></i> 
  My Location  <i class="fas fa-map-marker-alt"></i></a>  </p>
  `
  document.querySelector('.chat-messages').appendChild(div)
}



document.querySelector('#location').addEventListener('click', () => {
  if (!navigator.geolocation) {
      return alert('Geolocation is not supported by your browser.')
  }

  document.querySelector('#location').setAttribute('disabled', 'disabled')

  navigator.geolocation.getCurrentPosition((position) => {
      socket.emit('sendLocation', {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
      }, () => {
        document.querySelector('#location').removeAttribute('disabled')
          console.log('Location shared!')  
      })
  })
})


// Add room name to DOM
function outputRoomName(room) {
  roomName.innerText = room;
}

// Add users to DOM
function outputUsers(users) {
  userList.innerHTML = '';
  users.forEach((user) => {
    const li = document.createElement('li');
    li.innerText = user.username;
    userList.appendChild(li);
  });
}

//Prompt the user before leave chat room
document.getElementById('leave-btn').addEventListener('click', () => {
  const leaveRoom = confirm('Are you sure you want to leave the chatroom?');
  if (leaveRoom) {
    window.location = '/room';
  } else {
  }
});
