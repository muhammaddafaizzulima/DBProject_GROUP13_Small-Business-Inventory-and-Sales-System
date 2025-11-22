// CATEGORY CONTROLLER

const { query } = require('../config/database');

// Get all categories
const getAllCategories = async (req, res) => {
  try {
    const categories = await query(`
      SELECT 
        c.Category_ID,
        c.Category_Name,
        c.Description,
        c.Created_At,
        COUNT(p.Product_ID) as Product_Count
      FROM Category c
      LEFT JOIN Products p ON c.Category_ID = p.Category_ID
      GROUP BY c.Category_ID, c.Category_Name, c.Description, c.Created_At
      ORDER BY c.Category_Name
    `);
    
    res.json({ 
      success: true, 
      count: categories.length,
      data: categories 
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch categories',
      error: error.message 
    });
  }
};

// Get single category by ID
const getCategoryById = async (req, res) => {
  try {
    const categories = await query(
      'SELECT * FROM Category WHERE Category_ID = ?',
      [req.params.id]
    );
    
    if (categories.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Category not found' 
      });
    }
    
    // Get products in this category
    const products = await query(`
      SELECT 
        Product_ID,
        Product_Name,
        Price,
        Stock_Quantity
      FROM Products
      WHERE Category_ID = ?
      ORDER BY Product_Name
    `, [req.params.id]);
    
    res.json({ 
      success: true, 
      data: {
        category: categories[0],
        products: products
      }
    });
  } catch (error) {
    console.error('Error fetching category:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch category',
      error: error.message 
    });
  }
};

// Create new category
const createCategory = async (req, res) => {
  try {
    const { Category_Name, Description } = req.body;
    
    // Validation
    if (!Category_Name) {
      return res.status(400).json({ 
        success: false, 
        message: 'Category name is required' 
      });
    }

    // Check if category already exists
    const existingCategories = await query(
      'SELECT Category_ID FROM Category WHERE Category_Name = ?',
      [Category_Name]
    );
    
    if (existingCategories.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Category with this name already exists' 
      });
    }

    const result = await query(`
      INSERT INTO Category (Category_Name, Description)
      VALUES (?, ?)
    `, [Category_Name, Description || null]);
    
    res.status(201).json({ 
      success: true, 
      message: 'Category created successfully',
      data: { 
        Category_ID: result.insertId,
        Category_Name 
      }
    });
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to create category',
      error: error.message 
    });
  }
};

// Update category
const updateCategory = async (req, res) => {
  try {
    const { Category_Name, Description } = req.body;
    
    // Validation
    if (!Category_Name) {
      return res.status(400).json({ 
        success: false, 
        message: 'Category name is required' 
      });
    }

    // Check if new name conflicts with existing category
    const existingCategories = await query(
      'SELECT Category_ID FROM Category WHERE Category_Name = ? AND Category_ID != ?',
      [Category_Name, req.params.id]
    );
    
    if (existingCategories.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Category with this name already exists' 
      });
    }

    const result = await query(`
      UPDATE Category 
      SET Category_Name = ?, Description = ?
      WHERE Category_ID = ?
    `, [Category_Name, Description, req.params.id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Category not found' 
      });
    }
    
    res.json({ 
      success: true, 
      message: 'Category updated successfully' 
    });
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update category',
      error: error.message 
    });
  }
};

// Delete category
const deleteCategory = async (req, res) => {
  try {
    // Check if category has products
    const products = await query(
      'SELECT COUNT(*) as count FROM Products WHERE Category_ID = ?',
      [req.params.id]
    );
    
    if (products[0].count > 0) {
      return res.status(400).json({ 
        success: false, 
        message: `Cannot delete category: it has ${products[0].count} product(s). Please reassign or delete products first.` 
      });
    }

    const result = await query(
      'DELETE FROM Category WHERE Category_ID = ?',
      [req.params.id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Category not found' 
      });
    }
    
    res.json({ 
      success: true, 
      message: 'Category deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete category',
      error: error.message 
    });
  }
};

module.exports = {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory
};