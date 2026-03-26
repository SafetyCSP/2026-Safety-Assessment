"use client";

import React, { useState } from 'react';
import { useAssessment } from '@/context/AssessmentContext';
import { CategoryList } from '@/components/CategoryList';
import { QuestionCard } from '@/components/QuestionCard';
import Link from 'next/link';
import { PieChart, ChevronDown, ChevronRight as ChevronRightIcon, FileText, CheckCircle, ChevronLeft, ChevronRight, FolderOpen, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

export default function AssessmentPage() {
    const { data, answers, config, currentAssessmentId, overallProgress, completeAssessment, getSavedAssessments, loadAssessment } = useAssessment();
    const router = useRouter();

    const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
    const [showActions, setShowActions] = useState(false);
    const [showWarningModal, setShowWarningModal] = useState(false);
    const [showRequiredModal, setShowRequiredModal] = useState(false);
    const [unansweredCount, setUnansweredCount] = useState(0);
    const [missingRequiredCount, setMissingRequiredCount] = useState(0);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

    const toggleCategory = (categoryId: string) => {
        setExpandedCategories((prev) => {
            const next = new Set(prev);
            if (next.has(categoryId)) next.delete(categoryId);
            else next.add(categoryId);
            return next;
        });
    };
    React.useEffect(() => {
        if (config) return;

        try {
            const saved = getSavedAssessments();
            const byCurrentId = currentAssessmentId ? saved.find((item) => item.id === currentAssessmentId) : undefined;
            const fallback = saved.find((item) => item.status === 'in-progress') || saved[0];
            const candidate = byCurrentId || fallback;

            if (candidate) {
                loadAssessment(candidate.id);
            }
        } catch (error) {
            console.error('Assessment recovery failed.', error);
        }
    }, [config, currentAssessmentId, getSavedAssessments, loadAssessment]);

    const evaluateCompletion = () => {
        let unanswered = 0;
        let missingRequired = 0;

        data.forEach((category) => {
            category.questions.forEach((question) => {
                const answer = answers[question.id];
                const answered = !!answer?.status && answer.status !== 'Unanswered';

                if (!answered) {
                    unanswered += 1;
                    return;
                }

                if ((answer.status === 'No' || answer.status === 'Unsure') && !answer?.riskRating) {
                    missingRequired += 1;
                }
            });
        });

        return { unanswered, missingRequired };
    };

    const tryGenerateReport = (ignoreUnanswered: boolean = false) => {
        const evaluation = evaluateCompletion();
        setShowActions(false);

        if (evaluation.missingRequired > 0) {
            setMissingRequiredCount(evaluation.missingRequired);
            setShowRequiredModal(true);
            return;
        }

        if (evaluation.unanswered > 0 && !ignoreUnanswered) {
            setUnansweredCount(evaluation.unanswered);
            setShowWarningModal(true);
            return;
        }

        completeAssessment();
        router.push('/report');
    };

    const activeCategory = data.find((category) => category.id === selectedCategoryId);
    const showAll = selectedCategoryId === 'all';


    if (!config) {
        return (
            <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
                <div className="max-w-md w-full bg-card border rounded-xl p-6 text-center space-y-4">
                    <h2 className="text-xl font-semibold">No assessment loaded</h2>
                    <p className="text-sm text-muted-foreground">Start a new assessment or resume one from My Assessments.</p>
                    <div className="flex justify-center gap-3">
                        <Link href="/" className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
                            Start New
                        </Link>
                        <Link href="/assessments" className="px-4 py-2 rounded-md border border-border text-sm font-medium hover:bg-muted transition-colors">
                            My Assessments
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden">
            <header className="h-16 border-b flex items-center justify-between px-6 shrink-0 bg-card z-50">
                <div className="flex items-center gap-4">
                    <Link href="/assessments" className="p-2 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="My Assessments">
                        <FolderOpen size={20} />
                    </Link>
                    <Link href="/questions" className="p-2 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Question Configuration">
                        <Settings size={20} />
                    </Link>
                    <h1 className="font-semibold text-lg tracking-tight">Safety Assessment</h1>
                    <span className="text-xs px-2 py-1 bg-muted rounded text-muted-foreground font-mono">v2.0</span>
                </div>

                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-3">
                        <div className="text-right hidden sm:block">
                            <div className="text-xs text-muted-foreground uppercase font-semibold">Total Progress</div>
                            <div className="text-sm font-medium">{overallProgress.percentage}% Completed</div>
                        </div>
                        <div className="w-10 h-10 rounded-full border-4 border-muted relative flex items-center justify-center">
                            <PieChart size={20} className="text-primary" />
                            <svg className="absolute top-0 left-0 w-full h-full -rotate-90 text-primary" viewBox="0 0 40 40">
                                {overallProgress.percentage > 0 && <circle cx="20" cy="20" r="18" fill="none" stroke="currentColor" strokeWidth="4" strokeDasharray="113" strokeDashoffset={113 - (113 * overallProgress.percentage) / 100} />}
                            </svg>
                        </div>
                    </div>

                    <div className="relative">
                        <button onClick={() => setShowActions(!showActions)} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors">
                            <span>Finish</span>
                            <ChevronDown size={16} />
                        </button>

                        {showActions && (
                            <div className="absolute right-0 top-full mt-2 w-52 bg-card border border-border rounded-md shadow-lg py-1 z-50 animate-in fade-in zoom-in-95">
                                <button onClick={() => tryGenerateReport(false)} className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted flex items-center gap-2 transition-colors">
                                    <FileText size={16} className="text-muted-foreground" /> <span>Save Report</span>
                                </button>
                                <button onClick={() => tryGenerateReport(false)} className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted flex items-center gap-2 transition-colors text-primary font-medium">
                                    <CheckCircle size={16} /> <span>Complete</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {showActions && <div className="fixed inset-0 z-40" onClick={() => setShowActions(false)} />}

            <div className="flex flex-1 overflow-hidden">
                <aside className={cn('border-r bg-muted/30 overflow-y-auto hidden md:block transition-all duration-300 ease-in-out relative group', isSidebarOpen ? 'w-64' : 'w-10')}>
                    <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="absolute right-2 top-2 z-20 p-1.5 rounded-md hover:bg-muted-foreground/10 text-muted-foreground/50 hover:text-foreground transition-colors" title={isSidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}>
                        {isSidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
                    </button>

                    <div className={cn('p-4 transition-opacity duration-200', isSidebarOpen ? 'opacity-100' : 'opacity-0 invisible')}>
                        <div className="text-xs font-semibold text-muted-foreground uppercase mb-3 pl-2">Categories</div>
                        <CategoryList selectedCategoryId={selectedCategoryId} onSelectCategory={setSelectedCategoryId} />
                    </div>
                </aside>

                <main className="flex-1 overflow-y-auto scroll-smooth bg-muted/10 p-4 sm:p-8">
                    <div className="max-w-3xl mx-auto space-y-8 pb-20">
                        {showAll ? (
                            <div className="space-y-12">
                                <div className="mb-6">
                                    <h2 className="text-2xl font-bold tracking-tight mb-2">All Assessment Questions</h2>
                                    <p className="text-muted-foreground">Viewing all standards across {data.length} categories.</p>
                                </div>

                                {data.map((category) => {
                                    const isExpanded = expandedCategories.has(category.id);
                                    const catProgress = category.questions.filter((q) => {
                                        const status = answers[q.id]?.status;
                                        return status && status !== 'Unanswered';
                                    }).length;
                                    const catTotal = category.questions.length;

                                    return (
                                        <section key={category.id} id={`cat-${category.id}`} className="space-y-0">
                                            <button onClick={() => toggleCategory(category.id)} className="w-full flex items-center gap-3 py-4 px-2 border-b border-border/50 sticky top-0 bg-background/95 backdrop-blur z-10 hover:bg-muted/50 transition-colors rounded-t-lg cursor-pointer group">
                                                <div className="shrink-0 text-muted-foreground group-hover:text-primary transition-colors">{isExpanded ? <ChevronDown size={20} /> : <ChevronRightIcon size={20} />}</div>
                                                <div className="w-1 h-8 bg-primary rounded-full" />
                                                <h3 className="text-xl font-bold tracking-tight text-left flex-1">{category.title}</h3>
                                                <span className={cn('text-xs font-medium px-2.5 py-1 rounded-full', catProgress === catTotal && catTotal > 0 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : catProgress > 0 ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-muted text-muted-foreground')}>
                                                    {catProgress}/{catTotal}
                                                </span>
                                            </button>

                                            {isExpanded && (
                                                <div className="space-y-6 pt-6 animate-in fade-in slide-in-from-top-2 duration-200">
                                                    {category.questions.map((question) => (
                                                        <QuestionCard key={question.id} question={question} categoryId={category.id} />
                                                    ))}
                                                </div>
                                            )}
                                        </section>
                                    );
                                })}
                            </div>
                        ) : activeCategory ? (
                            <>
                                <div className="mb-6">
                                    <h2 className="text-2xl font-bold tracking-tight mb-2">{activeCategory.title}</h2>
                                    <p className="text-muted-foreground">Answer each question and assign risk when responses are No or Unsure.</p>
                                </div>

                                <div className="space-y-6">
                                    {activeCategory.questions.map((question) => (
                                        <QuestionCard key={question.id} question={question} categoryId={activeCategory.id} />
                                    ))}
                                </div>
                            </>
                        ) : (
                            <div className="flex items-center justify-center h-full text-muted-foreground">Select a category to begin.</div>
                        )}
                    </div>
                </main>
            </div>

            {showWarningModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-card border border-border rounded-lg shadow-xl w-full max-w-md p-6 m-4">
                        <h3 className="text-xl font-bold mb-2 text-foreground">Unanswered Questions</h3>
                        <p className="text-muted-foreground mb-6">You have <span className="font-semibold text-primary">{unansweredCount}</span> unanswered questions.<br />These will be excluded from report scoring and analysis.</p>
                        <div className="flex gap-3 justify-end">
                            <button onClick={() => setShowWarningModal(false)} className="px-4 py-2 rounded-md hover:bg-muted font-medium transition-colors">Return to Assessment</button>
                            <button onClick={() => { setShowWarningModal(false); tryGenerateReport(true); }} className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 font-medium transition-colors">Generate Report Anyway</button>
                        </div>
                    </div>
                </div>
            )}

            {showRequiredModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-card border border-border rounded-lg shadow-xl w-full max-w-md p-6 m-4">
                        <h3 className="text-xl font-bold mb-2 text-foreground">Required Data Missing</h3>
                        <p className="text-muted-foreground mb-6"><span className="font-semibold text-primary">{missingRequiredCount}</span> No/Unsure responses are missing required<br />Risk Rating.</p>
                        <div className="flex justify-end">
                            <button onClick={() => setShowRequiredModal(false)} className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 font-medium transition-colors">Continue Editing</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
