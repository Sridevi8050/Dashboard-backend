const express = require("express");
const router = express.Router();
const pool = require("../db");

router.post("/create", async (req, res) => {
  console.log("Create request received:", req.body);
  try {
    const { title, description } = req.body;
    if (!title || !description) {
      return res.status(400).json({ error: "Title and description are required" });
    }
    
    const newData = await pool.query(
      "INSERT INTO data (title, description) VALUES ($1, $2) RETURNING *", 
      [title, description]
    );
    
    res.status(201).json(newData.rows[0]);
  } catch (err) {
    console.error("Create error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get("/read", async (req, res) => {
  console.log("Read request received");
  try {
    const allData = await pool.query("SELECT * FROM data");
    res.json(allData.rows);
  } catch (err) {
    console.error("Read error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

router.put("/update/:id", async (req, res) => {
  console.log("Update request received for id:", req.params.id);
  try {
    const { id } = req.params;
    const { title, description } = req.body;
    
    if (!title || !description) {
      return res.status(400).json({ error: "Title and description are required" });
    }
    
    const result = await pool.query(
      "UPDATE data SET title = $1, description = $2 WHERE id = $3 RETURNING *", 
      [title, description, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Data not found" });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Update error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

router.delete("/delete/:id", async (req, res) => {
  console.log("Delete request received for id:", req.params.id);
  try {
    const { id } = req.params;
    const result = await pool.query("DELETE FROM data WHERE id = $1 RETURNING *", [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Data not found" });
    }
    
    res.json({ message: "Data deleted", deleted: result.rows[0] });
  } catch (err) {
    console.error("Delete error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
