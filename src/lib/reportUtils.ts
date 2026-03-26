import { AssessmentData, Answer, AnswerStatus } from '@/types/standards';

export const DEFAULT_PASS_THRESHOLD = 80;

export interface AssessmentStats {
    high: number;
    medium: number;
    low: number;
    answeredCount: number;
    passCount: number;
    failCount: number;
    unansweredCount: number;
    complianceScore: number;
    totalQuestions: number;
    threshold: number;
    meetsThreshold: boolean;
}

function isAnswered(status?: AnswerStatus): boolean {
    return !!status && status !== 'Unanswered';
}

function isPassingStatus(status?: AnswerStatus): boolean {
    return status === 'Yes' || status === 'NA';
}

export function calculateStats(
    data: AssessmentData,
    answers: Record<string, Answer>,
    threshold: number = DEFAULT_PASS_THRESHOLD
): AssessmentStats {
    let high = 0;
    let medium = 0;
    let low = 0;
    let answeredCount = 0;
    let passCount = 0;

    const totalQuestions = data.reduce((sum, category) => sum + category.questions.length, 0);

    data.forEach((category) => {
        category.questions.forEach((question) => {
            const answer = answers[question.id];
            if (!isAnswered(answer?.status)) {
                return;
            }

            answeredCount += 1;

            if (isPassingStatus(answer.status)) {
                passCount += 1;
            }

            if (answer.riskRating === 'High') high += 1;
            if (answer.riskRating === 'Medium') medium += 1;
            if (answer.riskRating === 'Low') low += 1;
        });
    });

    const failCount = answeredCount - passCount;
    const unansweredCount = totalQuestions - answeredCount;
    const complianceScore = answeredCount === 0 ? 0 : Math.round((passCount / answeredCount) * 100);

    return {
        high,
        medium,
        low,
        answeredCount,
        passCount,
        failCount,
        unansweredCount,
        complianceScore,
        totalQuestions,
        threshold,
        meetsThreshold: complianceScore >= threshold,
    };
}

export function generateCSV(data: AssessmentData, answers: Record<string, Answer>): string {
    let csv = 'Question ID,Category,Question Text,Status,Risk Rating,Findings,Recommendation,Selected Standards,Attached Files\n';

    data.forEach((category) => {
        category.questions.forEach((question) => {
            const answer = answers[question.id];
            const status = answer?.status || 'Unanswered';
            const risk = answer?.riskRating || '';
            const findings = (answer?.notes || '').replace(/"/g, '""');
            const recommendation = (answer?.recommendation || '').replace(/"/g, '""');
            const selectedStandards = (answer?.selectedStandards || []).join(' | ').replace(/"/g, '""');
            const files = (answer?.images || [])
                .map((img) => img.fileName || `file-${img.id}`)
                .join(' | ')
                .replace(/"/g, '""');
            const questionText = question.text.replace(/"/g, '""');
            const categoryTitle = category.title.replace(/"/g, '""');

            const row = [
                question.id,
                `"${categoryTitle}"`,
                `"${questionText}"`,
                status,
                risk,
                `"${findings}"`,
                `"${recommendation}"`,
                `"${selectedStandards}"`,
                `"${files}"`,
            ].join(',');

            csv += row + '\n';
        });
    });

    return csv;
}