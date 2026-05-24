const multer = require('multer');
const path = require('path');

// 1. Photo kahan aur kis naam se save karni hai?
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/'); // Hostinger pe bhi yehi 'uploads' folder kaam aayega
    },
    filename: function (req, file, cb) {
        // Photo ka naam unique banate hain taaki purani photo overwrite na ho
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

// 2. Upload function ready
const upload = multer({ storage: storage });

module.exports = upload;