const User = require("../../models/userSchema");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const Category = require("../../models/categorySchema");
const Brand = require("../../models/brandSchema");
const Order = require("../../models/orderSchema");
const Wallet = require("../../models/walletSchema");
const Product = require("../../models/productSchema");

const pageError = async (req, res) => {
  res.render("admin/adminError");
};

const loadLogin = async (req, res) => {
  try {
    if (req.session.admin) {
      return res.redirect("/admin");
    }
    res.render("admin/login", { message: null });
  } catch (error) {
    console.log(error.message);
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log("admin:", email, password);

    const admin = await User.findOne({ email, isAdmin: true });
    console.log("admin:", admin);
    if (admin) {
      const passwordMarch = bcrypt.compare(password, admin.password);

      if (passwordMarch) {
        req.session.admin = true;
        console.log("===============2");

        return res.redirect("/admin");
      } else {
        console.log("======3");

        return res.redirect("admin/login");
      }
    } else {
      console.log("===========4");

      return res.redirect("login");
    }
  } catch (error) {
    console.log("login error", error);
    console.log("here hhhhhhhhhhhhhhhhhhhhhhhh");

    return res.redirect("/pageerror");
  }
};

const loadDashboard = async (req, res) => {
  try {
    const admin = req.session.admin;
    if (!admin) {
      return res.render("admin/login");
    }

    // Calculate total sales
    const totalSalesResult = await Order.aggregate([
      { $group: { _id: null, totalSales: { $sum: "$totalAmount" } } },
    ]);

    const totalSales = totalSalesResult.length > 0 ? totalSalesResult[0].totalSales : 0;

    // Calculate today's sales
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todaysSalesResult = await Order.aggregate([
      { $match: { createdAt: { $gte: today } } },
      { $group: { _id: null, todaysSales: { $sum: "$totalAmount" } } },
    ]);

    const todaysSales = todaysSalesResult.length > 0 ? todaysSalesResult[0].todaysSales : 0;

    // Calculate total orders count
    const totalOrders = await Order.countDocuments();

    // Calculate pending orders count
    const pendingOrders = await Order.countDocuments({ status: "Pending" });

    // Fetch top 10 best-selling products
    const bestSellingProducts = await Order.aggregate([
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.productId",
          productName: { $first: "$items.productName" },
          totalQuantity: { $sum: "$items.quantity" },
          totalRevenue: { $sum: { $multiply: ["$items.quantity", "$items.price"] } },
        },
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: 10 },
    ]);

    // Fetch top 10 best-selling categories
    const bestSellingCategories = await Order.aggregate([
      { $unwind: "$items" },
      {
        $lookup: {
          from: "products",
          localField: "items.productId",
          foreignField: "_id",
          as: "productDetails",
        },
      },
      { $unwind: "$productDetails" },
      {
        $lookup: {
          from: "categories",
          localField: "productDetails.category",
          foreignField: "_id",
          as: "categoryDetails",
        },
      },
      { $unwind: "$categoryDetails" },
      {
        $group: {
          _id: "$categoryDetails.name",
          totalQuantity: { $sum: "$items.quantity" },
          totalRevenue: { $sum: { $multiply: ["$items.quantity", "$items.price"] } },
        },
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: 10 },
    ]);

    // Fetch top 10 best-selling brands
    const bestSellingBrands = await Order.aggregate([
      { $unwind: "$items" },
      {
        $lookup: {
          from: "products",
          localField: "items.productId",
          foreignField: "_id",
          as: "productDetails",
        },
      },
      { $unwind: "$productDetails" },
      {
        $lookup: {
          from: "brands",
          localField: "productDetails.brand",
          foreignField: "_id",
          as: "brandDetails",
        },
      },
      { $unwind: { path: "$brandDetails", preserveNullAndEmptyArrays: true } }, // Prevent missing brands from breaking
      {
        $group: {
          _id: "$brandDetails._id",
          brandName: { $first: "$brandDetails.brandName" }, // Extract brand name properly
          totalQuantity: { $sum: "$items.quantity" },
          totalRevenue: { $sum: { $multiply: ["$items.quantity", "$items.price"] } },
        },
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: 10 },
    ]);
    
    const bestBrandName = (bestSellingBrands.length > 0 && bestSellingBrands[0].brandName)
      ? bestSellingBrands[0].brandName
      : "N/A";
    
    // Ensure best brand name is extracted correctly
   
    console.log("Best Brand:", bestBrandName);
    

    // Debugging: Log the bestSellingBrands result
    console.log("Best Selling Brands:", JSON.stringify(bestSellingBrands, null, 2));

    // Ensure best category and brand names are assigned correctly
    const bestCategoryName = bestSellingCategories.length > 0 ? bestSellingCategories[0]._id : "N/A";


    console.log("Best Category:", bestCategoryName);
    console.log("Best Brand:", bestBrandName);

    // Render the admin dashboard
    res.render("admin/home", {
      admin,
      totalSales,
      todaysSales,
      totalOrders,
      pendingOrders,
      bestSellingProducts,
      bestSellingCategories,
      bestSellingBrands,
      bestCategoryName,
      bestBrandName,
    });
  } catch (error) {
    console.error("Error in loadDashboard:", error);
    res.status(500).send("Internal Server Error");
  }
};


