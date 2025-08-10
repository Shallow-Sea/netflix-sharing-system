const mongoose = require('mongoose');
const config = require('../mongodb');

// 设置 strictQuery 以消除警告
mongoose.set('strictQuery', false);

// MongoDB连接URI
const mongoURI = process.env.MONGO_URI || config.mongoURI;

// 数据库连接方法
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log(`MongoDB连接成功: ${conn.connection.host}`);
    return conn;
  } catch (err) {
    console.error(`MongoDB连接失败: ${err.message}`);
    process.exit(1);
  }
};

module.exports = connectDB; 