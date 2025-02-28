const express = require("express");
const router = express.Router();
const pool = require("../db");

router.get("/view", async (req, res) => {
  console.log("User view request received");
  try {
    const allData = await pool.query("SELECT * FROM data");
    res.json(allData.rows);
  } catch (err) {
    console.error("User view error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
