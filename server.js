if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config()
  }

const path = require('path');
const http = require('http');
const socketio = require('socket.io');
const {formatMessage, generateLocationMessage} = require('./utils/messages');
const {checkAuthenticated,
  checkNotAuthenticated} = require('./utils/checkauthenticated');
const {
userJoin,
getCurrentUser,
userLeave,
getRoomUsers
} = require('./utils/users');

const express = require('express');
const app = express();
const server = http.createServer(app);
const io = socketio(server);
const bcrypt = require('bcrypt');
const passport = require('passport');
const flash = require('express-flash');
const session = require('express-session');
const methodOverride = require('method-override')
const initializePassport = require('./passport-config');

const users = []
const { use } = require('passport');
initializePassport(passport ,
     email => users.find(user => user.email === email),
     id => users.find(user => user.id === id));


const ADMIN = 'Safarii Chat ';

// Set static folder
app.use(express.static(path.join(__dirname, 'public')));

app.use(express.static("public"))
app.use("/css", express.static(__dirname+"public/css"))
app.use("/img", express.static(__dirname+"public/img"))
app.set('view-engine', 'ejs');
app.use(express.urlencoded({extended:false}))
app.use(flash());
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave:false,
    saveUninitialized: false,
}))

app.use(passport.initialize());
app.use(passport.session());
app.use(methodOverride('_method'));


app.get('/',  (req, res) => {
    res.render('home.ejs')
  })

app.get('/home',  (req, res) => {
    res.render('home.ejs')
  })

app.get('/login', (req, res) =>{
    res.render('login.ejs')
})

app.get('/room',checkAuthenticated, (req, res) =>{
    res.render('room.ejs', {name: req.user.name})
})

app.get('/chat', (req, res) =>{
    res.render('chat.ejs')
})

app.get('/safari', (req, res) =>{
  res.render('safari.ejs')
})


app.post('/login', passport.authenticate('local', {
    successRedirect :'/room',
    failureRedirect :'/login',
    failureFlash : true,

}))


app.get('/register', (req, res) =>{
    res.render('register.ejs')
})

app.post('/register', async(req, res) =>{
    try {
        const hashedPassword = await bcrypt.hash(req.body.password, 10 )
        users.push({
            id: Date.now().toString(),
            name: req.body.name,
            email: req.body.email,
            password: hashedPassword
        })
        res.redirect('/login')
    } catch {
        res.redirect('/login')
    }
    console.log(users);
})


// logout
app.delete('/logout', (req, res) => {
    req.logOut()
    res.redirect('/home')
  })


// Run when client connects
io.on('connection', socket => {
    socket.on('joinRoom', ({ username, room }) => {
      const user = userJoin(socket.id, username, room);
  
      socket.join(user.room);
  
      // Aktuellen Benutzer willkommen
      socket.emit('message' , formatMessage(ADMIN ,' Willkommen bei Safari Chat!!'));
  
      // wenn ein Benutzer eine Verbindung herstellt
      socket.broadcast
        .to(user.room)
        .emit('message', formatMessage(ADMIN ,  `${user.username} hat sich eingeloggt !!`));
  
      // Send users and room info
      io.to(user.room).emit('roomUsers', {
        room: user.room,
        users: getRoomUsers(user.room)
      });
    });
  
    // Listen for chatMessage
    socket.on('chatMessage', msg => {
      const user = getCurrentUser(socket.id);
  
      io.to(user.room).emit('message', formatMessage(user.username, msg));
    });
  
    socket.on('sendLocation', (coords, callback) => {
      const user = getCurrentUser(socket.id)
      io.to(user.room).emit('locationMessage', generateLocationMessage(user.username,`https://google.com/maps?q=${coords.latitude},${coords.longitude}`))
/*       io.to(user.room).emit('locationMessage', generateLocationMessage(user.username,`https://google.com/maps?q=${coords.latitude},${coords.longitude}`))
 */      callback()
    })

    
    //wenn die Clientverbindung trennt
    socket.on('disconnect', () => {
      const user = userLeave(socket.id);
  
      if (user) {
        io.to(user.room).emit(
          'message',
          formatMessage(ADMIN , `${user.username} hat Chat verlassen !!`)
        );
  
        // Send users and room info
        io.to(user.room).emit('roomUsers', {
          room: user.room,
          users: getRoomUsers(user.room)
        });
      }
    });
  });
  
  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
// app.listen(4444)