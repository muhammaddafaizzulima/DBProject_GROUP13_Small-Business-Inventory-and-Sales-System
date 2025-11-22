// TRANSACTION CONTROLLER

const { query, transaction } = require('../config/database');

// Get all transactions
const getAllTransactions = async (req, res) => {
  try {
    const transactions = await query(`
      SELECT 
        t.Transaction_ID,
        t.Date,
        t.Total_Amount,
        t.Payment_Method,
        t.Status,
        t.Notes,
        COALESCE(c.Name, 'Walk-in Customer') AS Customer_Name,
        u.Username AS Cashier_Name
      FROM Transaction t
      LEFT JOIN Customer c ON t.Customer_ID = c.Customer_ID
      JOIN User u ON t.User_ID = u.User_ID
      ORDER BY t.Date DESC
      LIMIT 100
    `);
    
    res.json({ 
      success: true, 
      count: transactions.length,
      data: transactions 
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch transactions',
      error: error.message 
    });
  }
};

// Get single transaction by ID
const getTransactionById = async (req, res) => {
  try {
    const transactions = await query(`
      SELECT 
        t.*,
        COALESCE(c.Name, 'Walk-in Customer') AS Customer_Name,
        c.Phone AS Customer_Phone,
        c.Email AS Customer_Email,
        u.Username AS Cashier_Name
      FROM Transaction t
      LEFT JOIN Customer c ON t.Customer_ID = c.Customer_ID
      JOIN User u ON t.User_ID = u.User_ID
      WHERE t.Transaction_ID = ?
    `, [req.params.id]);
    
    if (transactions.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Transaction not found' 
      });
    }
    
    res.json({ 
      success: true, 
      data: transactions[0]
    });
  } catch (error) {
    console.error('Error fetching transaction:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch transaction',
      error: error.message 
    });
  }
};

// Get transaction with full details (items)
const getTransactionDetails = async (req, res) => {
  try {
    // Get main transaction
    const transactions = await query(`
      SELECT 
        t.*,
        COALESCE(c.Name, 'Walk-in Customer') AS Customer_Name,
        c.Phone AS Customer_Phone,
        u.Username AS Cashier_Name
      FROM Transaction t
      LEFT JOIN Customer c ON t.Customer_ID = c.Customer_ID
      JOIN User u ON t.User_ID = u.User_ID
      WHERE t.Transaction_ID = ?
    `, [req.params.id]);
    
    if (transactions.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Transaction not found' 
      });
    }
    
    // Get transaction items
    const items = await query(`
      SELECT 
        td.Detail_ID,
        td.Product_ID,
        p.Product_Name,
        td.Quantity,
        td.Unit_Price,
        td.Subtotal,
        c.Category_Name
      FROM Transaction_Detail td
      JOIN Products p ON td.Product_ID = p.Product_ID
      JOIN Category c ON p.Category_ID = c.Category_ID
      WHERE td.Transaction_ID = ?
      ORDER BY td.Detail_ID
    `, [req.params.id]);
    
    res.json({ 
      success: true, 
      data: {
        transaction: transactions[0],
        items: items,
        itemCount: items.length
      }
    });
  } catch (error) {
    console.error('Error fetching transaction details:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch transaction details',
      error: error.message 
    });
  }
};

