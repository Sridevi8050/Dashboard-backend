require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { Pool } = require("pg");
const adminRoutes = require("./routes/admin");
const userRoutes = require("./routes/user");

const app = express();
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

app.use(cors());
app.use(express.json());

const generateToken = (user) => {
  return jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET || "your_jwt_secret_fallback", {
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
    
    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const result = await pool.query(
        "INSERT INTO users (username, email, password, role) VALUES ($1, $2, $3, $4) RETURNING *",
        [username, email, hashedPassword, role]
      );
      res.status(201).json({ message: "User registered", user: result.rows[0] });
    } catch (err) {
      console.error("Registration error:", err);
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
      
      // Generate and return token
      const token = generateToken(user);
      res.status(200).json({ 
        message: "Login successful", 
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role
        }, 
        token 
      });
    } catch (err) {
      console.error("Login error:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
});

// Middleware to verify JWT and role
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    console.log("No token provided");
    return res.status(403).json({ error: "Access denied" });
  }
  
  // Extract the token from the Authorization header
  const token = authHeader.startsWith('Bearer ') ? 
    authHeader.substring(7, authHeader.length) : authHeader;
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "your_jwt_secret_fallback");
    req.user = decoded;
    console.log("Authenticated user:", decoded);
    next();
  } catch (err) {
    console.error("Token verification error:", err);
    res.status(401).json({ error: "Invalid token" });
  }
};

// Apply routes with middlewares
app.use("/admin", authenticate, adminRoutes);
app.use("/user", userRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
