const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");
const Coupon = require("../../models/couponSchema");

module.exports = {
  getCouponPage: async (req, res) => {
    try {
      const currentDate = new Date();
      const page = parseInt(req.query.page) || 1; // Get page number from query, default to 1
      const limit = 10; // Number of coupons per page
      const skip = (page - 1) * limit; // Calculate how many to skip

      const totalCoupons = await Coupon.countDocuments(); // Count total coupons
      const coupons = await Coupon.find({}).skip(skip).limit(limit).lean(); // Fetch paginated coupons as plain objects

      // Add validity status and format expiry date for each coupon
      coupons.forEach((coupon) => {
        coupon.isValid = coupon.expiryDate > currentDate;
        coupon.formattedExpiry = coupon.expiryDate.toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });
      });

      res.render("user/coupon", {
        coupons,
        currentPage: page,
        totalPages: Math.ceil(totalCoupons / limit), // Calculate total pages
      });
    } catch (error) {
      console.error(error);
      res.status(500).send("Internal Server Error");
    }
  },

  applycoupon: async (req, res) => {
    const userId = req.session.user?._id;
    const { couponCode, totalAmount } = req.body;

    try {
        if (!userId) {
            return res.status(401).json({ message: "User not logged in." });
        }

        // Find the user
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }

        // Check if the coupon is already used
        if (user.appliedCoupons.includes(couponCode)) {
            return res.status(400).json({ message: "Coupon has already been used." });
        }

        // Find the coupon in the database
        const coupon = await Coupon.findOne({ couponCode });
        if (!coupon) {
            return res.status(400).json({ message: "Invalid coupon code." });
        }

        // Check if the coupon has expired
        if (coupon.expiryDate < new Date()) {
            return res.status(400).json({ message: "This coupon has expired." });
        }

        // Check if the total amount meets the minimum purchase requirement
        if (totalAmount < coupon.minPurchaseAmount) {
            return res.status(400).json({ message: `Minimum purchase amount of ₹${coupon.minPurchaseAmount} required.` });
        }

        // Calculate the discounted total amount
        const discountedTotal = totalAmount - coupon.discountAmount;

        // Store the coupon details in the session
        req.session.coupon = {
            couponCode: coupon.couponCode,
            discountAmount: coupon.discountAmount,
            discountedTotal: discountedTotal
        };

        res.json({
            discountedTotal,
            discountAmount: coupon.discountAmount
        });
    } catch (error) {
        console.error("Error applying coupon:", error);
        res.status(500).json({ message: "Failed to apply coupon." });
    }
},

};
