const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB || "aplusmotors";

const connectMongo = async () => {
  try {
    const conn = await mongoose.connect(MONGODB_URI, {
      dbName: MONGODB_DB,
    });
    console.log(
      `MongoDB is Connected: ${conn.connection.host} / ${conn.connection.name}`
    );
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectMongo;