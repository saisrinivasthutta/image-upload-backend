const express = require("express");
const multer = require("multer");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const cors = require("cors");
const fs = require("fs");

const app = express();

app.use(express.json());
app.use(
  cors({
    origin: "*",
  })
);

const db = new sqlite3.Database("./images.db");

// Set up multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "./uploads"); // Save files in the 'uploads' directory
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // Give a unique name to each file
  },
});

const upload = multer({ storage });

// Create images table if not exists
db.run(`
  CREATE TABLE IF NOT EXISTS images (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT,
    filepath TEXT,
    uploaded_at TEXT
  )
`);

// Route to handle multiple image uploads
app.post("/upload", upload.array("images", 10), (req, res) => {
  if (!req.files) {
    return res.status(400).send("No files uploaded");
  }

  const uploadedFiles = req.files.map((file) => ({
    filename: file.filename,
    filepath: file.path,
    uploaded_at: new Date().toISOString(),
  }));

  // Insert each image file into the database
  const placeholders = uploadedFiles.map(() => "(?, ?, ?)").join(", ");
  const values = uploadedFiles.reduce(
    (acc, file) => [...acc, file.filename, file.filepath, file.uploaded_at],
    []
  );
  db.run(
    `INSERT INTO images (filename, filepath, uploaded_at) VALUES ${placeholders}`,
    values,
    function (err) {
      if (err) {
        console.error(err);
        return res.status(500).send("Error saving images to the database");
      }

      res.json({
        message: "Images uploaded successfully!",
        uploadedImages: uploadedFiles,
      });
    }
  );
});

// Route to get all images
app.get("/images", (req, res) => {
  const sql = "SELECT * FROM images";
  db.all(sql, [], (err, rows) => {
    if (err) {
      return res.status(500).send({ error: err.message });
    }
    res.send({
      images: rows,
    });
  });
});

// Serve the uploads folder statically to access the images
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.listen(5000, () => {
  console.log("Server is running on http://localhost:5000");
});
