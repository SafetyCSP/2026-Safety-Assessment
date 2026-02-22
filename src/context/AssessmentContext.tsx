"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { AssessmentData, Answer, AnswerStatus, Category, RiskRating, AssessmentConfig } from '../types/standards';
import standardsData from '../data/standards.json';

interface AssessmentContextType {
    data: AssessmentData;
    answers: Record<string, Answer>;
    config: AssessmentConfig | null;
    setConfig: (config: AssessmentConfig) => void;
    setAnswer: (questionId: string, status: AnswerStatus, notes?: string, riskRating?: RiskRating, recommendation?: string, selectedStandards?: string[]) => void;
    addImage: (questionId: string, base64: string) => void;
    updateImageCaption: (questionId: string, imageId: string, caption: string) => void;
    removeImage: (questionId: string, index: number) => void;
    getCategoryProgress: (categoryId: string) => { completed: number; total: number; percentage: number };
    overallProgress: { completed: number; total: number; percentage: number };
    resetAssessment: () => void;
}

const AssessmentContext = createContext<AssessmentContextType | undefined>(undefined);

export function AssessmentProvider({ children }: { children: React.ReactNode }) {
    const [data] = useState<AssessmentData>(standardsData as AssessmentData);
    const [answers, setAnswers] = useState<Record<string, Answer>>({});
    const [config, setConfigState] = useState<AssessmentConfig | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);

    // Load from local storage
    useEffect(() => {
        const saved = localStorage.getItem('ai-safety-assessment-answers');
        if (saved) {
            try {
                setAnswers(JSON.parse(saved));
            } catch (e) {
                console.error("Failed to load answers", e);
            }
        }

        const savedConfig = localStorage.getItem('ai-safety-assessment-config');
        if (savedConfig) {
            try {
                setConfigState(JSON.parse(savedConfig));
            } catch (e) {
                console.error("Failed to load config", e);
            }
        }

        setIsLoaded(true);
    }, []);

    // Save to local storage
    useEffect(() => {
        if (isLoaded) {
            localStorage.setItem('ai-safety-assessment-answers', JSON.stringify(answers));
        }
    }, [answers, isLoaded]);

    useEffect(() => {
        if (isLoaded) {
            if (config) {
                localStorage.setItem('ai-safety-assessment-config', JSON.stringify(config));
            } else {
                localStorage.removeItem('ai-safety-assessment-config');
            }
        }
    }, [config, isLoaded]);

    const setConfig = (newConfig: AssessmentConfig) => {
        setConfigState(newConfig);
    };

    const setAnswer = (questionId: string, status: AnswerStatus, notes?: string, riskRating?: RiskRating, recommendation?: string, selectedStandards?: string[]) => {
        setAnswers(prev => ({
            ...prev,
            [questionId]: {
                ...prev[questionId],
                questionId,
                status,
                notes: notes ?? prev[questionId]?.notes,
                recommendation: recommendation ?? prev[questionId]?.recommendation,
                selectedStandards: selectedStandards ?? prev[questionId]?.selectedStandards,
                riskRating: riskRating ?? prev[questionId]?.riskRating,
                images: prev[questionId]?.images || [],
                timestamp: Date.now()
            }
        }));
    };

    const addImage = (questionId: string, base64: string) => {
        setAnswers(prev => {
            const current = prev[questionId] || {
                questionId,
                status: 'Unanswered' as AnswerStatus,
                timestamp: Date.now(),
                images: [],
                notes: '',
                riskRating: undefined
            };

            // Handle migration from string[] to AssessmentImage[] if needed
            // If existing images are strings, we might break. But since we are dev, we can clear or checking types.
            // For now, assuming new structure.

            const newImage = {
                id: crypto.randomUUID(),
                base64,
                caption: ''
            };

            return {
                ...prev,
                [questionId]: {
                    ...current,
                    images: [...(current.images || []), newImage]
                }
            };
        });
    };

    const updateImageCaption = (questionId: string, imageId: string, caption: string) => {
        setAnswers(prev => {
            const current = prev[questionId];
            if (!current || !current.images) return prev;

            const newImages = current.images.map(img =>
                img.id === imageId ? { ...img, caption } : img
            );

            return {
                ...prev,
                [questionId]: {
                    ...current,
                    images: newImages
                }
            };
        });
    };

    const removeImage = (questionId: string, index: number) => {
        setAnswers(prev => {
            const current = prev[questionId];
            if (!current || !current.images) return prev;

            const newImages = [...current.images];
            newImages.splice(index, 1);

            return {
                ...prev,
                [questionId]: {
                    ...current,
                    images: newImages
                }
            };
        });
    };

    const resetAssessment = () => {
        setAnswers({});
        setConfigState(null);
        localStorage.removeItem('ai-safety-assessment-answers');
        localStorage.removeItem('ai-safety-assessment-config');
    };

    const getCategoryProgress = (categoryId: string) => {
        const category = data.find(c => c.id === categoryId);
        if (!category) return { completed: 0, total: 0, percentage: 0 };

        const total = category.questions.length;
        const completed = category.questions.filter(q => answers[q.id]?.status && answers[q.id]?.status !== 'Unanswered').length;

        return {
            completed,
            total,
            percentage: total === 0 ? 0 : Math.round((completed / total) * 100)
        };
    };

    const overallProgress = (() => {
        let total = 0;
        let completed = 0;

        data.forEach(c => {
            total += c.questions.length;
            completed += c.questions.filter(q => answers[q.id]?.status && answers[q.id]?.status !== 'Unanswered').length;
        });

        return {
            completed,
            total,
            percentage: total === 0 ? 0 : Math.round((completed / total) * 100)
        };
    })();

    return (
        <AssessmentContext.Provider value={{
            data,
            answers,
            config,
            setConfig,
            setAnswer,
            addImage,
            updateImageCaption,
            removeImage,
            getCategoryProgress,
            overallProgress,
            resetAssessment
        }}>
            {children}
        </AssessmentContext.Provider>
    );
}

export function useAssessment() {
    const context = useContext(AssessmentContext);
    if (context === undefined) {
        throw new Error('useAssessment must be used within an AssessmentProvider');
    }
    return context;
}
