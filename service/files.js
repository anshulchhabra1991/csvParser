var express = require('express');
var router = express.Router();

router.post('/upload', (req, res) => {
        const { successCount, errorList } = req.downloadResult;
        res.json({
            success: true,
            message: `Processed ${successCount} images successfully`,
            errors: errorList,
        });
    }
);
