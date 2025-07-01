const mongoose = require("mongoose");

const fileSchema = new mongoose.Schema({
  name: { type: String, required: true },
  path: { type: String, required: true },
  url: { type: String, required: true },
  size: { type: String, required: true },
  mimetype: { type: String, required: true },
  storageClass: { type: String, default: 'Standard' },
  modified: { type: String, required: true },
  deleteKey: { 
    type: String,
    default: null
  }
}, {
  timestamps: true 
});

module.exports = mongoose.model('File', fileSchema);
