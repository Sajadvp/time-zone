const express = require("express");
const router = express.Router();
const passport = require("passport");
const Auth = require("../middlewares/auth");
const env = require("dotenv").config();

// Import Controllers
const userController = require("../controllers/user/userController");
const profileController = require("../controllers/user/profileController");
const cartController = require("../controllers/user/cartController");
const orderController = require("../controllers/user/orderController");
const addressController = require("../controllers/user/addressController");
const wishlistController = require("../controllers/user/wishlistController");
const checkOutController = require("../controllers/user/checkOutController");
const couponController = require("../controllers/user/couponController");
const helpCenterController = require("../controllers/user/helpCenterController");
const walletController = require("../controllers/user/walletController");
const googleAuthController = require("../controllers/user/googleAuthController");

// Google Authentication Routes
router.get("/auth/google", googleAuthController.googleAuth);
router.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/signup" }),
  googleAuthController.googleAuthCallback
);

// Public Routes
router.get("/", userController.loadHomePage);
router.get("/signup", userController.loadSignup);
router.post("/signup", userController.signup);
router.get("/login", userController.loadLogin);
router.post("/login", userController.login);

// OTP Routes
router.get("/verifyOtp", userController.renderOtpPage);
router.post("/verifyOtp", userController.verifyOtp);
router.post("/resendOtp", userController.resendOtp);

// User Logout
router.get("/logout", Auth.userAuth, userController.logout);

// Shop and Product Routes
router.get("/shopPage", userController.loadShopPage);
router.get("/productDetails/:id", userController.productDetails);

// User Profile Routes - Protected by Auth
router.get("/userProfile", Auth.userAuth, profileController.getUserProfile);
router.post("/updateProfile", Auth.userAuth, profileController.updateProfile);

// Address Routes - Protected by Auth
router.post("/newAddress", Auth.userAuth, addressController.addAddress);
router.get("/delete-address", Auth.userAuth, addressController.deleteAddress);
router.get("/edit-address/:id", Auth.userAuth, addressController.getEditAddress);
router.post("/updateAddress/:id", Auth.userAuth, addressController.updateAddress);

// Cart Routes - Protected by Auth
router.get("/cart", Auth.userAuth, cartController.cartRender);
router.post("/add-to-cart", Auth.userAuth, cartController.addToCart);
router.post("/updateCartQuantity/:productId", Auth.userAuth, cartController.updateCart);
router.post("/removeFromCart", Auth.userAuth, cartController.removeCart);
router.delete("/clearCart", Auth.userAuth, cartController.clearCart);

// Checkout Routes - Protected by Auth
router.get("/checkout", Auth.userAuth, checkOutController.getCheckout);
router.post("/checkout", Auth.userAuth, checkOutController.checkout);

// Order Routes - Protected by Auth
router.post("/create-order", async (req, res) => {
  try {
    const options = {
      amount: req.body.amount * 100, // Amount in paise (INR 1 = 100 paise)
      currency: "INR",
      receipt: "order_rcptid_11",
    };

    const order = await razorpay.orders.create(options);
    res.json(order);
  } catch (error) {
    console.error("Error creating order:", error);
    res.status(500).json({ success: false, message: "Failed to create order" });
  }
});

router.post("/verify-payment", async (req, res) => {
  const crypto = require("crypto");
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  const generatedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(razorpay_order_id + "|" + razorpay_payment_id)
    .digest("hex");

  if (generatedSignature === razorpay_signature) {
    res.json({ success: true, message: "Payment verified successfully!" });
  } else {
    res.status(400).json({ success: false, message: "Invalid signature!" });
  }
});

router.get("/orders", Auth.userAuth, orderController.getOrderPage);
router.post("/placeOrder", Auth.userAuth, orderController.placeOrder);
router.post("/paymentSuccess", Auth.userAuth, orderController.handlePaymentSucccess);
router.get("/orderDetails/:orderId", Auth.userAuth, orderController.getOrderDetailsPage);
router.post("/cancelProduct/:orderId/:itemId", Auth.userAuth, orderController.cancelProduct);
router.post("/returnProduct", Auth.userAuth, orderController.returnProduct);

// Forgot Password Routes
router.get("/forgot-password", profileController.forgotPasswordPage);
router.post("/forgot-password", profileController.forgotPasswordRequest);
router.get("/forgot-verify", profileController.forgetPassowordVerifyPage);
router.post("/forgot-verify", profileController.forgetPassowrdVerify);

// Wishlist Routes - Protected by Auth
router.get("/wishlist", Auth.userAuth, wishlistController.getWishListPage);
router.post("/wishlist/toggle", Auth.userAuth, wishlistController.toggleWishlist);
router.post("/add-to-wishlist", Auth.userAuth, wishlistController.addToWishlist);
router.post("/remove-from-wishlist", Auth.userAuth, wishlistController.removeFromWishlist);
router.post("/addToWishlist", Auth.userAuth, wishlistController.profileWishlist);


// Coupon Routes - Protected by Auth
router.get("/coupon", Auth.userAuth, couponController.getCouponPage);
router.post("/apply-coupon", Auth.userAuth, couponController.applycoupon);

// Wallet Routes - Protected by Auth
router.get("/wallet", Auth.userAuth, walletController.getWalletPage);

// Help Center Routes
router.get("/HelpCenter", helpCenterController.getHelpCenter);

// Error Handling or Misc Routes
router.get("/pageNoteFound", userController.pageNoteFound);
router.get("/generateInvoice/:id",orderController.generateInvoice)

// Export Router
module.exports = router;