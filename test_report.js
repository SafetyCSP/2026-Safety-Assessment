
// Mock data structures since we are running in Node without TS directly
const mockData = [
    {
        id: "cat1",
        title: "Category 1",
        questions: [
            { id: "q1", text: "Q1", references: {} },
            { id: "q2", text: "Q2", references: {} },
            { id: "q3", text: "Q3", references: {} }
        ]
    }
];

const mockAnswers = {
    "q1": { status: "Yes" },
    "q2": { status: "No", riskRating: "High" },
    "q3": { status: "NA" } // Should be ignored
};

// Paste logic here for testing since we can't import TS in raw JS node easily without step
function calculateStats(data, answers) {
    let h = 0, m = 0, l = 0;
    let compliant = 0;
    let applicableTotal = 0;

    data.forEach(cat => {
        cat.questions.forEach(q => {
            const answer = answers[q.id];
            if (answer) {
                if (answer.status === 'Yes') {
                    compliant++;
                    applicableTotal++;
                } else if (answer.status === 'No') {
                    applicableTotal++;
                    if (answer.riskRating === 'High') h++;
                    if (answer.riskRating === 'Medium') m++;
                    if (answer.riskRating === 'Low') l++;
                }
            }
        });
    });

    const score = applicableTotal === 0 ? 0 : Math.round((compliant / applicableTotal) * 100);

    return {
        high: h,
        medium: m,
        low: l,
        totalRisks: h + m + l,
        complianceScore: score
    };
}

console.log("Testing Report Logic...");
const stats = calculateStats(mockData, mockAnswers);
console.log("Stats:", JSON.stringify(stats, null, 2));

if (stats.complianceScore === 50 && stats.high === 1 && stats.totalRisks === 1) {
    console.log("✅ PASS: Score calculation is correct (1 Yes / 2 Applicable = 50%)");
} else {
    console.error("❌ FAIL: Calculation logic error");
}
