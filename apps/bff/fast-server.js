const express = require("express");
const cors = require("cors");
const app = express();
const PORT = 3002;

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => { 
  res.json({ status: "healthy", timestamp: new Date().toISOString() }); 
});

app.get("/api/metrics", (req, res) => { 
  res.json({ success: true, data: { itemsCount: 5, accountsCount: 25, bankAccountsCount: 3, customersCount: 8, vendorsCount: 12 } }); 
});

app.get("/api/items", (req, res) => { 
  res.json({ success: true, data: [{ id: "1", name: "Test Item", sku: "TI001", type: "goods", costPrice: 25.50, sellingPrice: 39.99, currency: "USD", stockOnHand: 100, salesAccount: { code: "4000", name: "Sales" }, purchaseAccount: { code: "5000", name: "COGS" } }] }); 
});

app.get("/api/accounts", (req, res) => { 
  res.json({ success: true, data: [{ id: "1", name: "Cash", code: "1000", type: "asset" }] }); 
});

// Customer routes - specific ID route must come before general route
app.get("/api/customers/:id", (req, res) => { 
  const customer = { 
    id: req.params.id, 
    name: "Test Customer " + req.params.id, 
    email: "test" + req.params.id + "@example.com",
    customerType: "business",
    priority: "normal",
    currency: "USD",
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }; 
  res.json({ success: true, data: customer }); 
});

app.get("/api/customers", (req, res) => { 
  res.json({ success: true, data: [{ id: "1", name: "Test Customer", email: "test@example.com" }] }); 
});

app.post("/api/customers", (req, res) => { 
  const customer = { 
    id: Date.now().toString(), 
    ...req.body, 
    createdAt: new Date().toISOString(), 
    updatedAt: new Date().toISOString() 
  }; 
  res.json({ success: true, data: customer }); 
});

app.put("/api/customers/:id", (req, res) => { 
  const customer = { 
    id: req.params.id, 
    ...req.body, 
    updatedAt: new Date().toISOString() 
  }; 
  res.json({ success: true, data: customer }); 
});

app.delete("/api/customers/:id", (req, res) => { 
  res.json({ success: true, message: "Customer deleted successfully" }); 
});

app.get("/api/bank-accounts", (req, res) => { 
  res.json({ success: true, data: [{ id: "1", name: "Main Account", accountNumber: "1234567890" }] }); 
});

app.post("/auth/login", (req, res) => { 
  res.json({ success: true, token: "test-token-123", user: { id: "1", email: "test@example.com" } }); 
});

app.post("/auth/register", (req, res) => { 
  res.json({ success: true, token: "test-token-123", user: { id: "1", email: "test@example.com" } }); 
});

app.listen(PORT, () => { 
  console.log("Fast server running on port", PORT); 
});
