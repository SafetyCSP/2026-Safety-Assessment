export interface AssessmentConfig {
    assessor: {
        name: string;
        date: string;
    };
    accountManager: {
        name: string;
        email: string;
        phone: string;
    };
    customer: {
        name: string;
        location: string;
        sapAccountNumber?: string;
        contact?: string;
        trackCode?: string;
        subtrackCode?: string;
    };
    industry?: string[];
    standards: string[];
}

export interface RegulatoryReference {
    osha: string;
    cms: string;
    tjc: string;
    dnv: string;
}

export interface Question {
    id: string;
    text: string;
    references: RegulatoryReference;
    notes: string;
    updated: boolean;
}

export type AnswerStatus = 'Yes' | 'No' | 'NA' | 'Unsure' | 'Unanswered';
export type RiskRating = 'Good' | 'Low' | 'Medium' | 'High' | 'Unknown';

export interface AssessmentImage {
    id: string;
    base64: string;
    caption: string;
    fileType?: 'image' | 'pdf';
    fileName?: string;
    thumbnail?: string;
}

export interface Answer {
    questionId: string;
    status: AnswerStatus;
    notes?: string;
    recommendation?: string;
    selectedStandards?: string[];
    images?: AssessmentImage[];
    riskRating?: RiskRating;
    timestamp: number;
}

export interface Category {
    id: string;
    title: string;
    questions: Question[];
}

export type AssessmentData = Category[];

export type AssessmentStatus = 'in-progress' | 'completed';

export interface SavedAssessment {
    id: string;
    config: AssessmentConfig;
    answers: Record<string, Answer>;
    status: AssessmentStatus;
    createdAt: number;
    updatedAt: number;
}
