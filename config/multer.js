const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({

    destination: (req, file, cb) => {
        req.session.Admin=true;
        cb(null, "uploads");  
    },
    filename: (req, file, cb) => {
        console.log('......................kittando...................................................');
        const name = path.parse(file.originalname).name;
        console.log("nnnname",name); // Get the original file name without extension
        console.log("parse",path.parse(file.originalname)); 
        cb(null, `${Date.now()}-${name}.jpg`); // Save all files with a .jpg extension
    }
});

// const upload = multer({ storage: storage });
// module.exports = upload;

const upload = multer({ 
    storage: storage,
    fileFilter: (req, file, cb) => {
      // Optional: Add file type validation
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Not an image! Please upload an image.'), false);
      }
    }
  });

module.exports = upload;
