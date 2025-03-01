const User = require("../../models/userSchema");
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");
const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const Brand = require("../../models/brandSchema");
const Wishlist = require("../../models/wishlistSchma");
const Cart = require("../../models/cartSchema");
const mongoose = require('mongoose');

const pageNoteFound = async (req, res) => {
  try {
    res.render("page-404");
  } catch (error) {
    console.error("Error loading page 404:", error);
  }
};

const loadHomePage = async (req, res) => {
  try {
    const user = req.session?.user || null;

    const products = await Product.find({ status: "Active" })
      .populate({ path: "category", match: { isListed: true } })
      .populate({ path: "brand", match: { isActive: true } });

    const filteredProducts = products.filter((p) => p.category && p.brand);

    let userData = null;
    let cartCount = 0;
    let wishlistCount = 0; // Initialize wishlist count
    let wishlistedProducts = [];

    if (user) {
      userData = await User.findById(user._id);

      // Fetch wishlist for the user
      const wishlist = await Wishlist.findOne({ userId: user._id });

      if (wishlist) {
        wishlistedProducts = wishlist.products.map((item) => item.productId.toString());
        wishlistCount = wishlist.products.length; // Set wishlist count
      }

      // Fetch cart for the user
      const cartItems = await Cart.findOne({ userId: user._id }) || { products: [] };
      cartCount = cartItems.products.length;
    }

    const updatedProducts = filteredProducts.map((product) => {
      return {
        ...product.toObject(),
        wishlisted: wishlistedProducts.includes(product._id.toString()) // Add wishlisted property
      };
    });

    res.render("user/home", {
      user: userData,
      product: updatedProducts,
      cartCount,
      wishlistCount, // Pass wishlist count to the frontend
    });
  } catch (error) {
    console.error("Error loading home page:", error.message);
    res.status(500).send("Server error");
  }
};

const loadSignup = async (req, res) => {
  try {
    if (req.session.user) {
      return res.redirect("/");
    }
    return res.render("user/signup");
  } catch (error) {
    console.log("Signup page not loading", error);
    res.status(500).send("Server error");
  }
};

const loadLogin = async (req, res) => {
  try {
    if (req.session.user) {
      return res.redirect("/");
    }
    return res.render("user/login");
  } catch (error) {
    console.log("Login page not loading", error);
    res.status(500).send("Server error");
  }
};

const generateOtp = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

const sendVerificationEmail = async (email, otp) => {
  console.log('sending otp to :',email,' otp :',otp);
  
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      port: 587,
      secure: false,
      requireTLS: true,
      auth: {
        user: process.env.NODEMAILER_EMAIL,
        pass: process.env.NODEMAILER_PASS,
      },
    });

    const info = await transporter.sendMail({
      from: process.env.NODEMAILER_EMAIL,
      to: email,
      subject: "Verify your account",
      html: `<b>Your OTP : ${otp}</b>`,
    });

    return info.accepted.length > 0;
  } catch (error) {
    console.error("Error sending email", error);
    return false;
  }
};

// Hash password function
const hashPassword = async (password) => {
  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(password, saltRounds);
  return hashedPassword;
};

const signup = async (req, res) => {
  try {
      const { name, email, phone, password } = req.body;
      const findUser = await User.findOne({ email });
      if (findUser) {
          return res.status(400).json({
              success: false,
              message: "User already exists. Please use another email.",
          });
      }

      const otp = generateOtp();
      const emailSent = await sendVerificationEmail(email, otp);
      if (!emailSent) {
          return res.json({
              success: false,
              message: "Email sending failed.",
          });
      }

      // Save OTP and user data in session
      req.session.userOtp = otp;
      req.session.userData = { name, email, phone, password }; // Ensure this is set

      return res.status(200).json({
          success: true,
          message: "OTP sent successfully",
      });
  } catch (error) {
      console.error("Signup error:", error);
      return res.redirect("/pageNotFound");
  }
};

const renderOtpPage = async (req, res) => {
  try {
    const { email } = req.session.userData;
    res.render("user/verifyOtp", { email });
  } catch (error) {
    console.log(error);
  }
};

const verifyOtp = async (req, res) => {
  try {
      const { otp } = req.body;
      if (otp === req.session.userOtp) {
          const user = req.session.userData;
          const passwordHash = await hashPassword(user.password);
          const saveUserData = new User({
              name: user.name,
              email: user.email,
              phone: user.phone,
              password: passwordHash,
          });

          const userdata = await saveUserData.save();
          req.session.user = userdata;

          // Clear OTP and user data from session
          delete req.session.userOtp;
          delete req.session.userData;

          res.json({ success: true, redirectUrl: "/" });
      } else {
          res.status(400).json({ success: false, message: "Invalid OTP" });
      }
  } catch (error) {
      console.error("Error verifying OTP:", error);
      res.status(500).json({ message: "Internal server error" });
  }
};

