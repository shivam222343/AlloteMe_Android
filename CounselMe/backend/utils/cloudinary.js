const cloudinary = require('cloudinary').v2;

cloudinary.config({
    cloud_name: 'dbs85dcb1',
    api_key: '846274841824367',
    api_secret: '9-BXYgApxbUJ0FjN0jNVQUbLvZA'
});

module.exports = cloudinary;
