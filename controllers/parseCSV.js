const fs = require('fs');
const csv = require('csv-parser');
const axios = require('axios');
const path = require('path');
const crypto = require('crypto');

const REQUIRED_COLUMNS = ['sku', 'Image 1', 'Image 2', 'Image 3', 'Image 4', 'Image 5'];
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_ROW_COUNT = 1000;
const MAX_IMAGE_BATCH = 50;
const MAX_UNIQUE_IMAGES = 5000;
const DOWNLOAD_DIR = path.join(process.cwd(), './downloads');
const VALID_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff'];


const validateFile = (file) => {
    if (!file.mimetype || file.mimetype !== 'text/csv') {
        throw new Error('Only CSV files are allowed');
    }

    if (file.size > MAX_FILE_SIZE) {
        throw new Error(`File size exceeds the ${MAX_FILE_SIZE / (1024 * 1024)}MB limit`);
    }
};

const getImageNameFromUrl = (url) => {
    const urlPath = new URL(url).pathname;
    const nameWithExtension = path.basename(urlPath);
    return path.parse(nameWithExtension).name;
};

const parseCSV = async (filePath) => {
    const rows = [];

    return new Promise((resolve, reject) => {
        fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', (row) => {
                rows.push(row);
            })
            .on('end', () => {
                if (rows.length > MAX_ROW_COUNT) {
                    return reject(new Error(`CSV contains more than the allowed ${MAX_ROW_COUNT} rows.`));
                }

                const csvColumns = Object.keys(rows[0] || {});
                if (!REQUIRED_COLUMNS.every(col => csvColumns.includes(col))) {
                    return reject(new Error('Invalid CSV format. Missing required columns.'));
                }
                resolve(rows);
            })
            .on('error', (error) => reject(error));
    });
};

const hashUrl = (url) => crypto.createHash('sha256').update(url).digest('hex');


const isValidImageExtension = (url) => {
    const extname = path.extname(url).toLowerCase();
    return VALID_IMAGE_EXTENSIONS.includes(extname);
};

const downloadImages = async (imageUrls) => {
    await fs.promises.mkdir(DOWNLOAD_DIR, { recursive: true });

    const successful = [];
    const failed = [];

    const downloadImage = async (url, filename) => {
        try {
            const response = await axios({
                method: 'GET',
                url,
                responseType: 'stream',
            });

            const filePath = path.join(DOWNLOAD_DIR, filename);
            const writer = fs.createWriteStream(filePath);
            response.data.pipe(writer);

            await new Promise((resolve, reject) => {
                writer.on('finish', resolve);
                writer.on('error', reject);
            });

            successful.push(url);
        } catch (error) {
            if (url && !failed.some(failure => failure.url === url)) {
                failed.push(url);
            }
        }
    };

    for (let i = 0; i < imageUrls.length; i += MAX_IMAGE_BATCH) {
        const batch = imageUrls.slice(i, i + MAX_IMAGE_BATCH);

        await Promise.all(batch.map((url, index) => {
            const imageName = getImageNameFromUrl(url);
            const timestamp = new Date().toISOString().replace(/[-:.]/g, '');
            const filename = `${imageName}${path.extname(url)}_${timestamp}`;
            return downloadImage(url, filename).catch((error) => {
                return { url, error: error.message };
            });
        }));
    }

    return { successful, failed };
};

const parseCSVAndDownloadImages = async (req, res) => {
    try {
        const { file } = req;

        if (!file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }

        validateFile(file);

        const rows = await parseCSV(file.path);
        const imageUrls = rows.flatMap(row =>
            REQUIRED_COLUMNS.slice(1).map(key => row[key]).filter(url => url)
        );

        const uniqueImageHashes = new Set(imageUrls.map(hashUrl));
        if (uniqueImageHashes.size > MAX_UNIQUE_IMAGES) {
            return res.status(400).json({
                success: false,
                message: `CSV contains more than the allowed ${MAX_UNIQUE_IMAGES} unique image URLs.`,
            });
        }

        const validImageUrls = [];
        const invalidImageUrls = [];

        imageUrls.forEach((url) => {
            if (isValidImageExtension(url)) {
                validImageUrls.push(url);
            } else {
                invalidImageUrls.push(url);
            }
        });

        const results = await downloadImages(validImageUrls);
        results.failed.push(...invalidImageUrls);

        res.status(200).json({
            success: true,
            message: `Processed ${results.successful.length} images successfully`,
            errors: results.failed.map(fail => `Failed to download image: ${fail}`),
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = { parseCSVAndDownloadImages };
