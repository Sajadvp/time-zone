const express = require("express");
const router = express.Router();
const adminController = require("../controllers/admin/adminController");
const { userAuth, adminAuth } = require("../middlewares/auth");
const customerController = require("../controllers/admin/customerController");
const categoryController = require("../controllers/admin/categoryController");
const brandController = require("../controllers/admin/brandController");
const productController = require("../controllers/admin/produtController");
const orderController = require('../controllers/admin/orderController');
const offerController = require("../controllers/admin/offerController");
const couponController = require("../controllers/admin/couponController");
const dashboardController = require("../controllers/admin/dashboardController");
const returnController = require("../controllers/admin/returnController")
const upload = require("../config/multer");
const { off } = require("pdfkit");

router.get("/pageerror", adminController.pageError);
router.get("/login", adminController.loadLogin);
router.post("/login", adminController.login);
router.get("/", adminAuth, adminController.loadDashboard);
router.get("/logout", adminAuth, adminController.logout);

// =============================================userManagement===============================================================
router.get("/users", adminAuth, customerController.customerInfo);
router.get("/blockCustomer", adminAuth, customerController.customerBlocked);
router.get("/unblockCustomer", adminAuth, customerController.customerunBlocked);

// =============================================categoryManagement============================================================
router.get('/category', adminAuth, categoryController.loadCategoryPage);
router.post('/category/list/:id', adminAuth, categoryController.categoryListed);
router.post('/category/unlist/:id', adminAuth, categoryController.categoryUnlisted);
router.get('/category/add', adminAuth, categoryController.loadAddCategory);
router.post('/category/add', adminAuth, categoryController.addCategory);
router.get('/editCategory/:id', adminAuth, categoryController.renderEditCategoryPage);
router.post('/editCategory/:id', adminAuth, categoryController.updateCategory);

// =============================================brandManagement===========================================
router.get('/brand', adminAuth, brandController.loadBrandPage);
router.get('/brand/add', adminAuth, brandController.loadAddBrand);
router.post('/brand/add', adminAuth, brandController.addBrand);
router.get('/editBrand/:id', adminAuth, brandController.renderEditBrandPage);
router.post('/brand/update/:id', adminAuth, brandController.updateBrand);
router.post('/brand/list/:id', adminAuth, brandController.brandListed);
router.post('/brand/unlist/:id', adminAuth, brandController.brandUnlisted);

// ===================================================productManagement==============================================
router.get("/product", adminAuth, productController.loadproductPage);
router.get("/addProducts", adminAuth, productController.loadAddProductPage);
router.post("/products/add", adminAuth, upload.array("image", 5), productController.addProduct);
router.get('/editProduct/:id', adminAuth, productController.loadEditProductPage);
router.post('/editProduct/:id', adminAuth, upload.array('image', 5), productController.updateProduct);
router.post('/deleteProduct/:id', adminAuth, productController.deleteProduct);
router.post('/products/toggle-status/:id', adminAuth, productController.toggleProductStatus);

// ======================================================================
// ======================================================================
router.get("/editPro/:id", adminAuth, productController.getEditProductPage);
router.post("/editPro/:id", adminAuth, upload.array('images', 5), productController.updateProducts);

// ===================================================orderManagement==============================================
router.get('/orders', adminAuth, orderController.getOrderPage);
router.get('/order/:orderId', adminAuth, orderController.getOrderDetailsPage);
router.post('/order/:orderId/update-status', adminAuth, orderController.updateOrderStatus);
router.get("/Return",orderController.getReturnOrderPage)

// ===================================================offerManagement==============================================
router.get("/offers", adminAuth, offerController.getOfferPage);

// ===================================================couponManagement==============================================
router.get("/coupon", adminAuth, couponController.getCouponPage);
router.post('/Add-Coupon', adminAuth, couponController.AddCoupon);
router.post('/delete-Coupon/:id', adminAuth, couponController.DeleteCoupon);
router.post('/edit-Coupon', adminAuth, couponController.EDITCOUPON);

// ===================================================dashboardManagement==============================================
router.post("/generate-report", adminAuth, dashboardController.generateReport);

router.get("/add-category-offer",offerController.getAddCategoryOffer)
router.post('/add-category-offer',offerController.postAddCategoryOffer);
router.post('/delete-category-offer/:id',offerController.deleteCategoryOffer) 

router.get('/get-category-offer/:id',offerController.getEditCategoryOffer);

router.post('/update-category-offer',offerController.postEditCategoryOffer );
router.get('/return/approve/:id', returnController.approveReturn);
router.post('/return/reject', returnController.rejectReturn);
router.get("/return/manage/:id",returnController.returnManagment);
router.get('/sales-data',adminController.getSalesData);

module.exports = router;