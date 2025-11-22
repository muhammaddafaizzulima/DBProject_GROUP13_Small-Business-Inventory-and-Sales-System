// PRODUCT CONTROLLER

const { query } = require('../config/database');

// Get all products
const getAllProducts = async (req, res) => {
  try {
    const products = await query(`
      SELECT 
        p.Product_ID,
        p.Product_Name,
        p.Price,
        p.Stock_Quantity,
        p.Description,
        p.Min_Stock_Level,
        c.Category_Name,
        c.Category_ID,
        CASE 
          WHEN p.Stock_Quantity = 0 THEN 'Out of Stock'
          WHEN p.Stock_Quantity <= p.Min_Stock_Level THEN 'Low Stock'
          ELSE 'In Stock'
        END AS Stock_Status
      FROM Products p
      JOIN Category c ON p.Category_ID = c.Category_ID
      ORDER BY p.Product_Name
    `);
    
    res.json({ 
      success: true, 
      count: products.length,
      data: products 
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch products',
      error: error.message 
    });
  }
};

// Get single product by ID
const getProductById = async (req, res) => {
  try {
    const products = await query(`
      SELECT 
        p.*,
        c.Category_Name
      FROM Products p
      JOIN Category c ON p.Category_ID = c.Category_ID
      WHERE p.Product_ID = ?
    `, [req.params.id]);
    
    if (products.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Product not found' 
      });
    }
    
    res.json({ 
      success: true, 
      data: products[0] 
    });
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch product',
      error: error.message 
    });
  }
};

// Create new product
const createProduct = async (req, res) => {
  try {
    const { 
      Product_Name, 
      Price, 
      Stock_Quantity, 
      Description, 
      Category_ID, 
      Min_Stock_Level 
    } = req.body;
    
    // Validation
    if (!Product_Name || !Price || !Category_ID) {
      return res.status(400).json({ 
        success: false, 
        message: 'Product name, price, and category are required' 
      });
    }

    if (Price < 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Price cannot be negative' 
      });
    }

    const result = await query(`
      INSERT INTO Products (
        Product_Name, 
        Price, 
        Stock_Quantity, 
        Description, 
        Category_ID, 
        Min_Stock_Level
      )
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      Product_Name, 
      Price, 
      Stock_Quantity || 0, 
      Description || null, 
      Category_ID,
      Min_Stock_Level || 10
    ]);
    
    res.status(201).json({ 
      success: true, 
      message: 'Product created successfully',
      data: { 
        Product_ID: result.insertId,
        Product_Name 
      }
    });
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to create product',
      error: error.message 
    });
  }
};

// Update product
const updateProduct = async (req, res) => {
  try {
    const { 
      Product_Name, 
      Price, 
      Stock_Quantity, 
      Description, 
      Category_ID, 
      Min_Stock_Level 
    } = req.body;
    
    // Validation
    if (Price < 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Price cannot be negative' 
      });
    }

    if (Stock_Quantity < 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Stock quantity cannot be negative' 
      });
    }

    const result = await query(`
      UPDATE Products 
      SET 
        Product_Name = ?, 
        Price = ?, 
        Stock_Quantity = ?, 
        Description = ?, 
        Category_ID = ?,
        Min_Stock_Level = ?
      WHERE Product_ID = ?
    `, [
      Product_Name, 
      Price, 
      Stock_Quantity, 
      Description, 
      Category_ID, 
      Min_Stock_Level, 
      req.params.id
    ]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Product not found' 
      });
    }
    
    res.json({ 
      success: true, 
      message: 'Product updated successfully' 
    });
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update product',
      error: error.message 
    });
  }
};

// Delete product
const deleteProduct = async (req, res) => {
  try {
    const result = await query(
      'DELETE FROM Products WHERE Product_ID = ?', 
      [req.params.id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Product not found' 
      });
    }
    
    res.json({ 
      success: true, 
      message: 'Product deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting product:', error);
    
    // Check if error is due to foreign key constraint
    if (error.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot delete product: it is referenced in transactions or purchases' 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete product',
      error: error.message 
    });
  }
};

// Search products
const searchProducts = async (req, res) => {
  try {
    const searchTerm = req.params.query;
    
    const products = await query(`
      SELECT 
        p.*,
        c.Category_Name
      FROM Products p
      JOIN Category c ON p.Category_ID = c.Category_ID
      WHERE 
        p.Product_Name LIKE ? OR 
        p.Description LIKE ? OR
        c.Category_Name LIKE ?
      ORDER BY p.Product_Name
    `, [
      `%${searchTerm}%`, 
      `%${searchTerm}%`,
      `%${searchTerm}%`
    ]);
    
    res.json({ 
      success: true,
      count: products.length,
      data: products 
    });
  } catch (error) {
    console.error('Error searching products:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Search failed',
      error: error.message 
    });
  }
};

// Get low stock products
const getLowStockProducts = async (req, res) => {
  try {
    const products = await query(`
      SELECT 
        p.Product_ID,
        p.Product_Name,
        p.Stock_Quantity,
        p.Min_Stock_Level,
        c.Category_Name,
        (p.Min_Stock_Level - p.Stock_Quantity) AS Stock_Deficit
      FROM Products p
      JOIN Category c ON p.Category_ID = c.Category_ID
      WHERE p.Stock_Quantity <= p.Min_Stock_Level
      ORDER BY Stock_Deficit DESC
    `);
    
    res.json({ 
      success: true,
      count: products.length,
      data: products 
    });
  } catch (error) {
    console.error('Error fetching low stock products:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch low stock products',
      error: error.message 
    });
  }
};

module.exports = {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  searchProducts,
  getLowStockProducts
};