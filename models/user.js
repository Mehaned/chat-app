const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const Schema = mongoose.Schema;

// user Schema 
const userSchema = new Schema({
    username: {type: String , default: "" , lowercase: true}, 
    email:    {type: String , default: "" , lowercase: true, unique: true}, 
    password: {type: String , default: "" }
})

module.exports = mongoose.model('User', userSchema)