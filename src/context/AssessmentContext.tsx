"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { AssessmentData, Answer, AnswerStatus, RiskRating, AssessmentConfig, SavedAssessment } from '../types/standards';
import standardsData from '../data/standards.json';

const STORAGE_KEY = 'ai-safety-assessments';
const ACTIVE_ID_KEY = 'ai-safety-active-id';

// Legacy keys for migration
const LEGACY_ANSWERS_KEY = 'ai-safety-assessment-answers';
const LEGACY_CONFIG_KEY = 'ai-safety-assessment-config';

interface AssessmentContextType {
    data: AssessmentData;
    answers: Record<string, Answer>;
    config: AssessmentConfig | null;
    currentAssessmentId: string | null;
    setConfig: (config: AssessmentConfig) => void;
    setAnswer: (questionId: string, status: AnswerStatus, notes?: string, riskRating?: RiskRating, recommendation?: string, selectedStandards?: string[]) => void;
    addImage: (questionId: string, base64: string, fileType?: 'image' | 'pdf', fileName?: string, thumbnail?: string) => void;
    updateImageCaption: (questionId: string, imageId: string, caption: string) => void;
    removeImage: (questionId: string, index: number) => void;
    moveImage: (questionId: string, fromIndex: number, toIndex: number) => void;
    getCategoryProgress: (categoryId: string) => { completed: number; total: number; percentage: number };
    overallProgress: { completed: number; total: number; percentage: number };
    resetAssessment: () => void;
    startNewAssessment: (config: AssessmentConfig) => string;
    loadAssessment: (id: string) => void;
    getSavedAssessments: () => SavedAssessment[];
    deleteAssessment: (id: string) => void;
    completeAssessment: () => void;
}

const AssessmentContext = createContext<AssessmentContextType | undefined>(undefined);

function generateId(): string {
    return crypto.randomUUID();
}

