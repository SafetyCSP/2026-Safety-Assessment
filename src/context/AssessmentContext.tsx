"use client";

import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { AssessmentData, Answer, AnswerStatus, AssessmentConfig, SavedAssessment } from '../types/standards';
import standardsData from '../data/standards.json';

const STORAGE_KEY = 'ai-safety-assessments';
const ACTIVE_ID_KEY = 'ai-safety-active-id';
const STANDARDS_STORAGE_KEY = 'ai-safety-standards-data';
const ACTIVE_SESSION_KEY = 'ai-safety-active-session';

const LEGACY_ANSWERS_KEY = 'ai-safety-assessment-answers';
const LEGACY_CONFIG_KEY = 'ai-safety-assessment-config';

interface InitialSession {
    answers: Record<string, Answer>;
    config: AssessmentConfig | null;
    currentAssessmentId: string | null;
}

interface AssessmentContextType {
    data: AssessmentData;
    answers: Record<string, Answer>;
    config: AssessmentConfig | null;
    currentAssessmentId: string | null;
    totalQuestionCount: number;
    setConfig: (config: AssessmentConfig) => void;
    setAnswer: (questionId: string, updates: Partial<Omit<Answer, 'questionId' | 'timestamp'>>) => void;
    addImage: (questionId: string, base64: string, fileType?: 'image' | 'pdf', fileName?: string, thumbnail?: string) => void;
    updateImageCaption: (questionId: string, imageId: string, caption: string) => void;
    removeImage: (questionId: string, index: number) => void;
    moveImage: (questionId: string, fromIndex: number, toIndex: number) => void;
    getCategoryProgress: (categoryId: string) => { completed: number; total: number; percentage: number };
    overallProgress: { completed: number; total: number; percentage: number };
    updateStandardsData: (nextData: AssessmentData) => void;
    resetStandardsData: () => void;
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
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(assessments));
    } catch (error) {
        console.error('Failed to persist assessments to local storage.', error);
    }
}

function loadStandardsFromStorage(): AssessmentData {
    if (typeof window === 'undefined') return standardsData as AssessmentData;

    try {
        const stored = localStorage.getItem(STANDARDS_STORAGE_KEY);
        if (!stored) return standardsData as AssessmentData;

        const parsed = JSON.parse(stored) as AssessmentData;
        return Array.isArray(parsed) ? parsed : (standardsData as AssessmentData);
    } catch {
        return standardsData as AssessmentData;
    }
}

function saveStandardsToStorage(nextData: AssessmentData) {
    localStorage.setItem(STANDARDS_STORAGE_KEY, JSON.stringify(nextData));
}

