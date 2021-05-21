CREATE TABLE Transactions (
  transactionID BIGSERIAL NOT NULL PRIMARY KEY,
  walletID BIGSERIAL NOT NULL,
  concept varchar(255) NOT NULL,
  amount DECIMAL NOT NULL DEFAULT 0,
  createdAt date NOT NULL DEFAULT NOW(),
  transactionDate date NOT NULL DEFAULT NOW()
)