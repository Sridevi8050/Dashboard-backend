
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { Pool } = require("pg");
// const pool = require("./db");
const adminRoutes = require("./routes/admin");  // Ensure this line is present
const userRoutes = require("./routes/user");

const app = express();
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
  max: 20, // You can adjust the max number of connections if needed
  idleTimeoutMillis: 30000, // Timeout after 30 seconds if no activity
  connectionTimeoutMillis: 2000, // Timeout after 2 seconds if unable to connect
});


app.use(cors());
app.use(express.json());
app.use("/admin", adminRoutes); // Ensure this is correct
app.use("/user", userRoutes);

const generateToken = (user) => {
  return jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: "1h",
  });
};

pool.query("SELECT NOW()", (err, res) => {
    if (err) {
      console.error("❌ Database connection error:", err);
    } else {
      console.log("✅ Connected to PostgreSQL at:", res.rows[0].now);
    }
});

app.post("/register", async (req, res) => {
    const { username, email, password, role } = req.body;
    if (!username || !email || !password || !role) {
      return res.status(400).json({ error: "All fields are required" });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    try {
      const result = await pool.query(
        "INSERT INTO users (username, email, password, role) VALUES ($1, $2, $3, $4) RETURNING *",
        [username, email, hashedPassword, role]
      );
      res.status(201).json({ message: "User registered", user: result.rows[0] });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
});

app.post("/login", async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "All fields are required" });
    }
    try {
      const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
      if (result.rows.length === 0) {
        return res.status(401).json({ error: "Invalid email or password" });
      }
      const user = result.rows[0];
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ error: "Invalid email or password" });
      }
      res.status(200).json({ message: "Login successful", user });
    } catch (err) {
      res.status(500).json({ error: "Internal Server Error" });
    }
});

// Middleware to verify JWT and role
const authenticate = (req, res, next) => {
  const token = req.headers.authorization;
  if (!token) return res.status(403).json({ error: "Access denied" });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
};

// Admin CRUD operations
app.post("/admin/data", authenticate, async (req, res) => {
  if (req.user.role !== "admin") return res.status(403).json({ error: "Unauthorized" });
  const { title, description } = req.body;
  try {
    const result = await pool.query("INSERT INTO data (title, description) VALUES ($1, $2) RETURNING *", [title, description]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/admin/data", authenticate, async (req, res) => {
  if (req.user.role !== "admin") return res.status(403).json({ error: "Unauthorized" });
  try {
    const result = await pool.query("SELECT * FROM data");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/admin/data/:id", authenticate, async (req, res) => {
  if (req.user.role !== "admin") return res.status(403).json({ error: "Unauthorized" });
  const { title, description } = req.body;
  try {
    const result = await pool.query("UPDATE data SET title = $1, description = $2 WHERE id = $3 RETURNING *", [title, description, req.params.id]);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/admin/data/:id", authenticate, async (req, res) => {
  if (req.user.role !== "admin") return res.status(403).json({ error: "Unauthorized" });
  try {
    await pool.query("DELETE FROM data WHERE id = $1", [req.params.id]);
    res.json({ message: "Deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// User data retrieval
app.get("/user/data", authenticate, async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM data");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
