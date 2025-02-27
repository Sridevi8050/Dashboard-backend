const express = require("express");
const router = express.Router();
const pool = require("../db");

router.post("/create", async (req, res) => {
  try {
    const { title, description } = req.body;
    const newData = await pool.query("INSERT INTO data (title, description) VALUES ($1, $2) RETURNING *", [title, description]);
    res.json(newData.rows[0]);
  } catch (err) {
    console.error(err.message);
  }
});

router.get("/read", async (req, res) => {
  try {
    const allData = await pool.query("SELECT * FROM data");
    res.json(allData.rows);
  } catch (err) {
    console.error(err.message);
  }
});

router.put("/update/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description } = req.body;
    await pool.query("UPDATE data SET title = $1, description = $2 WHERE id = $3", [title, description, id]);
    res.json("Data Updated");
  } catch (err) {
    console.error(err.message);
  }
});

router.delete("/delete/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM data WHERE id = $1", [id]);
    res.json("Data Deleted");
  } catch (err) {
    console.error(err.message);
  }
});

module.exports = router;