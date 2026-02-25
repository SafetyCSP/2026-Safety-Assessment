"use client";

import React, { useState, useEffect } from 'react';
import { AssessmentProvider, useAssessment } from '@/context/AssessmentContext';
import { CategoryList } from '@/components/CategoryList';
import { QuestionCard } from '@/components/QuestionCard';
import Link from 'next/link';
import { ArrowLeft, PieChart, Save, ChevronDown, ChevronRight as ChevronRightIcon, FileText, CheckCircle, ChevronLeft, ChevronRight, FolderOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

export default function AssessmentPage() {
    return (
        <AssessmentLayout />
    );
}

function AssessmentLayout() {
    const { data, answers, overallProgress, completeAssessment } = useAssessment();
    const router = useRouter();
    const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
    const [showActions, setShowActions] = useState(false);
    const [showWarningModal, setShowWarningModal] = useState(false);
    const [incompleteCount, setIncompleteCount] = useState(0);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

    const toggleCategory = (categoryId: string) => {
        setExpandedCategories(prev => {
            const next = new Set(prev);
            if (next.has(categoryId)) {
                next.delete(categoryId);
            } else {
                next.add(categoryId);
            }
            return next;
        });
    };

    const handleComplete = () => {
        console.log("handleComplete called - Starting completion process");
        setShowActions(false); // Close dropdown immediately

        let unansweredCount = 0;
        let totalCount = 0;

        if (!data) {
            console.error("No data found");
            return;
        }

        data.forEach(cat => {
            cat.questions.forEach(q => {
                totalCount++;
                const status = answers[q.id]?.status;
                if (!status || status === 'Unanswered') {
                    unansweredCount++;
                }
            });
        });

        console.log(`Counts: Total=${totalCount}, Unanswered=${unansweredCount}`);

        if (unansweredCount > 0) {
            console.log("Setting incomplete count and showing modal");
            setIncompleteCount(unansweredCount);
            setShowWarningModal(true);
        } else {
            console.log("All complete, navigating to report");
            completeAssessment();
            router.push('/report');
        }
    };

    // Default to 'all'
    useEffect(() => {
        if (!selectedCategoryId) {
            setSelectedCategoryId('all');
        }
    }, [selectedCategoryId]);

    const activeCategory = data.find(c => c.id === selectedCategoryId);
    const showAll = selectedCategoryId === 'all';

    return (
        <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden">
            {/* Header */}
            <header className="h-16 border-b flex items-center justify-between px-6 shrink-0 bg-card z-50">
                <div className="flex items-center gap-4">
                    <Link href="/assessments" className="p-2 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="My Assessments">
                        <FolderOpen size={20} />
                    </Link>
                    <h1 className="font-semibold text-lg tracking-tight">2026 Grainger Safety Assessment</h1>
                    <span className="text-xs px-2 py-1 bg-muted rounded text-muted-foreground font-mono">v1.1</span>
                </div>

                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-3">
                        <div className="text-right hidden sm:block">
                            <div className="text-xs text-muted-foreground uppercase font-semibold">Total Progress</div>
                            <div className="text-sm font-number font-medium">{overallProgress.percentage}% Completed</div>
                        </div>
                        <div className="w-10 h-10 rounded-full border-4 border-muted relative flex items-center justify-center">
                            <PieChart size={20} className="text-primary" />
                            <svg className="absolute top-0 left-0 w-full h-full -rotate-90 text-primary" viewBox="0 0 40 40">
                                <circle cx="20" cy="20" r="18" fill="none" stroke="currentColor" strokeWidth="4" strokeDasharray="113" strokeDashoffset={113 - (113 * overallProgress.percentage) / 100} className="opacity-0" />
                                {overallProgress.percentage > 0 && (
                                    <circle cx="20" cy="20" r="18" fill="none" stroke="currentColor" strokeWidth="4" strokeDasharray="113" strokeDashoffset={113 - (113 * overallProgress.percentage) / 100} />
                                )}
                            </svg>
                        </div>
                    </div>

                    <div className="relative">
                        <button
                            onClick={() => setShowActions(!showActions)}
                            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
                        >
                            <span>Finish</span>
                            <ChevronDown size={16} />
                        </button>

                        {showActions && (
                            <div className="absolute right-0 top-full mt-2 w-48 bg-card border border-border rounded-md shadow-lg py-1 z-50 animate-in fade-in zoom-in-95">
                                <button
                                    onClick={() => { completeAssessment(); router.push('/report'); }}
                                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted flex items-center gap-2 transition-colors"
                                >
                                    <FileText size={16} className="text-muted-foreground" />
                                    <span>Save Report</span>
                                </button>
                                <button
                                    onClick={handleComplete}
                                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted flex items-center gap-2 transition-colors text-primary font-medium"
                                >
                                    <CheckCircle size={16} />
                                    <span>Complete</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* Click overlap to close menu */}
            {showActions && (
                <div className="fixed inset-0 z-40" onClick={() => setShowActions(false)} />
            )}

            {/* Main Content */}
            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar */}
                <aside className={cn(
                    "border-r bg-muted/30 overflow-y-auto hidden md:block transition-all duration-300 ease-in-out relative group",
                    isSidebarOpen ? "w-64" : "w-10"
                )}>
                    <button
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className="absolute right-2 top-2 z-20 p-1.5 rounded-md hover:bg-muted-foreground/10 text-muted-foreground/50 hover:text-foreground transition-colors"
                        title={isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
                    >
                        {isSidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
                    </button>

                    <div className={cn(
                        "p-4 transition-opacity duration-200",
                        isSidebarOpen ? "opacity-100" : "opacity-0 invisible"
                    )}>
                        <div className="text-xs font-semibold text-muted-foreground uppercase mb-3 pl-2">Categories</div>
                        <CategoryList
                            selectedCategoryId={selectedCategoryId}
                            onSelectCategory={setSelectedCategoryId}
                        />
                    </div>
                </aside>

                {/* Question Area */}
                <main className="flex-1 overflow-y-auto scroll-smooth bg-muted/10 p-4 sm:p-8">
                    <div className="max-w-3xl mx-auto space-y-8 pb-20">
                        {showAll ? (
                            <div className="space-y-12">
                                <div className="mb-6">
                                    <h2 className="text-2xl font-bold tracking-tight mb-2">All Assessment Questions</h2>
                                    <p className="text-muted-foreground">
                                        Viewing all regulatory standards across {data.length} categories.
                                    </p>
                                </div>

                                {data.map(category => {
                                    const isExpanded = expandedCategories.has(category.id);
                                    const catProgress = category.questions.filter(q => answers[q.id] && answers[q.id].status !== 'Unanswered').length;
                                    const catTotal = category.questions.length;
                                    return (
                                        <section key={category.id} id={`cat-${category.id}`} className="space-y-0">
                                            <button
                                                onClick={() => toggleCategory(category.id)}
                                                className="w-full flex items-center gap-3 py-4 px-2 border-b border-border/50 sticky top-0 bg-background/95 backdrop-blur z-10 hover:bg-muted/50 transition-colors rounded-t-lg cursor-pointer group"
                                            >
                                                <div className="shrink-0 text-muted-foreground group-hover:text-primary transition-colors">
                                                    {isExpanded ? <ChevronDown size={20} /> : <ChevronRightIcon size={20} />}
                                                </div>
                                                <div className="w-1 h-8 bg-primary rounded-full" />
                                                <img src="/grainger-g.png" alt="Grainger" className="h-8 w-auto" />
                                                <h3 className="text-xl font-bold tracking-tight text-left flex-1">{category.title}</h3>
                                                <span className={cn(
                                                    "text-xs font-medium px-2.5 py-1 rounded-full",
                                                    catProgress === catTotal && catTotal > 0
                                                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                                        : catProgress > 0
                                                            ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                                            : "bg-muted text-muted-foreground"
                                                )}>
                                                    {catProgress}/{catTotal}
                                                </span>
                                            </button>

                                            {isExpanded && (
                                                <div className="space-y-6 pt-6 animate-in fade-in slide-in-from-top-2 duration-200">
                                                    {category.questions.map(q => (
                                                        <QuestionCard
                                                            key={q.id}
                                                            question={q}
                                                            categoryId={category.id}
                                                        />
                                                    ))}
                                                </div>
                                            )}
                                        </section>
                                    );
                                })}
                            </div>
                        ) : activeCategory ? (
                            <>
                                <div className="mb-6 flex items-start gap-4">
                                    <img src="/grainger-g.png" alt="Grainger" className="h-10 w-auto mt-1" />
                                    <div>
                                        <h2 className="text-2xl font-bold tracking-tight mb-2">{activeCategory.title}</h2>
                                        <p className="text-muted-foreground">
                                            Review the standards below and mark compliance status.
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    {activeCategory.questions.map(q => (
                                        <QuestionCard
                                            key={q.id}
                                            question={q}
                                            categoryId={activeCategory.id}
                                        />
                                    ))}
                                </div>
                            </>
                        ) : (
                            <div className="flex items-center justify-center h-full text-muted-foreground">
                                Select a category to begin.
                            </div>
                        )}
                    </div>
                </main>

            </div>



            {/* Warning Modal */}
            {showWarningModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-card border border-border rounded-lg shadow-xl w-full max-w-md p-6 m-4">
                        <h3 className="text-xl font-bold mb-2 text-foreground">Incomplete Assessment</h3>
                        <p className="text-muted-foreground mb-6">
                            You have <span className="font-semibold text-primary">{incompleteCount}</span> unanswered questions.
                            <br /><br />
                            These questions will be excluded from the final report analysis.
                        </p>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setShowWarningModal(false)}
                                className="px-4 py-2 rounded-md hover:bg-muted font-medium transition-colors"
                            >
                                Return to Assessment
                            </button>
                            <button
                                onClick={() => { completeAssessment(); router.push('/report'); }}
                                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 font-medium transition-colors"
                            >
                                Generate Report Anyway
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
}