// Resend OTP
const resendOtp = async (req, res) => {
  try {
      if (!req.session.userData) {
          return res.status(400).json({ success: false, message: "Session data not found. Please try signing up again." });
      }

      const { email } = req.session.userData;
      const otp = generateOtp();
      const emailSent = await sendVerificationEmail(email, otp);
      console.log("new otp", otp);

      if (emailSent) {
          req.session.userOtp = otp;
          res.status(200).json({ success: true, message: "OTP resent successfully" });
      } else {
          res.status(500).json({ success: false, message: "Error sending OTP" });
      }
  } catch (error) {
      console.error("Error resending OTP:", error);
      res.status(500).json({ message: "Internal server error" });
  }
};

// Login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email, isAdmin: false });

    if (user) {
      if (user.isBlocked) {
        return res.render("user/login", {
          message: "Your account is blocked. Please contact support.",
        });
      }

      // Compare password using bcrypt
      const isPasswordValid = await bcrypt.compare(password, user.password);

      if (isPasswordValid) {
        req.session.user = user;
        res.redirect("/"); // Redirect to the homepage or user dashboard
      } else {
        res.render("user/login", { message: "Invalid Credentials" });
      }
    } else {
      res.render("user/login", { message: "Invalid Username" });
    }
  } catch (error) {
    console.error("Login error:", error);
    res.redirect("/pageNoteFound");
  }
};

const logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.redirect("/");
    }
    res.clearCookie("connect.sid");
    res.redirect("/login");
  });
};

