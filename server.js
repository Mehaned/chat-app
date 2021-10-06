if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config()
  }

const socketio = require('socket.io');
const {formatMessage, generateLocationMessage} = require('../login-regs/utils/messages');
const {checkAuthenticated,
  checkNotAuthenticated} = require('../login-regs/utils/checkauthenticated');
const {
userJoin,
getCurrentUser,
userLeave,
getRoomUsers
} = require('../login-regs/utils/users');

const express = require('express');
const app = express();
const path = require('path');
const http = require('http');

// require middlewares
const bodyParser = require('body-Parser');
const logger = require('morgan');

// MongoDB Driver
const mongoose = require('mongoose');

const DB_URL = "mongodb://localhost:27017/chat-app";

// Connect to MongoDB
mongoose.connect(DB_URL);

// Connection Events
mongoose.connection.once('connected', () => {
  console.log('Datebase connected to ' + DB_URL);
})
mongoose.connection.on('error' , (err) => {
  console.log('MongoDB connection error ' + err);
})
mongoose.connection.once('disconnected' , () => {
  console.log('Datebase disconnected');
})

//if Node´s process ends , close the MongoDB connection
process.on('SIGINT' , () => {
  mongoose.connection.close(()=> {
      console.log('Datebase disconnected through app termination');
      process.exit(0)
  })
})



//Middlewares
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:true}));

const server = http.createServer(app);
const io = socketio(server);
const bcrypt = require('bcrypt');
const passport = require('passport');
const session = require('express-session');
const flash = require('express-flash');
const methodOverride = require('method-override')
const initializePassport = require('../login-regs/passport-config');
const MongoDBStore  = require('connect-mongodb-session')(session);
// const MongoStore = require('connect-mongo')(session);


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

//view engine setup ------------------------------------
app.set('view engine','ejs');
app.set(path.join(__dirname , 'views'));

app.use(express.urlencoded({extended:true}))
app.use(flash());
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave:false, // don't save session if unmodified
    saveUninitialized: false, // don't create sessions for not logged in users

    // cookies settings
    cookie: {
      secure: false,  
      httpOnly: false, // if true, will disallow JavaScript from reading cookie data
      // expires: new Date(Date.now() + 60 * 60 * 1000) // 1 hour;
    },

 
    // store:  MongoDBStore.create({
    //   mongoUrl: "mongodb://localhost:27017/chat-app"
    // }),
    // Where to store session data
    // store: new MongoDBStore  ({
    //   uri: 'mongodb://localhost:27017/chat-app',
    //   // uri:mongooseConnection,
    //   collection: 'mySessions',
    //   resave: true,
    //   saveUninitialized: true,
    // mongooseConnection: mongoose.connection,
      // ttl: 60 * 60 * 24 * 1  // 1 day
    // })



  
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
  
  const PORT = process.env.PORT || 3001;
  server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
// app.listen(4444)