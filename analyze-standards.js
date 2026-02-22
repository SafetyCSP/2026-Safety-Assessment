const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join('..', 'AIC Tool Regularoty Standards Update 2026.xlsx');

try {
    console.log(`Reading file from: ${filePath}`);
    const workbook = XLSX.readFile(filePath);

    console.log('Sheet Names:', workbook.SheetNames);

    workbook.SheetNames.forEach(sheetName => {
        console.log(`\n--- Sheet: ${sheetName} ---`);
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }); // Array of arrays

        if (data.length > 0) {
            console.log('Header Row:', JSON.stringify(data[0]));
            console.log(`Total Rows: ${data.length}`);
            console.log('First 3 Data Rows:');
            data.slice(1, 4).forEach((row, i) => {
                console.log(`Row ${i + 1}:`, JSON.stringify(row));
            });
        } else {
            console.log('Sheet is empty.');
        }
    });

} catch (error) {
    console.error('Error reading Excel file:', error.message);
}
