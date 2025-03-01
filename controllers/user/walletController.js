const User = require('../../models/userSchema');
const Product = require('../../models/productSchema');
const Wallet = require('../../models/walletSchema');

module.exports = {
    getWalletPage: async (req, res) => {
        try {
            const userId = req.session.user?._id; // Ensure this is the correct field name
            console.log("User ID:", userId);

            if (!userId) {
                return res.status(400).send("User ID is required");
            }

            // Find the user's wallet
            const wallet = await Wallet.findOne({ user: userId });

            let balance = 0;

            // If wallet exists, assign the balance
            if (wallet) {
                balance = wallet.balance;
            }

            console.log("Wallet Balance:", balance);

            // Render the wallet page with the balance
            res.render("user/wallet", { balance });
        } catch (error) {
            console.error("Error fetching wallet data:", error);
            res.status(500).send("Internal Server Error");
        }
    }
};