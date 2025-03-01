const mongoose = require("mongoose");

const walletSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User", // Corrected reference
    required: true,
    unique: true,
  },
  balance: {
    type: Number,
    default: 0,
  },
  transactions: [
    {
      transaction_id: {
        type: String,
        required: true, // Ensure every transaction has an ID
      },
      amount: {
        type: Number,
        required: true,
      },
      type: {
        type: String,
        enum: ["credit", "debit"],
        required: true,
      },
      description: {
        type: String,
        required: true,
      },
      createdAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],
});

// Index for `transaction_id` to ensure uniqueness
walletSchema.index({ "transactions.transaction_id": 1 }, { unique: true });

const Wallet = mongoose.model("Wallet", walletSchema);

module.exports = Wallet;