function getAllAssessments(): SavedAssessment[] {
    if (typeof window === 'undefined') return [];
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

function saveAllAssessments(assessments: SavedAssessment[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(assessments));
}

function migrateLegacyData(): SavedAssessment | null {
    if (typeof window === 'undefined') return null;

    // Prevent double-migration (React StrictMode can re-run effects)
    if (localStorage.getItem('ai-safety-migration-done')) return null;

    const legacyAnswers = localStorage.getItem(LEGACY_ANSWERS_KEY);
    const legacyConfig = localStorage.getItem(LEGACY_CONFIG_KEY);

    if (!legacyAnswers && !legacyConfig) return null;

    // Remove legacy keys immediately to prevent race conditions
    localStorage.removeItem(LEGACY_ANSWERS_KEY);
    localStorage.removeItem(LEGACY_CONFIG_KEY);
    localStorage.setItem('ai-safety-migration-done', '1');

    try {
        const answers = legacyAnswers ? JSON.parse(legacyAnswers) : {};
        const config = legacyConfig ? JSON.parse(legacyConfig) : null;

        if (!config) return null;

        const migrated: SavedAssessment = {
            id: generateId(),
            config,
            answers,
            status: 'in-progress',
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };

        const existing = getAllAssessments();
        saveAllAssessments([...existing, migrated]);

        return migrated;
    } catch {
        return null;
    }
}

export function AssessmentProvider({ children }: { children: React.ReactNode }) {
    const [data] = useState<AssessmentData>(standardsData as AssessmentData);
    const [answers, setAnswers] = useState<Record<string, Answer>>({});
    const [config, setConfigState] = useState<AssessmentConfig | null>(null);
    const [currentAssessmentId, setCurrentAssessmentId] = useState<string | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);

    // Load active assessment on mount
    useEffect(() => {
        // Migrate legacy data if present
        const migrated = migrateLegacyData();

        const savedActiveId = localStorage.getItem(ACTIVE_ID_KEY);
        const assessments = getAllAssessments();

        // If we migrated, use the migrated assessment
        if (migrated) {
            setCurrentAssessmentId(migrated.id);
            setAnswers(migrated.answers);
            setConfigState(migrated.config);
            localStorage.setItem(ACTIVE_ID_KEY, migrated.id);
        }
        // Otherwise, restore the previously active assessment
        else if (savedActiveId) {
            const active = assessments.find(a => a.id === savedActiveId);
            if (active) {
                setCurrentAssessmentId(active.id);
                setAnswers(active.answers);
                setConfigState(active.config);
            }
        }

        setIsLoaded(true);
    }, []);

    // Auto-save current assessment whenever answers or config change
    useEffect(() => {
        if (!isLoaded || !currentAssessmentId) return;

        const assessments = getAllAssessments();
        const idx = assessments.findIndex(a => a.id === currentAssessmentId);

        if (idx !== -1) {
            assessments[idx] = {
                ...assessments[idx],
                answers,
                config: config || assessments[idx].config,
                updatedAt: Date.now(),
            };
            saveAllAssessments(assessments);
        }
    }, [answers, config, isLoaded, currentAssessmentId]);

    const startNewAssessment = useCallback((newConfig: AssessmentConfig): string => {
        const id = generateId();
        const newAssessment: SavedAssessment = {
            id,
            config: newConfig,
            answers: {},
            status: 'in-progress',
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };

        const assessments = getAllAssessments();
        saveAllAssessments([...assessments, newAssessment]);

        setCurrentAssessmentId(id);
        setAnswers({});
        setConfigState(newConfig);
        localStorage.setItem(ACTIVE_ID_KEY, id);

        return id;
    }, []);

    const loadAssessment = useCallback((id: string) => {
        const assessments = getAllAssessments();
        const assessment = assessments.find(a => a.id === id);
        if (!assessment) return;

        setCurrentAssessmentId(id);
        setAnswers(assessment.answers);
        setConfigState(assessment.config);
        localStorage.setItem(ACTIVE_ID_KEY, id);
    }, []);

    const getSavedAssessments = useCallback((): SavedAssessment[] => {
        return getAllAssessments().sort((a, b) => b.updatedAt - a.updatedAt);
    }, []);

    const deleteAssessment = useCallback((id: string) => {
        const assessments = getAllAssessments().filter(a => a.id !== id);
        saveAllAssessments(assessments);

        // If deleting the active assessment, clear state
        if (id === currentAssessmentId) {
            setCurrentAssessmentId(null);
            setAnswers({});
            setConfigState(null);
            localStorage.removeItem(ACTIVE_ID_KEY);
        }
    }, [currentAssessmentId]);

    const completeAssessment = useCallback(() => {
        if (!currentAssessmentId) return;

        const assessments = getAllAssessments();
        const idx = assessments.findIndex(a => a.id === currentAssessmentId);
        if (idx !== -1) {
            assessments[idx].status = 'completed';
            assessments[idx].updatedAt = Date.now();
            saveAllAssessments(assessments);
        }
    }, [currentAssessmentId]);

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

    const addImage = (questionId: string, base64: string, fileType?: 'image' | 'pdf', fileName?: string, thumbnail?: string) => {
        setAnswers(prev => {
            const current = prev[questionId] || {
                questionId,
                status: 'Unanswered' as AnswerStatus,
                timestamp: Date.now(),
                images: [],
                notes: '',
                riskRating: undefined
            };

            const newImage = {
                id: crypto.randomUUID(),
                base64,
                caption: '',
                fileType: fileType || 'image',
                fileName: fileName || '',
                thumbnail: thumbnail || ''
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

    const moveImage = (questionId: string, fromIndex: number, toIndex: number) => {
        setAnswers(prev => {
            const current = prev[questionId];
            if (!current || !current.images) return prev;
            if (toIndex < 0 || toIndex >= current.images.length) return prev;

            const newImages = [...current.images];
            const [moved] = newImages.splice(fromIndex, 1);
            newImages.splice(toIndex, 0, moved);

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
        // Only clears active in-memory state, does NOT delete from storage
        setAnswers({});
        setConfigState(null);
        setCurrentAssessmentId(null);
        localStorage.removeItem(ACTIVE_ID_KEY);
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
            currentAssessmentId,
            setConfig,
            setAnswer,
            addImage,
            updateImageCaption,
            removeImage,
            moveImage,
            getCategoryProgress,
            overallProgress,
            resetAssessment,
            startNewAssessment,
            loadAssessment,
            getSavedAssessments,
            deleteAssessment,
            completeAssessment,
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
