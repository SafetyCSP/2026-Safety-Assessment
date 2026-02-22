import { AssessmentData, Answer } from '@/types/standards';

export interface AssessmentStats {
    high: number;
    medium: number;
    low: number;
    unknown: number;
    good: number;
    totalRisks: number;
    complianceScore: number;
    totalQuestions: number;
    complianceCount: number;
}

export function calculateStats(data: AssessmentData, answers: Record<string, Answer>): AssessmentStats {
    let h = 0, m = 0, l = 0, u = 0;
    let compliant = 0;
    let applicableTotal = 0;

    data.forEach(cat => {
        cat.questions.forEach(q => {
            const answer = answers[q.id];
            if (answer) {
                if (answer.status === 'Yes') {
                    compliant++;
                    applicableTotal++;
                } else if (answer.status === 'No' || answer.status === 'Unsure') {
                    applicableTotal++;
                    // Count risks
                    if (answer.riskRating === 'High') h++;
                    if (answer.riskRating === 'Medium') m++;
                    if (answer.riskRating === 'Low') l++;
                    if (answer.riskRating === 'Unknown') u++;
                }
                // NA and Unanswered are ignored for score and risk counts
            }
        });
    });

    const score = applicableTotal === 0 ? 0 : Math.round((compliant / applicableTotal) * 100);

    return {
        high: h,
        medium: m,
        low: l,
        unknown: u,
        good: compliant,
        totalRisks: h + m + l + u,
        complianceScore: score,
        totalQuestions: applicableTotal,
        complianceCount: compliant
    };
}

export function generateCSV(data: AssessmentData, answers: Record<string, Answer>): string {
    // Headers
    let csv = 'Question ID,Category,Question Text,Ref OSHA,Ref TJC,Ref DNV,Status,Risk Rating,Comments\n';

    // Rows
    data.forEach(cat => {
        cat.questions.forEach(q => {
            const ans = answers[q.id];
            const status = ans?.status || 'Unanswered';
            const risk = ans?.riskRating || '';
            // Escape quotes by doubling them, and wrap field in quotes to handle commas/newlines
            const notes = (ans?.notes || '').replace(/"/g, '""');
            const text = q.text.replace(/"/g, '""');
            const categoryTitle = cat.title.replace(/"/g, '""');

            const row = [
                q.id,
                `"${categoryTitle}"`,
                `"${text}"`,
                `"${q.references.osha}"`,
                `"${q.references.tjc}"`,
                `"${q.references.dnv}"`,
                status,
                risk,
                `"${notes}"` // Wrapped in quotes to handle newlines safe for Excel/CSV
            ].join(',');

            csv += row + '\n';
        });
    });

    return csv;
}
