// SUPPLIER CONTROLLER

const { query } = require('../config/database');

// Get all suppliers
const getAllSuppliers = async (req, res) => {
  try {
    const suppliers = await query(`
      SELECT 
        Supplier_ID,
        Name,
        Contact,
        Phone,
        Email,
        Address,
        Created_At,
        Updated_At
      FROM Supplier
      ORDER BY Name
    `);
    
    res.json({ 
      success: true, 
      count: suppliers.length,
      data: suppliers 
    });
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch suppliers',
      error: error.message 
    });
  }
};

// Get single supplier by ID
const getSupplierById = async (req, res) => {
  try {
    const suppliers = await query(
      'SELECT * FROM Supplier WHERE Supplier_ID = ?',
      [req.params.id]
    );
    
    if (suppliers.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Supplier not found' 
      });
    }
    
    // Get supplier's purchase history
    const purchases = await query(`
      SELECT 
        Purchase_ID,
        Date,
        Total_Cost,
        Status
      FROM Purchase
      WHERE Supplier_ID = ?
      ORDER BY Date DESC
      LIMIT 10
    `, [req.params.id]);
    
    // Calculate total purchases
    const stats = await query(`
      SELECT 
        COUNT(*) as total_purchases,
        SUM(Total_Cost) as total_spent
      FROM Purchase
      WHERE Supplier_ID = ? AND Status = 'Completed'
    `, [req.params.id]);
    
    res.json({ 
      success: true, 
      data: {
        supplier: suppliers[0],
        recentPurchases: purchases,
        statistics: stats[0]
      }
    });
  } catch (error) {
    console.error('Error fetching supplier:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch supplier',
      error: error.message 
    });
  }
};

// Create new supplier
const createSupplier = async (req, res) => {
  try {
    const { Name, Contact, Phone, Email, Address } = req.body;
    
    // Validation
    if (!Name || !Contact || !Address) {
      return res.status(400).json({ 
        success: false, 
        message: 'Name, contact person, and address are required' 
      });
    }

    // Check if supplier name already exists
    const existingSuppliers = await query(
      'SELECT Supplier_ID FROM Supplier WHERE Name = ?',
      [Name]
    );
    
    if (existingSuppliers.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Supplier with this name already exists' 
      });
    }

    const result = await query(`
      INSERT INTO Supplier (Name, Contact, Phone, Email, Address)
      VALUES (?, ?, ?, ?, ?)
    `, [Name, Contact, Phone || null, Email || null, Address]);
    
    res.status(201).json({ 
      success: true, 
      message: 'Supplier created successfully',
      data: { 
        Supplier_ID: result.insertId,
        Name 
      }
    });
  } catch (error) {
    console.error('Error creating supplier:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to create supplier',
      error: error.message 
    });
  }
};

// Update supplier
const updateSupplier = async (req, res) => {
  try {
    const { Name, Contact, Phone, Email, Address } = req.body;
    
    // Validation
    if (!Name || !Contact || !Address) {
      return res.status(400).json({ 
        success: false, 
        message: 'Name, contact person, and address are required' 
      });
    }

    // Check if new name conflicts with existing supplier
    const existingSuppliers = await query(
      'SELECT Supplier_ID FROM Supplier WHERE Name = ? AND Supplier_ID != ?',
      [Name, req.params.id]
    );
    
    if (existingSuppliers.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Supplier with this name already exists' 
      });
    }

    const result = await query(`
      UPDATE Supplier 
      SET Name = ?, Contact = ?, Phone = ?, Email = ?, Address = ?
      WHERE Supplier_ID = ?
    `, [Name, Contact, Phone, Email, Address, req.params.id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Supplier not found' 
      });
    }
    
    res.json({ 
      success: true, 
      message: 'Supplier updated successfully' 
    });
  } catch (error) {
    console.error('Error updating supplier:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update supplier',
      error: error.message 
    });
  }
};

// Delete supplier
const deleteSupplier = async (req, res) => {
  try {
    // Check if supplier has purchases
    const purchases = await query(
      'SELECT COUNT(*) as count FROM Purchase WHERE Supplier_ID = ?',
      [req.params.id]
    );
    
    if (purchases[0].count > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot delete supplier with existing purchases' 
      });
    }

    const result = await query(
      'DELETE FROM Supplier WHERE Supplier_ID = ?',
      [req.params.id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Supplier not found' 
      });
    }
    
    res.json({ 
      success: true, 
      message: 'Supplier deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting supplier:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete supplier',
      error: error.message 
    });
  }
};

// Search suppliers
const searchSuppliers = async (req, res) => {
  try {
    const searchTerm = req.params.query;
    
    const suppliers = await query(`
      SELECT * FROM Supplier
      WHERE 
        Name LIKE ? OR 
        Contact LIKE ? OR
        Phone LIKE ? OR
        Email LIKE ?
      ORDER BY Name
    `, [
      `%${searchTerm}%`, 
      `%${searchTerm}%`,
      `%${searchTerm}%`,
      `%${searchTerm}%`
    ]);
    
    res.json({ 
      success: true,
      count: suppliers.length,
      data: suppliers 
    });
  } catch (error) {
    console.error('Error searching suppliers:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Search failed',
      error: error.message 
    });
  }
};

module.exports = {
  getAllSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  searchSuppliers
};