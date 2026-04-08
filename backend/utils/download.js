const fs = require('fs');
const https = require('https');

https.get('https://raw.githubusercontent.com/alif-type/amiri/main/Amiri-Regular.ttf', (res) => {
    if (res.statusCode === 200) {
        res.pipe(fs.createWriteStream('Amiri-Regular.ttf'));
        console.log('Downloaded Amiri successfully');
    } else {
        console.log('Failed:', res.statusCode);
    }
}).on('error', (e) => {
    console.error('Error:', e);
});
