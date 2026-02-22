
const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, 'src', 'data', 'standards.json');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

const categoryIds = new Set();
const questionIds = new Set();
let duplicatesFound = false;

data.forEach(cat => {
    if (categoryIds.has(cat.id)) {
        console.log(`Duplicate Category ID: ${cat.id}`);
        duplicatesFound = true;
    }
    categoryIds.add(cat.id);

    cat.questions.forEach(q => {
        if (questionIds.has(q.id)) {
            console.log(`Duplicate Question ID: ${q.id} in Category ${cat.id}`);
            duplicatesFound = true;
        }
        questionIds.add(q.id);
    });
});

if (!duplicatesFound) {
    console.log("No duplicate IDs found.");
}
