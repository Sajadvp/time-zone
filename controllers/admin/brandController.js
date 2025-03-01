const Brand = require("../../models/brandSchema");

const loadBrandPage = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 5; // Brands per page
    const skip = (page - 1) * limit;

    const brand = await Brand.find().skip(skip).limit(limit);

    const totalBrands = await Brand.countDocuments();

    const totalPages = Math.ceil(totalBrands / limit);

    res.render("admin/brand", {
      brand,
      currentPage: page,
      totalPages,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
};

const loadAddBrand = async (req, res) => {
  try {
    // Fetch all brands from the database
    const brand = await Brand.find();
    console.log(brand);

    // Render the view and pass the brands
    res.render("admin/addBrand", { brand });

  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
};

// Add a new brand
const addBrand = async (req, res) => {
  const { brandName, description } = req.body;

  // Updated validation: Brand name must follow the pattern - start with capital letter, followed by lowercase letters.
  const nameRegex = /^[A-Z][a-z]+(\s[A-Z][a-z]+)*$/;
  if (!nameRegex.test(brandName)) {
    return res.status(400).render("admin/addBrand", {
      error: "Brand name must start with a capital letter followed by lowercase letters.",
      brandName, // Pass the current input values back for user convenience
      description,
    });
  }

  try {
    // Check if the brand already exists
    const existingBrand = await Brand.findOne({ brandName });
    if (existingBrand) {
      return res.status(400).render("admin/addBrand", {
        error: "Brand name already exists. Please choose a different name.",
        brandName,
        description,
      });
    }

    const newBrand = new Brand({
      brandName, // Match the schema field names
      description,
      isListed: true, // Assuming this field indicates active/inactive state
    });

    await newBrand.save();

    res.redirect("/admin/brand");
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
};

const renderEditBrandPage = async (req, res) => {
  try {
    const { id } = req.params;
    const brand = await Brand.findById(id);
    console.log(brand); 
    if (!brand) {
      return res.status(404).send("Brand not found");
    }
    res.render("admin/editBrand", { brand });
  } catch (error) {
    console.error("Error rendering brand:", error);
    res.status(500).send("Internal Server Error");
  }
};

const updateBrand = async (req, res) => {
  try {
    const { brandName, description } = req.body;

    // Validation for brand name and description
    if (!brandName || !description) {
      return res.status(400).json({
        success: false,
        error: "Brand name and description are required",
      });
    }

    // Name validation: first letter capital, no numbers/symbols, min 3 letters
    const nameRegex = /^[A-Z][a-z]+$/;
    if (!nameRegex.test(brandName)) {
      return res.status(400).json({
        success: false,
        error:
          "Brand name must start with a capital letter, contain only lowercase letters, and be at least 3 characters long without numbers or symbols.",
      });
    }

    // Check if brand name already exists
    const existingBrand = await Brand.findOne({ brandName });
    if (existingBrand && existingBrand._id.toString() !== req.params.id) {
      return res.status(400).json({
        success: false,
        error: "Brand name already exists.",
      });
    }

    // Update the brand details
    const updatedBrand = await Brand.findByIdAndUpdate(
      req.params.id,
      { brandName, description },
      { new: true, runValidators: true }
    );

    if (!updatedBrand) {
      return res.status(404).json({
        success: false,
        error: "Brand not found",
      });
    }

    res.json({ success: true, message: "Brand updated successfully", brand: updatedBrand });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      error: "Internal Server Error",
    });
  }
};


// Controller
const brandListed = async (req, res) => {
  const { id } = req.params;
  try {
    // Update isActive to true for listing the brand
    const updatedBrand = await Brand.findByIdAndUpdate(id, { isActive: true }, { new: true });
    if (!updatedBrand) {
      return res.status(404).send("Brand not found");
    }
    res.redirect('/admin/brand');
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
}

const brandUnlisted = async (req, res) => {
  const { id } = req.params;
  try {
    // Update isActive to false for unlisting the brand
    const updatedBrand = await Brand.findByIdAndUpdate(id, { isActive: false }, { new: true });
    if (!updatedBrand) {
      return res.status(404).send("Brand not found");
    }
    res.redirect('/admin/brand');
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
}



module.exports = {
  loadBrandPage,
  brandListed,
  brandUnlisted,
  loadAddBrand,
  addBrand,
  renderEditBrandPage,
  updateBrand,
};
