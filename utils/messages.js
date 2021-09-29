const moment = require('moment');

function formatMessage(username, text) {
  return {
    username,
    text,
    time: moment().format('h:mm a')
  };
}

function generateLocationMessage (username, url) {
  return {
      username,
      url,
      time: moment().format('h:mm a')
  }
}

module.exports = {
  formatMessage,
  generateLocationMessage
} 
 