const Category=require("../../models/categorySchema");


const loadCategoryPage = async (req, res) => {
  try {
    // Get the current page from the query parameter or default to 1
    const page = parseInt(req.query.page) || 1;
    const limit = 5; // Number of categories per page
    const skip = (page - 1) * limit; // Calculate skip value for pagination

    // Fetch categories with pagination
    const categories = await Category.find().skip(skip).limit(limit);

    // Get the total number of categories in the database
    const totalCategories = await Category.countDocuments();
    const totalPages = Math.ceil(totalCategories / limit); // Calculate total pages

    // Render the view with the categories and pagination data
    res.render('admin/category', {
      categories,
      currentPage: page,
      totalPages,
    });
  } catch (err) {
    res.status(500).send('Error fetching categories');
  }
};

const categoryListed= async (req, res) => {
  const { id } = req.params;
  await Category.updateOne({ _id: id }, { isListed: true });
  res.redirect('/admin/category');
}
const categoryUnlisted =async (req, res) => {
  const { id } = req.params;
  await Category.updateOne({ _id: id }, { isListed: false });
  res.redirect('/admin/category');
}

const loadAddCategory = (req, res) => {
  res.render('admin/addCategory'); // Render the add category form view
};

const addCategory = async (req, res) => {
  const { name, description } = req.body;

  // Updated validation: Words start with a capital letter followed by lowercase letters
  const nameRegex = /^([A-Z][a-z]+)(\s[A-Z][a-z]+)*$/;

  if (!nameRegex.test(name)) {
    // If validation fails, render the form again with an error message
    return res.status(400).render('admin/addCategory', {
      error: 'Category name must start with a capital letter followed by lowercase letters, and each word must follow the same pattern.',
      name, // Pass the current input values back for user convenience
      description,
    });
  }

  try {
    // Check if the category already exists
    const existingCategory = await Category.findOne({ name });
    if (existingCategory) {
      // If category exists, render the form with an error message
      return res.status(400).render('admin/addCategory', {
        error: 'Category already exists. Please choose a different name.',
        name,
        description,
      });
    }

    // Proceed with adding the category if validation passes
    const newCategory = new Category({
      name,
      description,
      isListed: true, // Default behavior
    });

    await newCategory.save();
    res.redirect('/admin/category'); // Redirect to category list page
  } catch (error) {
    // Handle potential errors (e.g., database issues)
    res.status(500).render('admin/addCategory', {
      error: 'An error occurred while adding the category. Please try again.',
      name,
      description,
    });
  }
};



// Render Edit Category Page
const renderEditCategoryPage = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await Category.findById(id);

    if (!category) {
      return res.status(404).send("Category not found");
    }

    res.render("admin/editCategory", { category });
  } catch (error) {
    console.error("Error rendering category:", error);
    res.status(500).send("Internal Server Error");
  }
};

// Update Category
const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    // Validate inputs
    if (!name || !description) {
      return res
        .status(400)
        .json({ success: false, error: "Name and description are required" });
    }

    // Name validation: first letter capital, no numbers/symbols, min 3 letters
    const nameRegex = /^[A-Z][a-z]+$/;
    if (!nameRegex.test(name)) {
      return res.status(400).json({
        success: false,
        error:
          "Name must start with a capital letter, contain only lowercase letters, and be at least 3 characters long without numbers or symbols",
      });
    }

    // Check if category name already exists
    const existingCategory = await Category.findOne({ name });
    if (existingCategory && existingCategory._id.toString() !== id) {
      return res.status(400).json({
        success: false,
        error: "Category name already exists",
      });
    }

    // Update category
    const updatedCategory = await Category.findByIdAndUpdate(
      id,
      { name, description },
      { new: true, runValidators: true }
    );

    if (!updatedCategory) {
      return res
        .status(404)
        .json({ success: false, error: "Category not found" });
    }

    res.json({ success: true, message: "Category updated successfully" });
  } catch (error) {
    console.error("Error updating category:", error);
    res
      .status(500)
      .json({ success: false, error: "Internal Server Error" });
  }
};

  

module.exports={
  loadCategoryPage,
  categoryListed,
  categoryUnlisted,
  loadAddCategory,
  addCategory,
  renderEditCategoryPage,
  updateCategory,
  

  



}