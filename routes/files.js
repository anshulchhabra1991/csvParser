const express = require('express');
const multer = require("multer");
const { join } = require("path");
const { parseCSVAndDownloadImages } = require("../controllers/parseCSV");

const router = express.Router();

const upload = multer({dest: join(__dirname, 'uploads/')});

router.post('/upload', upload.single('file'), parseCSVAndDownloadImages);

module.exports = router;