const logout = async (req, res) => {
  try {
    req.session.destroy((err) => {
      if (err) {
        console.log("Error destroying session", err);
        return res.redirect("/pageerror");
      }
      res.redirect("/admin/login");
    });
  } catch (error) {
    console.log("unexpected error during logout");
    res.redirect("/pageerror");
  }
};
const getSalesData = async (req, res) => {
  try {
    const { filter } = req.query;

    let salesData;
    if (filter === 'daily') {
      // Fetch daily sales data for the current month
      const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      const endOfMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);

      salesData = await Order.aggregate([
        {
          $match: {
            createdAt: { $gte: startOfMonth, $lte: endOfMonth }
          }
        },
        {
          $group: {
            _id: { $dayOfMonth: "$createdAt" },
            totalSales: { $sum: "$totalAmount" },
          },
        },
        {
          $sort: { _id: 1 },
        },
      ]);

      const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
      const labels = Array.from({ length: daysInMonth }, (_, i) => (i + 1).toString());
      const sales = Array(daysInMonth).fill(0);
      salesData.forEach((item) => {
        sales[item._id - 1] = item.totalSales;
      });

      res.json({ labels, sales });

    } else if (filter === 'weekly') {
      // Fetch weekly sales data for the current year
      const startOfYear = new Date(new Date().getFullYear(), 0, 1);
      const endOfYear = new Date(new Date().getFullYear(), 11, 31);

      salesData = await Order.aggregate([
        {
          $match: {
            createdAt: { $gte: startOfYear, $lte: endOfYear }
          }
        },
        {
          $group: {
            _id: { $week: "$createdAt" },
            totalSales: { $sum: "$totalAmount" },
          },
        },
        {
          $sort: { _id: 1 },
        },
      ]);

      const labels = salesData.map((item) => `Week ${item._id}`);
      const sales = salesData.map((item) => item.totalSales);

      res.json({ labels, sales });

    } else if (filter === 'monthly') {
      // Fetch monthly sales data
      salesData = await Order.aggregate([
        {
          $group: {
            _id: { $month: "$createdAt" },
            totalSales: { $sum: "$totalAmount" },
          },
        },
        {
          $sort: { _id: 1 },
        },
      ]);

      const labels = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
      ];

      const sales = Array(12).fill(0);
      salesData.forEach((item) => {
        sales[item._id - 1] = item.totalSales;
      });

      res.json({ labels, sales });

    } else if (filter === 'yearly') {
      // Fetch yearly sales data
      salesData = await Order.aggregate([
        {
          $group: {
            _id: { $year: "$createdAt" },
            totalSales: { $sum: "$totalAmount" },
          },
        },
        {
          $sort: { _id: 1 },
        },
      ]);

      const labels = salesData.map((item) => item._id.toString());
      const sales = salesData.map((item) => item.totalSales);

      res.json({ labels, sales });
    } else {
      res.status(400).json({ error: "Invalid filter" });
    }
  } catch (error) {
    console.error("Error in getSalesData:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};



module.exports = {
  loadLogin,
  login,
  loadDashboard,
  pageError,
  logout,
  getSalesData,
  
};
