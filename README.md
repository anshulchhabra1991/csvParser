
# CSV Image URL Processor

This Node.js project allows you to process CSV files containing image URLs, validate the URLs, and download the images to your local file system. The images are saved with unique names and timestamps, ensuring no conflicts.


## Features
- Validates the CSV file format and ensures it contains the required columns.
- Downloads images from valid URLs listed in the CSV.
- Supports concurrent image downloads in batches for efficiency.
- Handles CSV rows up to a maximum count of 1000.
- Ensures that only images with valid extensions (.jpg, .jpeg, .png, .gif, .bmp, .tiff) are downloaded.
- Saves images with unique filenames, adding timestamps to avoid conflicts.
- Handles errors gracefully and provides a detailed log of failures.

## Prerequisites

Before running the project, ensure you have the following:

- **Node.js** installed (v12 or higher recommended).
- **npm** (Node Package Manager) or **yarn** for managing dependencies.

## Curl request
```
curl --location 'http://localhost:3000/files/upload' \
--form 'file=@"/Users/anshulchhabra/Downloads/anshul_accessKeys.csv"'
```

## Sample CSV
```
sku,Image 1,Image 2,Image 3,Image 4,Image 5
item2,https://example.com/image3.jpg,,https://via.placeholder.com/150,,
item3,https://example.com/image2.jpg,,,https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf,
item4,https://example.com/image3.jpg,,https://images.unsplash.com/photo-1600382960319-b65846fe4366,,
item5,https://example.com/image4.jpg,https://images.pexels.com/photos/1061589/pexels-photo-1061589.jpeg,https://via.placeholder.com/150,https://picsum.photos/200/300,
item1,https://cfn-catalog-prod.tradeling.com/up/65f2cf756aad860f7a264659/db6c3700092f7d71186c67213643e3fc.jpg,https://cfn-catalog-prod.tradeling.com/up/65f2cf756aad860f7a264659/fd61bd8156556772a7146c1c167c4fd4.jpg,,,,https://cfn-catalog-prod.tradeling.com/up/65f2cf756aad860f7a264659/fd61bd8156556772a7146c1c167c4fd4.sdfgjpg,
```

