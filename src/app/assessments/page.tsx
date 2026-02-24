"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAssessment } from '@/context/AssessmentContext';
import { SavedAssessment } from '@/types/standards';
import { ShieldCheck, FolderOpen, Plus, Play, Eye, Trash2, Clock, CheckCircle } from 'lucide-react';
import Link from 'next/link';

export default function AssessmentsPage() {
    const router = useRouter();
    const { getSavedAssessments, loadAssessment, deleteAssessment } = useAssessment();
    const [assessments, setAssessments] = useState<SavedAssessment[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        setAssessments(getSavedAssessments());
        setIsLoaded(true);
    }, [getSavedAssessments]);

    const handleResume = (id: string) => {
        loadAssessment(id);
        router.push('/assessment');
    };

    const handleViewReport = (id: string) => {
        loadAssessment(id);
        router.push('/report');
    };

    const handleDelete = (id: string, customerName: string) => {
        if (window.confirm(`Delete assessment for "${customerName}"? This cannot be undone.`)) {
            deleteAssessment(id);
            setAssessments(getSavedAssessments());
        }
    };

    const getProgress = (assessment: SavedAssessment) => {
        const totalQuestions = 50; // approximate — we'll count from answers
        const answered = Object.values(assessment.answers).filter(
            a => a.status && a.status !== 'Unanswered'
        ).length;
        return { answered, percentage: totalQuestions > 0 ? Math.min(100, Math.round((answered / totalQuestions) * 100)) : 0 };
    };

    if (!isLoaded) {
        return (
            <div className="min-h-screen bg-muted/20 flex items-center justify-center">
                <div className="animate-pulse text-muted-foreground">Loading assessments...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-muted/20">
            <div className="max-w-5xl mx-auto px-4 py-12 sm:px-6 lg:px-8">

                {/* Header */}
                <div className="text-center mb-10 space-y-4">
                    <div className="inline-flex p-3 rounded-full bg-primary/10 text-primary mb-4">
                        <FolderOpen size={40} />
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                        My Assessments
                    </h1>
                    <p className="text-muted-foreground max-w-xl mx-auto">
                        View, resume, and manage your saved assessments.
                    </p>
                </div>

                {/* New Assessment Button */}
                <div className="flex justify-center mb-8">
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold shadow-lg hover:opacity-90 transition-all"
                    >
                        <Plus size={18} />
                        New Assessment
                    </Link>
                </div>

                {/* Assessment List */}
                {assessments.length === 0 ? (
                    <div className="text-center py-16 bg-card border rounded-xl">
                        <ShieldCheck size={48} className="mx-auto text-muted-foreground/50 mb-4" />
                        <h3 className="text-lg font-semibold text-muted-foreground">No assessments yet</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                            Start a new assessment from the home page.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {assessments.map(assessment => {
                            const progress = getProgress(assessment);
                            const isCompleted = assessment.status === 'completed';

                            return (
                                <div
                                    key={assessment.id}
                                    className="bg-card border rounded-xl p-5 hover:border-primary/30 transition-colors"
                                >
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="font-semibold text-foreground truncate">
                                                    {assessment.config.customer.name || 'Unnamed Assessment'}
                                                </h3>
                                                {isCompleted ? (
                                                    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                                        <CheckCircle size={12} />
                                                        Completed
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                                                        <Clock size={12} />
                                                        In Progress
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-sm text-muted-foreground space-y-0.5">
                                                <p>{assessment.config.customer.location || 'No location'}</p>
                                                <p className="text-xs">
                                                    Assessor: {assessment.config.assessor.name} &middot;{' '}
                                                    {new Date(assessment.updatedAt).toLocaleDateString()} &middot;{' '}
                                                    {progress.answered} questions answered
                                                </p>
                                            </div>

                                            {/* Progress bar */}
                                            {!isCompleted && (
                                                <div className="mt-2 w-full max-w-xs">
                                                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-primary rounded-full transition-all"
                                                            style={{ width: `${progress.percentage}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-2 shrink-0">
                                            {isCompleted ? (
                                                <button
                                                    onClick={() => handleViewReport(assessment.id)}
                                                    className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-all"
                                                >
                                                    <Eye size={14} />
                                                    View Report
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => handleResume(assessment.id)}
                                                    className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-all"
                                                >
                                                    <Play size={14} />
                                                    Resume
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handleDelete(assessment.id, assessment.config.customer.name)}
                                                title="Delete assessment"
                                                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/30 transition-all"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                <footer className="mt-16 text-center text-sm text-muted-foreground">
                    <p>&copy; 2026 AI Safety Compliance Tool. v1.1</p>
                </footer>

            </div>
        </div>
    );
}
