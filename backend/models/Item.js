const mongoose = require("mongoose");

const itemSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  type: { type: String, enum: ["lost", "found"], required: true },
  category: { type: String, default: "Other" },
  description: { type: String, required: true, trim: true },
  location: { type: String, required: true, trim: true },
  date: { type: String, required: true },
  imageUrl: { type: String, default: "" },
  founderContact: {
    fullName: { type: String, trim: true },
    phone: { type: String, trim: true },
    email: { type: String, lowercase: true, trim: true }
  },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  status: { type: String, enum: ["active", "claimed", "returned", "closed"], default: "active" }
}, { timestamps: true });

module.exports = mongoose.model("Item", itemSchema);
