const mongoose = require("mongoose");

async function connectDB() {
  if (!process.env.MONGO_URI) throw new Error("MONGO_URI is missing in backend/.env");
  await mongoose.connect(process.env.MONGO_URI);
  console.log("MongoDB Connected Successfully");
}

module.exports = connectDB;
