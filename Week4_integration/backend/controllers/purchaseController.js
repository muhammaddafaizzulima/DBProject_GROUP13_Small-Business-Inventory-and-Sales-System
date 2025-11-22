// PURCHASE CONTROLLER

const { query, transaction } = require('../config/database');

// Get all purchases
const getAllPurchases = async (req, res) => {
  try {
    const purchases = await query(`
      SELECT 
        p.Purchase_ID,
        p.Date,
        p.Total_Cost,
        p.Status,
        p.Notes,
        s.Name AS Supplier_Name,
        u.Username AS Created_By
      FROM Purchase p
      JOIN Supplier s ON p.Supplier_ID = s.Supplier_ID
      JOIN User u ON p.User_ID = u.User_ID
      ORDER BY p.Date DESC
      LIMIT 100
    `);
    
    res.json({ 
      success: true, 
      count: purchases.length,
      data: purchases 
    });
  } catch (error) {
    console.error('Error fetching purchases:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch purchases',
      error: error.message 
    });
  }
};

// Get single purchase by ID
const getPurchaseById = async (req, res) => {
  try {
    const purchases = await query(`
      SELECT 
        p.*,
        s.Name AS Supplier_Name,
        s.Contact AS Supplier_Contact,
        s.Phone AS Supplier_Phone,
        u.Username AS Created_By
      FROM Purchase p
      JOIN Supplier s ON p.Supplier_ID = s.Supplier_ID
      JOIN User u ON p.User_ID = u.User_ID
      WHERE p.Purchase_ID = ?
    `, [req.params.id]);
    
    if (purchases.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Purchase not found' 
      });
    }
    
    res.json({ 
      success: true, 
      data: purchases[0]
    });
  } catch (error) {
    console.error('Error fetching purchase:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch purchase',
      error: error.message 
    });
  }
};

// Get purchase with full details (items)
const getPurchaseDetails = async (req, res) => {
  try {
    // Get main purchase
    const purchases = await query(`
      SELECT 
        p.*,
        s.Name AS Supplier_Name,
        s.Contact AS Supplier_Contact,
        s.Phone AS Supplier_Phone,
        u.Username AS Created_By
      FROM Purchase p
      JOIN Supplier s ON p.Supplier_ID = s.Supplier_ID
      JOIN User u ON p.User_ID = u.User_ID
      WHERE p.Purchase_ID = ?
    `, [req.params.id]);
    
    if (purchases.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Purchase not found' 
      });
    }
    
    // Get purchase items
    const items = await query(`
      SELECT 
        pd.Detail_ID,
        pd.Product_ID,
        pr.Product_Name,
        pd.Quantity,
        pd.Unit_Cost,
        pd.SubTotal,
        c.Category_Name
      FROM Purchase_Detail pd
      JOIN Products pr ON pd.Product_ID = pr.Product_ID
      JOIN Category c ON pr.Category_ID = c.Category_ID
      WHERE pd.Purchase_ID = ?
      ORDER BY pd.Detail_ID
    `, [req.params.id]);
    
    res.json({ 
      success: true, 
      data: {
        purchase: purchases[0],
        items: items,
        itemCount: items.length
      }
    });
  } catch (error) {
    console.error('Error fetching purchase details:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch purchase details',
      error: error.message 
    });
  }
};

