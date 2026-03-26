import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

interface SummaryStats {
    complianceScore: number;
    passCount: number;
    failCount: number;
    answeredCount: number;
    unansweredCount: number;
    high: number;
    medium: number;
    low: number;
    threshold: number;
}

interface SummaryInput {
    customerName: string;
    location: string;
    assessorName: string;
    assessmentDate: string;
    stats: SummaryStats;
    topFindings: Array<{
        category: string;
        question: string;
        status: string;
        riskRating?: string;
    }>;
}

interface ExecutiveSummary {
    assessmentOverview: string;
    riskProfile: string;
    criticalFindings: string[];
    recommendedActions: string[];
    closingSummary: string;
}

function fallbackSummary(input: SummaryInput): ExecutiveSummary {
    const riskProfile =
        input.stats.complianceScore >= 90
            ? 'Overall risk profile is low based on current responses.'
            : input.stats.complianceScore >= 75
                ? 'Overall risk profile is moderate and requires targeted remediation.'
                : 'Overall risk profile is elevated and requires immediate corrective action.';

    const keyFindings = input.topFindings.slice(0, 4).map((finding, index) => {
        return `${index + 1}. ${finding.category}: ${finding.question} (${finding.status}, ${finding.riskRating || 'No risk rating'})`;
    });

    const recommendedActions = [
        `Prioritize remediation for ${input.stats.high} High risk item(s) and ${input.stats.medium} Medium risk item(s).`,
        'Assign owners and due dates for each non-compliant finding and track closure weekly.',
        'Reassess unresolved findings after corrective actions to verify sustained compliance.',
    ];

    return {
        assessmentOverview: `Assessment completed for ${input.customerName} (${input.location}) on ${input.assessmentDate} by ${input.assessorName}. The current passing score is ${input.stats.complianceScore}% against a ${input.stats.threshold}% threshold based on ${input.stats.answeredCount} answered questions.`,
        riskProfile,
        criticalFindings: keyFindings.length > 0 ? keyFindings : ['No critical findings were identified from the answered questions.'],
        recommendedActions,
        closingSummary:
            input.stats.complianceScore >= input.stats.threshold
                ? 'Current results meet the target threshold. Continue periodic reviews to maintain compliance.'
                : 'Current results are below the target threshold. Immediate mitigation and follow-up assessments are recommended.',
    };
}

function parseModelJson(text: string): ExecutiveSummary | null {
    try {
        return JSON.parse(text) as ExecutiveSummary;
    } catch {
        const match = text.match(/\{[\s\S]*\}/);
        if (!match) return null;

        try {
            return JSON.parse(match[0]) as ExecutiveSummary;
        } catch {
            return null;
        }
    }
}

function sanitizeSummary(summary: ExecutiveSummary, fallback: ExecutiveSummary): ExecutiveSummary {
    return {
        assessmentOverview: summary.assessmentOverview?.trim() || fallback.assessmentOverview,
        riskProfile: summary.riskProfile?.trim() || fallback.riskProfile,
        criticalFindings: Array.isArray(summary.criticalFindings) && summary.criticalFindings.length > 0
            ? summary.criticalFindings.slice(0, 6).map((item) => item.toString())
            : fallback.criticalFindings,
        recommendedActions: Array.isArray(summary.recommendedActions) && summary.recommendedActions.length > 0
            ? summary.recommendedActions.slice(0, 6).map((item) => item.toString())
            : fallback.recommendedActions,
        closingSummary: summary.closingSummary?.trim() || fallback.closingSummary,
    };
}

export async function POST(request: Request) {
    try {
        const input = (await request.json()) as SummaryInput;
        const fallback = fallbackSummary(input);

        const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ summary: fallback, source: 'fallback' });
        }

        const prompt = [
            'You are generating an executive summary for an OSHA-focused safety assessment report.',
            'Return JSON only with these exact keys:',
            'assessmentOverview (string),',
            'riskProfile (string),',
            'criticalFindings (array of short strings),',
            'recommendedActions (array of short strings),',
            'closingSummary (string).',
            'Do not include markdown, code fences, or extra keys.',
            'Use a formal, concise, compliance-audit tone.',
            '',
            `Input data: ${JSON.stringify(input)}`,
        ].join('\n');

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature: 0.2,
                        responseMimeType: 'application/json',
                    },
                }),
            }
        );

        if (!response.ok) {
            return NextResponse.json({ summary: fallback, source: 'fallback' });
        }

        const json = await response.json();
        const modelText = json?.candidates?.[0]?.content?.parts?.[0]?.text as string | undefined;

        if (!modelText) {
            return NextResponse.json({ summary: fallback, source: 'fallback' });
        }

        const parsed = parseModelJson(modelText);
        if (!parsed) {
            return NextResponse.json({ summary: fallback, source: 'fallback' });
        }

        return NextResponse.json({ summary: sanitizeSummary(parsed, fallback), source: 'ai' });
    } catch (error) {
        console.error('Executive summary generation failed:', error);
        return NextResponse.json({ error: 'Failed to generate summary.' }, { status: 500 });
    }
}