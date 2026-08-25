const mongoose = require('mongoose');
require('dotenv').config({path: '.env.local'});
mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const Note = mongoose.model('Note', new mongoose.Schema({}, { strict: false }));
  const note = await Note.findOne().sort({createdAt: -1});
  const index = note.content.indexOf('No-Cloning');
  if (index !== -1) {
      console.log(note.content.substring(index, index + 500));
  } else {
      console.log("No-Cloning not found");
  }
  mongoose.connection.close();
});
