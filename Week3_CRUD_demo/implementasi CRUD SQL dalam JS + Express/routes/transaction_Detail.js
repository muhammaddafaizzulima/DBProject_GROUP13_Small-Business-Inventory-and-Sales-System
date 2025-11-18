const express = require('express');
const router = express.Router();
const db = require('../db');

// CREATE detail
router.post('/', (req, res) => {
  const { Quantity, Subtotal, Unit_Price, Product_ID, Transaction_ID } = req.body;

  const query = `
    INSERT INTO transaction_detail 
    (Quantity, Subtotal, Unit_Price, Product_ID, Transaction_ID)
    VALUES (?, ?, ?, ?, ?)
  `;

  db.query(query, [Quantity, Subtotal, Unit_Price, Product_ID, Transaction_ID], (err, result) => {
    if (err) return res.status(500).json({ error: err });
    res.json({ message: "Transaction detail added" });
  });
});

// READ all
router.get('/', (req, res) => {
  db.query("SELECT * FROM transaction_detail", (err, results) => {
    if (err) return res.status(500).json({ error: err });
    res.json(results);
  });
});

// READ by transaction ID
router.get('/:id', (req, res) => {
  db.query(
    "SELECT * FROM transaction_detail WHERE Transaction_ID = ?",
    [req.params.id],
    (err, results) => {
      if (err) return res.status(500).json({ error: err });
      res.json(results);
    }
  );
});

// DELETE detail
router.delete('/:id/:product', (req, res) => {
  db.query(
    "DELETE FROM transaction_detail WHERE Transaction_ID = ? AND Product_ID = ?",
    [req.params.id, req.params.product],
    (err) => {
      if (err) return res.status(500).json({ error: err });
      res.json({ message: "Transaction detail deleted" });
    }
  );
});

module.exports = router;