// Create new purchase (RESTOCK)
const createPurchase = async (req, res) => {
  const { Supplier_ID, User_ID, Notes, items } = req.body;
  
  try {
    // Validation
    if (!Supplier_ID || !User_ID || !items || items.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Supplier ID, User ID, and items are required' 
      });
    }

    // Use database transaction
    const result = await transaction(async (connection) => {
      // Step 1: Validate all products exist
      for (const item of items) {
        const [products] = await connection.query(
          'SELECT Product_ID, Product_Name FROM Products WHERE Product_ID = ?',
          [item.Product_ID]
        );
        
        if (products.length === 0) {
          throw new Error(`Product ID ${item.Product_ID} not found`);
        }
        
        if (item.Quantity <= 0) {
          throw new Error(`Quantity must be greater than 0 for ${products[0].Product_Name}`);
        }
        
        if (item.Unit_Cost < 0) {
          throw new Error(`Unit cost cannot be negative for ${products[0].Product_Name}`);
        }
      }
      
      // Step 2: Calculate total cost
      let totalCost = 0;
      for (const item of items) {
        totalCost += item.Unit_Cost * item.Quantity;
      }
      
      // Step 3: Insert main purchase record
      const [purchaseResult] = await connection.query(
        `INSERT INTO Purchase (Date, Total_Cost, Supplier_ID, User_ID, Status, Notes)
         VALUES (NOW(), ?, ?, ?, 'Completed', ?)`,
        [totalCost, Supplier_ID, User_ID, Notes || null]
      );
      
      const purchaseId = purchaseResult.insertId;
      
      // Step 4: Insert purchase details and INCREASE stock
      for (const item of items) {
        const subtotal = item.Unit_Cost * item.Quantity;
        
        // Insert detail
        await connection.query(
          `INSERT INTO Purchase_Detail (Purchase_ID, Product_ID, Quantity, Unit_Cost, SubTotal)
           VALUES (?, ?, ?, ?, ?)`,
          [purchaseId, item.Product_ID, item.Quantity, item.Unit_Cost, subtotal]
        );
        
        // INCREASE stock (opposite of transaction)
        await connection.query(
          'UPDATE Products SET Stock_Quantity = Stock_Quantity + ? WHERE Product_ID = ?',
          [item.Quantity, item.Product_ID]
        );
      }
      
      return {
        Purchase_ID: purchaseId,
        Total_Cost: totalCost,
        Items_Count: items.length,
        Date: new Date()
      };
    });
    
    res.status(201).json({ 
      success: true, 
      message: 'Purchase created successfully and stock updated',
      data: result
    });
    
  } catch (error) {
    console.error('Purchase creation error:', error);
    res.status(400).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// Cancel purchase (remove added stock)
const cancelPurchase = async (req, res) => {
  try {
    // Use database transaction
    await transaction(async (connection) => {
      // Get purchase status
      const [purchases] = await connection.query(
        'SELECT Status FROM Purchase WHERE Purchase_ID = ?',
        [req.params.id]
      );
      
      if (purchases.length === 0) {
        throw new Error('Purchase not found');
      }
      
      if (purchases[0].Status === 'Cancelled') {
        throw new Error('Purchase is already cancelled');
      }
      
      // Get purchase details to remove stock
      const [details] = await connection.query(
        'SELECT Product_ID, Quantity FROM Purchase_Detail WHERE Purchase_ID = ?',
        [req.params.id]
      );
      
      if (details.length === 0) {
        throw new Error('Purchase details not found');
      }
      
      // Check if we can remove stock (enough stock available)
      for (const detail of details) {
        const [products] = await connection.query(
          'SELECT Stock_Quantity, Product_Name FROM Products WHERE Product_ID = ?',
          [detail.Product_ID]
        );
        
        if (products[0].Stock_Quantity < detail.Quantity) {
          throw new Error(
            `Cannot cancel: ${products[0].Product_Name} has been sold. ` +
            `Current stock: ${products[0].Stock_Quantity}, Need to remove: ${detail.Quantity}`
          );
        }
      }
      
      // Remove stock for each item
      for (const detail of details) {
        await connection.query(
          'UPDATE Products SET Stock_Quantity = Stock_Quantity - ? WHERE Product_ID = ?',
          [detail.Quantity, detail.Product_ID]
        );
      }
      
      // Update purchase status
      await connection.query(
        'UPDATE Purchase SET Status = ? WHERE Purchase_ID = ?',
        ['Cancelled', req.params.id]
      );
    });
    
    res.json({ 
      success: true, 
      message: 'Purchase cancelled and stock adjusted successfully' 
    });
    
  } catch (error) {
    console.error('Cancel purchase error:', error);
    res.status(400).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// Get purchases by date range
const getPurchasesByDateRange = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ 
        success: false, 
        message: 'Start date and end date are required' 
      });
    }

    const purchases = await query(`
      SELECT 
        p.Purchase_ID,
        p.Date,
        p.Total_Cost,
        p.Status,
        s.Name AS Supplier_Name,
        u.Username AS Created_By
      FROM Purchase p
      JOIN Supplier s ON p.Supplier_ID = s.Supplier_ID
      JOIN User u ON p.User_ID = u.User_ID
      WHERE DATE(p.Date) BETWEEN ? AND ?
      ORDER BY p.Date DESC
    `, [startDate, endDate]);
    
    // Calculate summary
    const summary = purchases.reduce((acc, p) => {
      if (p.Status === 'Completed') {
        acc.totalCost += parseFloat(p.Total_Cost);
        acc.completedCount++;
      }
      return acc;
    }, { totalCost: 0, completedCount: 0 });
    
    res.json({ 
      success: true,
      count: purchases.length,
      data: purchases,
      summary: {
        ...summary,
        totalPurchases: purchases.length,
        averagePurchase: summary.completedCount > 0 
          ? summary.totalCost / summary.completedCount 
          : 0
      }
    });
  } catch (error) {
    console.error('Error fetching purchases by date:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch purchases',
      error: error.message 
    });
  }
};

// Get purchases by supplier
const getPurchasesBySupplier = async (req, res) => {
  try {
    const purchases = await query(`
      SELECT 
        p.Purchase_ID,
        p.Date,
        p.Total_Cost,
        p.Status,
        u.Username AS Created_By
      FROM Purchase p
      JOIN User u ON p.User_ID = u.User_ID
      WHERE p.Supplier_ID = ?
      ORDER BY p.Date DESC
    `, [req.params.supplierId]);
    
    res.json({ 
      success: true,
      count: purchases.length,
      data: purchases
    });
  } catch (error) {
    console.error('Error fetching purchases by supplier:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch purchases',
      error: error.message 
    });
  }
};

module.exports = {
  getAllPurchases,
  getPurchaseById,
  getPurchaseDetails,
  createPurchase,
  cancelPurchase,
  getPurchasesByDateRange,
  getPurchasesBySupplier
};