const loadShopPage = async (req, res) => {
  try {
    const user = req.session.user;
    const userId = req.session.user?._id; // Use _id instead of id

    const { category, brand, priceRange, sort, search, page = 1 } = req.query;
    const limit = 9;
    const skip = (page - 1) * limit;

    const query = { 
      status: "Active", 
      isDeleted: false 
    };

    if (category) {
      const categories = Array.isArray(category) ? category : [category];
      const validCategories = categories
        .filter(id => mongoose.Types.ObjectId.isValid(id))
        .map(id => new mongoose.Types.ObjectId(id));

      if (validCategories.length > 0) {
        query.category = validCategories.length === 1 
          ? validCategories[0] 
          : { $in: validCategories };
      }
    }

    if (brand) {
      const brands = Array.isArray(brand) ? brand : [brand];
      const validBrands = brands
        .filter(id => mongoose.Types.ObjectId.isValid(id))
        .map(id => new mongoose.Types.ObjectId(id));

      if (validBrands.length > 0) {
        query.brand = validBrands.length === 1 
          ? validBrands[0] 
          : { $in: validBrands };
      }
    }

    if (priceRange) {
      const priceConditions = {
        under1000: { $lt: 1000 },
        "1000-1500": { $gte: 1000, $lte: 1500 },
        above1500: { $gt: 1500 },
      };
      query.discountprice = priceConditions[priceRange];
    }

    if (search) {
      query.$or = [
        { productName: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Sorting Logic
    const sortOptions = {
      popularity: { popularity: -1 },
      priceLowToHigh: { finalPrice: 1 }, // Sort by finalPrice (lowest of discountprice and categoryDiscountprice)
      priceHighToLow: { finalPrice: -1 }, // Sort by finalPrice (highest of discountprice and categoryDiscountprice)
      avgRatings: { averageRating: -1 },
      featured: { featured: -1 },
      aToZ: { productName: 1 },
      zToA: { productName: -1 },
    };
    const sortQuery = sort ? sortOptions[sort] : {};

    const categories = await Category.aggregate([
      {
        $lookup: {
          from: "products",
          let: { categoryId: "$_id" },
          pipeline: [
            { 
              $match: { 
                $expr: { $eq: ["$category", "$$categoryId"] },
                status: "Active",
                isDeleted: false
              }
            }
          ],
          as: "products"
        }
      },
      { 
        $project: { 
          _id: 1, 
          name: 1, 
          productCount: { $size: "$products" } 
        } 
      }
    ]);

    const brands = await Brand.aggregate([
      {
        $lookup: {
          from: "products",
          let: { brandId: "$_id" },
          pipeline: [
            { 
              $match: { 
                $expr: { $eq: ["$brand", "$$brandId"] },
                status: "Active",
                isDeleted: false
              }
            }
          ],
          as: "products"
        }
      },
      { 
        $project: { 
          _id: 1, 
          brandName: 1, 
          productCount: { $size: "$products" } 
        } 
      }
    ]);

    const priceCounts = {
      under1000: await Product.countDocuments({ 
        ...query, 
        discountprice: { $lt: 1000 } 
      }),
      "1000-1500": await Product.countDocuments({ 
        ...query, 
        discountprice: { $gte: 1000, $lte: 1500 } 
      }),
      above1500: await Product.countDocuments({ 
        ...query, 
        discountprice: { $gt: 1500 } 
      }),
    };

    const totalProducts = await Product.countDocuments(query);
    const totalPages = Math.ceil(totalProducts / limit);

    // Fetch all products and calculate finalPrice
    let products = await Product.find(query)
      .populate("category")
      .populate("brand")
      .lean();

    // Calculate finalPrice for each product
    products = products.map(product => {
      const discountPrice = product.discountprice || Infinity;
      const categoryDiscountPrice = product.categoryDiscountprice || Infinity;
      product.finalPrice = Math.min(discountPrice, categoryDiscountPrice);
      return product;
    });

    // Sort all products by price if sorting by price
    if (sort === "priceLowToHigh" || sort === "priceHighToLow") {
      products.sort((a, b) => {
        if (sort === "priceLowToHigh") {
          return a.finalPrice - b.finalPrice;
        } else {
          return b.finalPrice - a.finalPrice;
        }
      });
    }

    // Apply pagination after sorting
    const paginatedProducts = products.slice(skip, skip + limit);

    let wishlistProducts = [];
    let wishlistCount = 0; // Initialize wishlist count
    let cartCount = 0;

    if (userId) {
      // Fetch wishlist for the user
      const wishlist = await Wishlist.findOne({ userId });

      if (wishlist) {
        wishlistProducts = wishlist.products.map((item) => item.productId.toString());
        wishlistCount = wishlist.products.length; // Set wishlist count
      }

      // Fetch cart for the user
      const cart = await Cart.findOne({ userId });
      cartCount = cart?.products?.length || 0;
    }

    // Add wishlisted property to each product
    const updatedProducts = paginatedProducts.map((product) => {
      return {
        ...product,
        wishlisted: wishlistProducts.includes(product._id.toString()) // Add wishlisted property
      };
    });

    res.render("user/shop", {
      user,
      categories,
      brands,
      products: updatedProducts, // Pass updated products with wishlisted property
      cartCount,
      wishlistCount, // Pass wishlist count to the frontend
      currentPage: parseInt(page),
      totalPages,
      totalProducts,
      priceCounts,
      searchQuery: search || "",
      filterParams: {
        ...(category && { category: Array.isArray(category) ? category : [category] }),
        ...(brand && { brand: Array.isArray(brand) ? brand : [brand] }),
        ...(priceRange && { priceRange }),
        ...(sort && { sort }),
        ...(search && { search })
      }
    });

  } catch (error) {
    console.error("Error loading shop page:", error);
    res.status(500).render('error', { message: "Server Error" });
  }
};

const productDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id).populate('brand');
    const relatedProducts = await Product.find({ brand: product.brand, _id: { $ne: id } }).limit(4);

    if (!product) {
      return res.status(404).send("Product not found");
    }

    const user = req.session.user ? await User.findById(req.session.user._id) : null;

    let cartCount = 0;
    let wishlistCount = 0;
    let wishlisted = false; // Initialize wishlisted status

    if (user) {
      // Fetch cart for the user
      const cartItems = await Cart.findOne({ userId: user._id });
      cartCount = cartItems?.products?.length || 0;

      // Fetch wishlist for the user
      const wishlist = await Wishlist.findOne({ userId: user._id });
      if (wishlist) {
        wishlistCount = wishlist.products.length; // Set wishlist count
        // Check if the current product is in the wishlist
        wishlisted = wishlist.products.some(p => p.productId.equals(id));
      }
    }

    res.render("user/productDetails", {
      user,
      product,
      relatedProducts,
      cartCount,
      wishlistCount,
      wishlisted // Pass wishlisted status to the frontend
    });
  } catch (error) {
    console.error("Error in productDetails:", error);
    res.status(500).send("Server Error");
  }
};

module.exports = {
  pageNoteFound,
  loadHomePage,
  loadSignup,
  generateOtp,
  sendVerificationEmail,
  hashPassword,
  signup,
  verifyOtp,
  resendOtp,  
  login,
  loadLogin,
  logout,
  loadShopPage,
  productDetails,
  renderOtpPage,
};
