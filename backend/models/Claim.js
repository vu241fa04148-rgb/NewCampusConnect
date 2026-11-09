const mongoose = require("mongoose");

const claimSchema = new mongoose.Schema({
  item: { type: mongoose.Schema.Types.ObjectId, ref: "Item", required: true },
  claimant: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  claimantContact: {
    fullName: { type: String, trim: true },
    phone: { type: String, trim: true },
    email: { type: String, lowercase: true, trim: true }
  },
  proofDescription: { type: String, required: true, trim: true },
  status: { type: String, enum: ["pending", "approved", "rejected", "successful"], default: "pending" },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  founderReturned: { type: Boolean, default: false },
  claimantReceived: { type: Boolean, default: false },
  founderConfirmedAt: { type: Date, default: null },
  claimantConfirmedAt: { type: Date, default: null },
  returnedAt: { type: Date, default: null }
}, { timestamps: true, optimisticConcurrency: true });

module.exports = mongoose.model("Claim", claimSchema);