// Create new transaction (SALES)
const createTransaction = async (req, res) => {
  const { Customer_ID, User_ID, Payment_Method, Notes, items } = req.body;
  
  try {
    // Validation
    if (!User_ID || !items || items.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'User ID and items are required' 
      });
    }

    // Use database transaction
    const result = await transaction(async (connection) => {
      // Step 1: Validate stock availability for all items
      for (const item of items) {
        const [products] = await connection.query(
          'SELECT Stock_Quantity, Product_Name FROM Products WHERE Product_ID = ?',
          [item.Product_ID]
        );
        
        if (products.length === 0) {
          throw new Error(`Product ID ${item.Product_ID} not found`);
        }
        
        if (products[0].Stock_Quantity < item.Quantity) {
          throw new Error(
            `Insufficient stock for ${products[0].Product_Name}. ` +
            `Available: ${products[0].Stock_Quantity}, Requested: ${item.Quantity}`
          );
        }
      }
      
      // Step 2: Calculate total amount
      let totalAmount = 0;
      for (const item of items) {
        totalAmount += item.Unit_Price * item.Quantity;
      }
      
      // Step 3: Insert main transaction record
      const [transResult] = await connection.query(
        `INSERT INTO Transaction (Date, Total_Amount, Customer_ID, User_ID, Payment_Method, Status, Notes) 
         VALUES (NOW(), ?, ?, ?, ?, 'Completed', ?)`,
        [totalAmount, Customer_ID || null, User_ID, Payment_Method || 'Cash', Notes || null]
      );
      
      const transactionId = transResult.insertId;
      
      // Step 4: Insert transaction details and update stock
      for (const item of items) {
        const subtotal = item.Unit_Price * item.Quantity;
        
        // Insert detail
        await connection.query(
          `INSERT INTO Transaction_Detail (Transaction_ID, Product_ID, Quantity, Unit_Price, Subtotal)
           VALUES (?, ?, ?, ?, ?)`,
          [transactionId, item.Product_ID, item.Quantity, item.Unit_Price, subtotal]
        );
        
        // Decrease stock
        await connection.query(
          'UPDATE Products SET Stock_Quantity = Stock_Quantity - ? WHERE Product_ID = ?',
          [item.Quantity, item.Product_ID]
        );
      }
      
      return {
        Transaction_ID: transactionId,
        Total_Amount: totalAmount,
        Items_Count: items.length,
        Date: new Date()
      };
    });
    
    res.status(201).json({ 
      success: true, 
      message: 'Transaction created successfully',
      data: result
    });
    
  } catch (error) {
    console.error('Transaction creation error:', error);
    res.status(400).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// Cancel transaction (restore stock)
const cancelTransaction = async (req, res) => {
  try {
    // Use database transaction
    await transaction(async (connection) => {
      // Get transaction status
      const [transactions] = await connection.query(
        'SELECT Status FROM Transaction WHERE Transaction_ID = ?',
        [req.params.id]
      );
      
      if (transactions.length === 0) {
        throw new Error('Transaction not found');
      }
      
      if (transactions[0].Status === 'Cancelled') {
        throw new Error('Transaction is already cancelled');
      }
      
      // Get transaction details to restore stock
      const [details] = await connection.query(
        'SELECT Product_ID, Quantity FROM Transaction_Detail WHERE Transaction_ID = ?',
        [req.params.id]
      );
      
      if (details.length === 0) {
        throw new Error('Transaction details not found');
      }
      
      // Restore stock for each item
      for (const detail of details) {
        await connection.query(
          'UPDATE Products SET Stock_Quantity = Stock_Quantity + ? WHERE Product_ID = ?',
          [detail.Quantity, detail.Product_ID]
        );
      }
      
      // Update transaction status
      await connection.query(
        'UPDATE Transaction SET Status = ? WHERE Transaction_ID = ?',
        ['Cancelled', req.params.id]
      );
    });
    
    res.json({ 
      success: true, 
      message: 'Transaction cancelled and stock restored successfully' 
    });
    
  } catch (error) {
    console.error('Cancel transaction error:', error);
    res.status(400).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// Get transactions by date range
const getTransactionsByDateRange = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ 
        success: false, 
        message: 'Start date and end date are required' 
      });
    }

    const transactions = await query(`
      SELECT 
        t.Transaction_ID,
        t.Date,
        t.Total_Amount,
        t.Payment_Method,
        t.Status,
        COALESCE(c.Name, 'Walk-in Customer') AS Customer_Name,
        u.Username AS Cashier_Name
      FROM Transaction t
      LEFT JOIN Customer c ON t.Customer_ID = c.Customer_ID
      JOIN User u ON t.User_ID = u.User_ID
      WHERE DATE(t.Date) BETWEEN ? AND ?
      ORDER BY t.Date DESC
    `, [startDate, endDate]);
    
    // Calculate summary
    const summary = transactions.reduce((acc, t) => {
      if (t.Status === 'Completed') {
        acc.totalRevenue += parseFloat(t.Total_Amount);
        acc.completedCount++;
      }
      return acc;
    }, { totalRevenue: 0, completedCount: 0 });
    
    res.json({ 
      success: true,
      count: transactions.length,
      data: transactions,
      summary: {
        ...summary,
        totalTransactions: transactions.length,
        averageTransaction: summary.completedCount > 0 
          ? summary.totalRevenue / summary.completedCount 
          : 0
      }
    });
  } catch (error) {
    console.error('Error fetching transactions by date:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch transactions',
      error: error.message 
    });
  }
};

module.exports = {
  getAllTransactions,
  getTransactionById,
  getTransactionDetails,
  createTransaction,
  cancelTransaction,
  getTransactionsByDateRange
};