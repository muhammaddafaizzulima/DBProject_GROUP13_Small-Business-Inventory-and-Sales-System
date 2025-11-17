-- [Tabel: Category]
-- CREATE
INSERT INTO Category (Category_Name)
VALUES ('Electronics');

-- READ
SELECT * FROM Category;

-- UPDATE
UPDATE Category
SET Category_Name = 'Home Electronics'
WHERE Category_ID = 1;

-- DELETE
DELETE FROM Category
WHERE Category_ID = 1;




-- [Tabel: Customer]
-- CREATE
INSERT INTO Customer (Name, Phone, Email, Address)
VALUES ('John Doe', 8123456, 'john@mail.com', 'Jakarta');

-- READ
SELECT * FROM Customer;

-- UPDATE
UPDATE Customer
SET Phone = 81234999, Address = 'Bandung'
WHERE Customer_ID = 1;

-- DELETE
DELETE FROM Customer
WHERE Customer_ID = 1;




-- [Tabel: User]
-- CREATE
INSERT INTO User (Username, Password, Role)
VALUES ('admin1', 'admin123', 'Admin');

-- READ
SELECT * FROM User;

-- UPDATE
UPDATE User
SET Password = 'newpass123'
WHERE User_ID = 1;

-- DELETE
DELETE FROM User
WHERE User_ID = 1;




-- [Tabel: Transaction}
-- CREATE
INSERT INTO Transaction (Date, Total_Amount, Customer_ID, User_ID)
VALUES ('2025-01-01', 150000, 1, 1);

-- READ
SELECT * FROM Transaction;

-- UPDATE
UPDATE Transaction
SET Total_Amount = 200000
WHERE Transaction_ID = 1;

-- DELETE
DELETE FROM Transaction
WHERE Transaction_ID = 1;




-- [Tabel: Supplier]
-- CREATE
INSERT INTO Supplier (Name, Contact, Address)
VALUES ('PT Maju Jaya', '0812345678', 'Surabaya');

-- READ
SELECT * FROM Supplier;

-- UPDATE
UPDATE Supplier
SET Contact = '0899999999'
WHERE Supplier_ID = 1;

-- DELETE
DELETE FROM Supplier
WHERE Supplier_ID = 1;




-- [Tabel: Purchase]
-- CREATE
INSERT INTO Purchase (Date, Total_Cost, Supplier_ID, User_ID)
VALUES ('2025-01-01', 500000, 1, 1);

-- READ
SELECT * FROM Purchase;

-- UPDATE
UPDATE Purchase
SET Total_Cost = 600000
WHERE Purchase_ID = 1;

-- DELETE
DELETE FROM Purchase
WHERE Purchase_ID = 1;




-- [Tabel: Products]
-- CREATE
INSERT INTO Products (Product_Name, Price, Stock_Quantity, Description, Category_ID)
VALUES ('Laptop', 7000000, 10, 'Ultrabook', 1);

-- READ
SELECT * FROM Products;

-- UPDATE
UPDATE Products
SET Price = 7500000, Stock_Quantity = 12
WHERE Product_ID = 1;

-- DELETE
DELETE FROM Products
WHERE Product_ID = 1;




-- [Tabel: Transaction_Detail]
-- CREATE
INSERT INTO Transaction_Detail (Quantity, Subtotal, Unit_Price, Product_ID, Transaction_ID)
VALUES (2, 14000000, 7000000, 1, 1);

-- READ
SELECT * FROM Transaction_Detail;

-- UPDATE
UPDATE Transaction_Detail
SET Quantity = 3, Subtotal = 21000000
WHERE Product_ID = 1 AND Transaction_ID = 1;

-- DELETE
DELETE FROM Transaction_Detail
WHERE Product_ID = 1 AND Transaction_ID = 1;




-- Tabel: [Purchase_Detail]
-- CREATE
INSERT INTO Purchase_Detail (Quantity, Unit_Cost, SubTotal, Purchase_ID, Product_ID)
VALUES (5, 1000000, 5000000, 1, 1);

-- READ
SELECT * FROM Purchase_Detail;

-- UPDATE
UPDATE Purchase_Detail
SET Quantity = 6, SubTotal = 6000000
WHERE Purchase_ID = 1 AND Product_ID = 1;

-- DELETE
DELETE FROM Purchase_Detail
WHERE Purchase_ID = 1 AND Product_ID = 1;
