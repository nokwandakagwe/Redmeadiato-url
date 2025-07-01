const mongoose = require('mongoose');
mongoose.set('strictQuery', false);
const config = require('../../config');

const connectDB = async () => {
  try {
    mongoose.connect(config.mongoUri)
  .then(() => console.log('Database Connected ✅'))
  .catch(err => console.error('DB connection error:', err));
    
    const db = mongoose.connection;
    
    db.on('error', (error) => {
      console.error('DB connection error:', error);
    });
    
    db.once('open', () => {
      console.log('DB Connection Established');
    });
    
  } catch (err) {
    console.error('Failed to connect to DB', err);
    process.exit(1); 
  }
};

module.exports = connectDB; 
