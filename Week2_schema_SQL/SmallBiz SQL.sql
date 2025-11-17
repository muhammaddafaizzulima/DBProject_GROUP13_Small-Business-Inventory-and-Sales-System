CREATE TABLE Category
(
  Category_ID INT NOT NULL AUTO_INCREMENT,
  Category_Name VARCHAR(100) NOT NULL,
  PRIMARY KEY (Category_ID)
);

CREATE TABLE Customer
(
  Customer_ID INT NOT NULL AUTO_INCREMENT,
  Name VARCHAR(100),
  Phone INT,
  Email VARCHAR(100),
  Address VARCHAR(500),
  PRIMARY KEY (Customer_ID)
);

CREATE TABLE User
(
  User_ID INT NOT NULL AUTO_INCREMENT,
  Username VARCHAR(50) NOT NULL,
  Password VARCHAR(15) NOT NULL,
  Role VARCHAR(20) NOT NULL,
  PRIMARY KEY (User_ID),
  UNIQUE (Username)
);

CREATE TABLE Transaction
(
  Transaction_ID INT NOT NULL AUTO_INCREMENT,
  Date DATE NOT NULL,
  Total_Amount INT NOT NULL,
  Customer_ID INT NOT NULL,
  User_ID INT NOT NULL,
  PRIMARY KEY (Transaction_ID),
  FOREIGN KEY (Customer_ID) REFERENCES Customer(Customer_ID),
  FOREIGN KEY (User_ID) REFERENCES User(User_ID)
);

CREATE TABLE Supplier
(
  Supplier_ID INT NOT NULL AUTO_INCREMENT,
  Name VARCHAR(100) NOT NULL,
  Contact VARCHAR(100) NOT NULL,
  Address VARCHAR(500) NOT NULL,
  PRIMARY KEY (Supplier_ID)
);

CREATE TABLE Purchase
(
  Purchase_ID INT NOT NULL AUTO_INCREMENT,
  Date DATE NOT NULL,
  Total_Cost INT NOT NULL,
  Supplier_ID INT NOT NULL,
  User_ID INT NOT NULL,
  PRIMARY KEY (Purchase_ID),
  FOREIGN KEY (Supplier_ID) REFERENCES Supplier(Supplier_ID),
  FOREIGN KEY (User_ID) REFERENCES User(User_ID)
);

CREATE TABLE Products
(
  Product_ID INT NOT NULL AUTO_INCREMENT,
  Product_Name VARCHAR(100) NOT NULL,
  Price INT NOT NULL,
  Stock_Quantity FLOAT NOT NULL,
  Description VARCHAR(500),
  Category_ID INT NOT NULL,
  PRIMARY KEY (Product_ID),
  FOREIGN KEY (Category_ID) REFERENCES Category(Category_ID)
);

CREATE TABLE Transaction_Detail
(
  Quantity FLOAT NOT NULL,
  Subtotal INT NOT NULL,
  Unit_Price INT NOT NULL,
  Product_ID INT NOT NULL,
  Transaction_ID INT NOT NULL,
  FOREIGN KEY (Product_ID) REFERENCES Products(Product_ID),
  FOREIGN KEY (Transaction_ID) REFERENCES Transaction(Transaction_ID)
);

CREATE TABLE Purchase_Detail
(
  Quantity FLOAT NOT NULL,
  Unit_Cost INT NOT NULL,
  SubTotal INT NOT NULL,
  Purchase_ID INT NOT NULL,
  Product_ID INT NOT NULL,
  FOREIGN KEY (Purchase_ID) REFERENCES Purchase(Purchase_ID),
  FOREIGN KEY (Product_ID) REFERENCES Products(Product_ID)
);
