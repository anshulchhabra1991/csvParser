const assert = require('assert');
const request = require('supertest');
const app = require('../app.js');
const fs = require('fs');
const path = require('path');
const httpMocks = require('node-mocks-http');
const csv = require('csv-parser');
const axios = require('axios');
const {parseCSVAndDownloadImages, validateFile, parseCSV, downloadImages, isValidImageExtension, hashUrl, getImageNameFromUrl } = require('../controllers/parseCSV'); // Adjust path if needed

jest.mock('axios');
jest.mock('fs');


describe('GET /', function() {
  it('should render index.pug', function(done) {
    request(app)
      .get('/')
      .expect('Content-Type', /html/)
      .expect(200)
      .end(function(err, res) {
        if (err) return done(err);
        assert(res.text.includes('<p>Welcome to App</p>'));
        done();
      });
  });
});


// Sample CSV data
const sampleCSVData = `
sku,Image 1,Image 2,Image 3,Image 4,Image 5
1,http://example.com/img1.jpg,http://example.com/img2.jpg,,,,,
2,http://example.com/img3.jpg,http://example.com/img4.jpg,,,,,
`;

// Prepare mock file path
const mockCSVFilePath = path.join(__dirname, 'sample.csv');
fs.writeFileSync(mockCSVFilePath, sampleCSVData);

describe('parseCSVAndDownloadImages', () => {

    test('should reject non-CSV files', async () => {
        const req = httpMocks.createRequest({
            file: { mimetype: 'application/json', size: 1024 * 1024 },
        });
        const res = httpMocks.createResponse();

        await parseCSVAndDownloadImages(req, res);

        expect(res.statusCode).toBe(400);
        expect(res._getData()).toEqual(expect.stringContaining('Only CSV files are allowed'));
    });

    test('should reject files larger than the maximum allowed size', async () => {
        const req = httpMocks.createRequest({
            file: { mimetype: 'text/csv', size: 15 * 1024 * 1024 }, // 15MB
        });
        const res = httpMocks.createResponse();

        await parseCSVAndDownloadImages(req, res);

        expect(res.statusCode).toBe(400);
        expect(res._getData()).toEqual(expect.stringContaining('File size exceeds'));
    });

    test('should reject CSV files with missing required columns', async () => {
        const invalidCSVData = `
            sku,Image 1,Image 2
            1,http://example.com/img1.jpg,http://example.com/img2.jpg
        `;
        fs.writeFileSync(mockCSVFilePath, invalidCSVData);
        const req = httpMocks.createRequest({
            file: { path: mockCSVFilePath },
        });
        const res = httpMocks.createResponse();

        await parseCSVAndDownloadImages(req, res);

        expect(res.statusCode).toBe(400);
        expect(res._getData()).toEqual(expect.stringContaining('Invalid CSV format. Missing required columns.'));
    });

    test('should process CSV and download valid image URLs', async () => {
        const req = httpMocks.createRequest({
            file: { path: mockCSVFilePath },
        });
        const res = httpMocks.createResponse();

        axios.mockResolvedValue({ status: 200 });

        await parseCSVAndDownloadImages(req, res);

        expect(res.statusCode).toBe(200);
        expect(res._getData()).toEqual(expect.stringContaining('Processed 4 images successfully'));
    });

    test('should handle invalid image extensions gracefully', async () => {
        const invalidCSVData = `
            sku,Image 1,Image 2,Image 3,Image 4,Image 5
            1,http://example.com/img1.invalid,http://example.com/img2.jpg,,,,,
            2,http://example.com/img3.jpg,http://example.com/img4.invalid,,,,,
        `;
        fs.writeFileSync(mockCSVFilePath, invalidCSVData);
        const req = httpMocks.createRequest({
            file: { path: mockCSVFilePath },
        });
        const res = httpMocks.createResponse();

        axios.mockResolvedValue({ status: 200 });

        await parseCSVAndDownloadImages(req, res);

        expect(res.statusCode).toBe(200);
        expect(res._getData()).toEqual(expect.stringContaining('Processed 2 images successfully'));
    });

    test('should reject CSV with more than allowed unique image URLs', async () => {
        const excessiveCSVData = `
            sku,Image 1,Image 2,Image 3,Image 4,Image 5
            1,http://example.com/img1.jpg,http://example.com/img2.jpg,http://example.com/img3.jpg,http://example.com/img4.jpg,http://example.com/img5.jpg
            2,http://example.com/img6.jpg,http://example.com/img7.jpg,http://example.com/img8.jpg,http://example.com/img9.jpg,http://example.com/img10.jpg
        `;
        fs.writeFileSync(mockCSVFilePath, excessiveCSVData);
        const req = httpMocks.createRequest({
            file: { path: mockCSVFilePath },
        });
        const res = httpMocks.createResponse();

        await parseCSVAndDownloadImages(req, res);

        expect(res.statusCode).toBe(400);
        expect(res._getData()).toEqual(expect.stringContaining('CSV contains more than the allowed'));
    });

    test('should correctly handle image URL extraction and validation', () => {
        const csvRow = {
            sku: '123',
            'Image 1': 'http://example.com/img1.jpg',
            'Image 2': 'http://example.com/img2.jpg',
            'Image 3': 'http://example.com/img3.gif',
            'Image 4': '',
            'Image 5': '',
        };

        const imageUrls = REQUIRED_COLUMNS.slice(1).map((key) => csvRow[key]).filter(url => url);

        const validImageUrls = [];
        const invalidImageUrls = [];

        imageUrls.forEach((url) => {
            if (isValidImageExtension(url)) {
                validImageUrls.push(url);
            } else {
                invalidImageUrls.push(url);
            }
        });

        expect(validImageUrls.length).toBe(3);
        expect(invalidImageUrls.length).toBe(0);
    });

    test('getImageNameFromUrl should return correct image name', () => {
        const url = 'http://example.com/path/to/image/img1.jpg';
        const imageName = getImageNameFromUrl(url);

        expect(imageName).toBe('img1');
    });

    test('hashUrl should return consistent hash for the same URL', () => {
        const url = 'http://example.com/img1.jpg';
        const hash = hashUrl(url);

        expect(hash).toBe('56d3574fe10f36da29b495c8e4ec7c8cd7bdf93709f1b9a0c8fae988b207d5db'); // Example hash, adjust if needed
    });
});