function migrateLegacyData(): SavedAssessment | null {
    if (typeof window === 'undefined') return null;

    if (localStorage.getItem('ai-safety-migration-done')) return null;

    const legacyAnswers = localStorage.getItem(LEGACY_ANSWERS_KEY);
    const legacyConfig = localStorage.getItem(LEGACY_CONFIG_KEY);

    if (!legacyAnswers && !legacyConfig) return null;

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

function resolveInitialSession(): InitialSession {
    if (typeof window === 'undefined') {
        return { answers: {}, config: null, currentAssessmentId: null };
    }

    try {
        const sessionRaw = localStorage.getItem(ACTIVE_SESSION_KEY);
        if (sessionRaw) {
            const parsed = JSON.parse(sessionRaw) as Partial<InitialSession>;
            const restored: InitialSession = {
                answers: parsed.answers && typeof parsed.answers === 'object' ? (parsed.answers as Record<string, Answer>) : {},
                config: parsed.config || null,
                currentAssessmentId: typeof parsed.currentAssessmentId === 'string' ? parsed.currentAssessmentId : null,
            };

            if (restored.config || restored.currentAssessmentId || Object.keys(restored.answers).length > 0) {
                return restored;
            }
        }
    } catch {
        // Continue to legacy/saved assessment recovery.
    }

    const migrated = migrateLegacyData();
    const savedActiveId = localStorage.getItem(ACTIVE_ID_KEY);
    const assessments = getAllAssessments();

    if (migrated) {
        localStorage.setItem(ACTIVE_ID_KEY, migrated.id);
        return {
            answers: migrated.answers,
            config: migrated.config,
            currentAssessmentId: migrated.id,
        };
    }

    if (savedActiveId) {
        const active = assessments.find((assessment) => assessment.id === savedActiveId);
        if (active) {
            return {
                answers: active.answers,
                config: active.config,
                currentAssessmentId: active.id,
            };
        }
    }

    const fallback = assessments.find((assessment) => assessment.status === 'in-progress') || assessments[0];
    if (fallback) {
        return {
            answers: fallback.answers,
            config: fallback.config,
            currentAssessmentId: fallback.id,
        };
    }

    return { answers: {}, config: null, currentAssessmentId: null };
}

export function AssessmentProvider({ children }: { children: React.ReactNode }) {
    const [data, setData] = useState<AssessmentData>(standardsData as AssessmentData);
    const [answers, setAnswers] = useState<Record<string, Answer>>({});
    const [config, setConfigState] = useState<AssessmentConfig | null>(null);
    const [currentAssessmentId, setCurrentAssessmentId] = useState<string | null>(null);
    const [isBootstrapped, setIsBootstrapped] = useState(false);

    useEffect(() => {
        setData(loadStandardsFromStorage());

        const initialSession = resolveInitialSession();
        setAnswers(initialSession.answers);
        setConfigState(initialSession.config);
        setCurrentAssessmentId(initialSession.currentAssessmentId);
        setIsBootstrapped(true);
    }, []);

    useEffect(() => {
        if (!isBootstrapped || !currentAssessmentId) return;

        const assessments = getAllAssessments();
        const idx = assessments.findIndex((assessment) => assessment.id === currentAssessmentId);

        if (idx !== -1) {
            assessments[idx] = {
                ...assessments[idx],
                answers,
                config: config || assessments[idx].config,
                updatedAt: Date.now(),
            };
            saveAllAssessments(assessments);
        }
    }, [answers, config, currentAssessmentId, isBootstrapped]);


    useEffect(() => {
        if (!isBootstrapped) return;

        try {
            localStorage.setItem(
                ACTIVE_SESSION_KEY,
                JSON.stringify({
                    answers,
                    config,
                    currentAssessmentId,
                })
            );
        } catch (error) {
            console.error('Failed to persist active assessment session.', error);
        }
    }, [answers, config, currentAssessmentId, isBootstrapped]);

    useEffect(() => {
        if (!isBootstrapped || config) return;

        const assessments = getAllAssessments();
        if (assessments.length === 0) return;

        const savedActiveId = localStorage.getItem(ACTIVE_ID_KEY);
        const targetId = currentAssessmentId || savedActiveId;
        const fallback = assessments.find((assessment) => assessment.status === 'in-progress') || assessments[0];
        const candidate = (targetId ? assessments.find((assessment) => assessment.id === targetId) : undefined) || fallback;

        if (!candidate) return;

        setCurrentAssessmentId(candidate.id);
        setConfigState(candidate.config);
        if (Object.keys(answers).length === 0) {
            setAnswers(candidate.answers || {});
        }
        localStorage.setItem(ACTIVE_ID_KEY, candidate.id);
    }, [answers, config, currentAssessmentId, isBootstrapped]);

    const totalQuestionCount = useMemo(() => data.reduce((sum, category) => sum + category.questions.length, 0), [data]);

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
        const assessment = assessments.find((item) => item.id === id);
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
        const assessments = getAllAssessments().filter((assessment) => assessment.id !== id);
        saveAllAssessments(assessments);

        if (id === currentAssessmentId) {
            setCurrentAssessmentId(null);
            setAnswers({});
            setConfigState(null);
            localStorage.removeItem(ACTIVE_ID_KEY);
            localStorage.removeItem(ACTIVE_SESSION_KEY);
        }
    }, [currentAssessmentId]);

    const completeAssessment = useCallback(() => {
        if (!currentAssessmentId) return;

        const assessments = getAllAssessments();
        const idx = assessments.findIndex((assessment) => assessment.id === currentAssessmentId);

        if (idx !== -1) {
            assessments[idx].status = 'completed';
            assessments[idx].updatedAt = Date.now();
            saveAllAssessments(assessments);
        }
    }, [currentAssessmentId]);

    const setConfig = (newConfig: AssessmentConfig) => {
        setConfigState(newConfig);
    };

    const setAnswer = (questionId: string, updates: Partial<Omit<Answer, 'questionId' | 'timestamp'>>) => {
        setAnswers((prev) => {
            const current = prev[questionId] || {
                questionId,
                status: 'Unanswered' as AnswerStatus,
                images: [],
                selectedStandards: [],
                timestamp: Date.now(),
            };

            const next: Answer = {
                ...current,
                ...updates,
                questionId,
                images: updates.images ?? current.images ?? [],
                selectedStandards: updates.selectedStandards ?? current.selectedStandards,
                timestamp: Date.now(),
            };

            if (next.status === 'Yes') {
                next.riskRating = 'Good';
            }

            if (next.status === 'No' || next.status === 'Unsure') {
                if (next.riskRating === 'Good') {
                    next.riskRating = undefined;
                }
            }

            if (next.status === 'NA' || next.status === 'Unanswered') {
                next.riskRating = undefined;
            }

            return {
                ...prev,
                [questionId]: next,
            };
        });
    };

    const addImage = (questionId: string, base64: string, fileType?: 'image' | 'pdf', fileName?: string, thumbnail?: string) => {
        setAnswers((prev) => {
            const current = prev[questionId] || {
                questionId,
                status: 'Unanswered' as AnswerStatus,
                timestamp: Date.now(),
                images: [],
                selectedStandards: [],
            };

            const newImage = {
                id: crypto.randomUUID(),
                base64,
                caption: '',
                fileType: fileType || 'image',
                fileName: fileName || '',
                thumbnail: thumbnail || '',
            };

            return {
                ...prev,
                [questionId]: {
                    ...current,
                    images: [...(current.images || []), newImage],
                    timestamp: Date.now(),
                },
            };
        });
    };

    const updateImageCaption = (questionId: string, imageId: string, caption: string) => {
        setAnswers((prev) => {
            const current = prev[questionId];
            if (!current || !current.images) return prev;

            const images = current.images.map((img) => (img.id === imageId ? { ...img, caption } : img));
            return {
                ...prev,
                [questionId]: {
                    ...current,
                    images,
                    timestamp: Date.now(),
                },
            };
        });
    };

    const removeImage = (questionId: string, index: number) => {
        setAnswers((prev) => {
            const current = prev[questionId];
            if (!current || !current.images) return prev;

            const images = [...current.images];
            images.splice(index, 1);

            return {
                ...prev,
                [questionId]: {
                    ...current,
                    images,
                    timestamp: Date.now(),
                },
            };
        });
    };

    const moveImage = (questionId: string, fromIndex: number, toIndex: number) => {
        setAnswers((prev) => {
            const current = prev[questionId];
            if (!current || !current.images) return prev;
            if (toIndex < 0 || toIndex >= current.images.length) return prev;

            const images = [...current.images];
            const [moved] = images.splice(fromIndex, 1);
            images.splice(toIndex, 0, moved);

            return {
                ...prev,
                [questionId]: {
                    ...current,
                    images,
                    timestamp: Date.now(),
                },
            };
        });
    };

    const updateStandardsData = (nextData: AssessmentData) => {
        setData(nextData);
        saveStandardsToStorage(nextData);

        const validQuestionIds = new Set(nextData.flatMap((category) => category.questions.map((question) => question.id)));
        setAnswers((prev) => Object.fromEntries(Object.entries(prev).filter(([id]) => validQuestionIds.has(id))));
    };

    const resetStandardsData = () => {
        const defaults = standardsData as AssessmentData;
        setData(defaults);
        localStorage.removeItem(STANDARDS_STORAGE_KEY);

        const validQuestionIds = new Set(defaults.flatMap((category) => category.questions.map((question) => question.id)));
        setAnswers((prev) => Object.fromEntries(Object.entries(prev).filter(([id]) => validQuestionIds.has(id))));
    };

    const resetAssessment = () => {
        setAnswers({});
        setConfigState(null);
        setCurrentAssessmentId(null);
        localStorage.removeItem(ACTIVE_ID_KEY);
        localStorage.removeItem(ACTIVE_SESSION_KEY);
    };

    const getCategoryProgress = (categoryId: string) => {
        const category = data.find((item) => item.id === categoryId);
        if (!category) return { completed: 0, total: 0, percentage: 0 };

        const total = category.questions.length;
        const completed = category.questions.filter((question) => {
            const status = answers[question.id]?.status;
            return status && status !== 'Unanswered';
        }).length;

        return {
            completed,
            total,
            percentage: total === 0 ? 0 : Math.round((completed / total) * 100),
        };
    };

    const overallProgress = useMemo(() => {
        let total = 0;
        let completed = 0;

        data.forEach((category) => {
            total += category.questions.length;
            completed += category.questions.filter((question) => {
                const status = answers[question.id]?.status;
                return status && status !== 'Unanswered';
            }).length;
        });

        return {
            completed,
            total,
            percentage: total === 0 ? 0 : Math.round((completed / total) * 100),
        };
    }, [answers, data]);

    return (
        <AssessmentContext.Provider
            value={{
                data,
                answers,
                config,
                currentAssessmentId,
                totalQuestionCount,
                setConfig,
                setAnswer,
                addImage,
                updateImageCaption,
                removeImage,
                moveImage,
                getCategoryProgress,
                overallProgress,
                updateStandardsData,
                resetStandardsData,
                resetAssessment,
                startNewAssessment,
                loadAssessment,
                getSavedAssessments,
                deleteAssessment,
                completeAssessment,
            }}
        >
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
