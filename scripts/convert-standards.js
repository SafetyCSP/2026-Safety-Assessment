const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const INPUT_FILE = path.join(__dirname, '..', '..', 'AIC Tool Regularoty Standards Update 2026.xlsx');
const OUTPUT_FILE = path.join(__dirname, '..', 'src', 'data', 'standards.json');

function convert() {
    try {
        if (!fs.existsSync(INPUT_FILE)) {
            throw new Error(`Input file not found: ${INPUT_FILE}`);
        }

        const workbook = XLSX.readFile(INPUT_FILE);
        const sheetName = workbook.SheetNames[0]; // Assuming first sheet
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        const categories = [];
        let currentCategory = null;

        // Skip header row usually, but let's check row 0
        // Based on previous analysis: Row 0 is headers.

        // Mapping based on headers:
        // 0: Assessment Question (ID + Text)
        // 1: OSHA
        // 2: CMS
        // 3: TJC
        // 4: DNV
        // 5: Notes
        // 6: Updated
        // 7: Pre-2026

        for (let i = 1; i < data.length; i++) {
            const row = data[i];
            const col0 = row[0] ? String(row[0]).trim() : '';

            if (!col0) continue;

            // Heuristic to detect Category vs Question
            // Categories look like "01. Confined Space"
            // Questions look like "01.01.001: Question text..."

            const isQuestion = /^\d{2}\.\d{2}\.\d{3}/.test(col0);

            if (!isQuestion) {
                // Assume it's a category
                // Parse ID and Name: "01. Confined Space" -> ID: "01", Name: "Confined Space"
                const match = col0.match(/^(\d{2})\.\s*(.+)/);
                if (match) {
                    currentCategory = {
                        id: match[1],
                        title: match[2],
                        questions: []
                    };
                    categories.push(currentCategory);
                } else {
                    // If it doesn't match standard category format but is not a question, treat as uncategorized or a sub-header? 
                    // For now, if we have no category, create a 'General' one.
                    if (!currentCategory) {
                        currentCategory = { id: '00', title: 'General', questions: [] };
                        categories.push(currentCategory);
                    }
                    // If we're seemingly in a category but it's just text, maybe it's a weird row. 
                    // Log it but ignore for now unless critical.
                    console.log(`Skipping non-conforming row ${i + 1}: ${col0}`);
                }
            } else {
                // It is a question
                if (!currentCategory) {
                    currentCategory = { id: '00', title: 'General', questions: [] };
                    categories.push(currentCategory);
                }

                // Parse ID and Text from "01.01.001: Is it safe?"
                // Note: Sometimes colon might be missing or different format.
                const qMatch = col0.match(/^(\d{2}\.\d{2}\.\d{3})[:\.]?\s*(.+)/);
                let qId = 'unknown';
                let qText = col0;

                if (qMatch) {
                    qId = qMatch[1];
                    qText = qMatch[2];
                }

                const question = {
                    id: qId,
                    text: qText,
                    references: {
                        osha: row[1] || '',
                        cms: row[2] || '',
                        tjc: row[3] || '',
                        dnv: row[4] || ''
                    },
                    notes: row[5] || '',
                    updated: row[6] === 'YES'
                };

                currentCategory.questions.push(question);
            }
        }

        console.log(`Parsed ${categories.length} categories.`);
        categories.forEach(c => console.log(` - ${c.title}: ${c.questions.length} questions`));

        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(categories, null, 2));
        console.log(`Successfully wrote to ${OUTPUT_FILE}`);

    } catch (err) {
        console.error('Conversion failed:', err);
        process.exit(1);
    }
}

convert();
