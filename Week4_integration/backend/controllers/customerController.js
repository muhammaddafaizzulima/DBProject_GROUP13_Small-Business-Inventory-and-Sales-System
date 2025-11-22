// CUSTOMER CONTROLLER

const { query } = require('../config/database');

// Get all customers
const getAllCustomers = async (req, res) => {
  try {
    const customers = await query(`
      SELECT 
        Customer_ID,
        Name,
        Phone,
        Email,
        Address,
        Created_At,
        Updated_At
      FROM Customer
      ORDER BY Name
    `);
    
    res.json({ 
      success: true, 
      count: customers.length,
      data: customers 
    });
  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch customers',
      error: error.message 
    });
  }
};

// Get single customer by ID
const getCustomerById = async (req, res) => {
  try {
    const customers = await query(
      'SELECT * FROM Customer WHERE Customer_ID = ?',
      [req.params.id]
    );
    
    if (customers.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Customer not found' 
      });
    }
    
    // Get customer's transaction history
    const transactions = await query(`
      SELECT 
        Transaction_ID,
        Date,
        Total_Amount,
        Payment_Method,
        Status
      FROM Transaction
      WHERE Customer_ID = ?
      ORDER BY Date DESC
      LIMIT 10
    `, [req.params.id]);
    
    res.json({ 
      success: true, 
      data: {
        customer: customers[0],
        recentTransactions: transactions
      }
    });
  } catch (error) {
    console.error('Error fetching customer:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch customer',
      error: error.message 
    });
  }
};

// Create new customer
const createCustomer = async (req, res) => {
  try {
    const { Name, Phone, Email, Address } = req.body;
    
    // Validation
    if (!Name) {
      return res.status(400).json({ 
        success: false, 
        message: 'Customer name is required' 
      });
    }

    // Check if email already exists
    if (Email) {
      const existingCustomers = await query(
        'SELECT Customer_ID FROM Customer WHERE Email = ?',
        [Email]
      );
      
      if (existingCustomers.length > 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'Email already exists' 
        });
      }
    }

    const result = await query(`
      INSERT INTO Customer (Name, Phone, Email, Address)
      VALUES (?, ?, ?, ?)
    `, [Name, Phone || null, Email || null, Address || null]);
    
    res.status(201).json({ 
      success: true, 
      message: 'Customer created successfully',
      data: { 
        Customer_ID: result.insertId,
        Name 
      }
    });
  } catch (error) {
    console.error('Error creating customer:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to create customer',
      error: error.message 
    });
  }
};

// Update customer
const updateCustomer = async (req, res) => {
  try {
    const { Name, Phone, Email, Address } = req.body;
    
    // Validation
    if (!Name) {
      return res.status(400).json({ 
        success: false, 
        message: 'Customer name is required' 
      });
    }

    // Check if email is being changed and if it already exists
    if (Email) {
      const existingCustomers = await query(
        'SELECT Customer_ID FROM Customer WHERE Email = ? AND Customer_ID != ?',
        [Email, req.params.id]
      );
      
      if (existingCustomers.length > 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'Email already exists' 
        });
      }
    }

    const result = await query(`
      UPDATE Customer 
      SET Name = ?, Phone = ?, Email = ?, Address = ?
      WHERE Customer_ID = ?
    `, [Name, Phone, Email, Address, req.params.id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Customer not found' 
      });
    }
    
    res.json({ 
      success: true, 
      message: 'Customer updated successfully' 
    });
  } catch (error) {
    console.error('Error updating customer:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update customer',
      error: error.message 
    });
  }
};

// Delete customer
const deleteCustomer = async (req, res) => {
  try {
    // Check if customer has transactions
    const transactions = await query(
      'SELECT COUNT(*) as count FROM Transaction WHERE Customer_ID = ?',
      [req.params.id]
    );
    
    if (transactions[0].count > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot delete customer with existing transactions' 
      });
    }

    const result = await query(
      'DELETE FROM Customer WHERE Customer_ID = ?',
      [req.params.id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Customer not found' 
      });
    }
    
    res.json({ 
      success: true, 
      message: 'Customer deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting customer:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete customer',
      error: error.message 
    });
  }
};

// Search customers
const searchCustomers = async (req, res) => {
  try {
    const searchTerm = req.params.query;
    
    const customers = await query(`
      SELECT * FROM Customer
      WHERE 
        Name LIKE ? OR 
        Phone LIKE ? OR
        Email LIKE ?
      ORDER BY Name
    `, [`%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`]);
    
    res.json({ 
      success: true,
      count: customers.length,
      data: customers 
    });
  } catch (error) {
    console.error('Error searching customers:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Search failed',
      error: error.message 
    });
  }
};

module.exports = {
  getAllCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  searchCustomers
};