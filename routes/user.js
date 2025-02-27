const express = require("express");
const router = express.Router();
const pool = require("../db");

router.get("/view", async (req, res) => {
  try {
    const allData = await pool.query("SELECT * FROM data");
    res.json(allData.rows);
  } catch (err) {
    console.error(err.message);
  }
});

module.exports = router;