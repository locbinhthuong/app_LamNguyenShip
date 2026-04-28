const fs = require('fs');

const file = fs.readFileSync('AloShipp_Customer_Distribution.mobileprovision');
const base64 = file.toString('base64');
fs.writeFileSync('base64.txt', base64);
console.log("Wrote base64 to base64.txt");
