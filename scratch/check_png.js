const fs = require('fs');
const path = 'imgs/google.png';
if (fs.existsSync(path)) {
    const buffer = fs.readFileSync(path);
    console.log('File size:', buffer.length);
    console.log('First 8 bytes (Hex):', buffer.slice(0, 8).toString('hex'));
    // PNG header: 89 50 4e 47 0d 0a 1a 0a
} else {
    console.log('File not found');
}
