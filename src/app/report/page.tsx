"use client";

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAssessment } from '@/context/AssessmentContext';
import { calculateStats, generateCSV } from '@/lib/reportUtils';
import { Answer, AssessmentImage, Question, RiskRating } from '@/types/standards';
import { ArrowLeft, Printer, RefreshCw, Download, FileSpreadsheet, File, CloudUpload, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ExecutiveSummary {
    assessmentOverview: string;
    riskProfile: string;
    criticalFindings: string[];
    recommendedActions: string[];
    closingSummary: string;
}

function fallbackSummary(args: {
    customerName: string;
    location: string;
    assessorName: string;
    assessmentDate: string;
    score: number;
    threshold: number;
    answeredCount: number;
}): ExecutiveSummary {
    return {
        assessmentOverview: `Assessment completed for ${args.customerName} (${args.location}) on ${args.assessmentDate} by ${args.assessorName}. Passing score is ${args.score}% based on ${args.answeredCount} answered questions.`,
        riskProfile: args.score >= 90 ? 'Overall risk profile is low.' : args.score >= 75 ? 'Overall risk profile is moderate.' : 'Overall risk profile is elevated.',
        criticalFindings: ['Review No and Unsure responses first, with emphasis on high-risk items.'],
        recommendedActions: ['Assign corrective actions with owners and due dates.', 'Reassess corrected items to confirm closure.'],
        closingSummary: args.score >= args.threshold ? 'Assessment meets the threshold.' : 'Assessment is below threshold and needs remediation.',
    };
}

function splitReferenceLines(value: string): string[] {
    const rawLines = value.split(/\r?\n/).filter((line) => line.trim().length > 0);
    const lines: string[] = [];

    rawLines.forEach((line) => {
        if (line.trim().startsWith('Element of Performance')) {
            if (lines.length > 0) {
                lines[lines.length - 1] += `\n${line}`;
            } else {
                lines.push(line);
            }
            return;
        }

        lines.push(line);
    });

    return lines;
}

function resolveSelectedReferenceLabels(question: Question, selectedStandards?: string[]): string[] {
    if (!selectedStandards || selectedStandards.length === 0) {
        return [];
    }

    const labels: string[] = [];

    selectedStandards.forEach((entry) => {
        if (entry.startsWith('customstd:')) {
            const value = entry.substring('customstd:'.length).trim();
            if (value) {
                labels.push(`Custom: ${value}`);
            }
            return;
        }

        const [key, idxStr] = entry.split('__');
        const idx = Number(idxStr);
        const referenceValue = question.references[key as keyof typeof question.references];

        if (!referenceValue || Number.isNaN(idx)) return;

        const lines = splitReferenceLines(referenceValue);
        const line = lines[idx];

        if (line) {
            labels.push(line);
        }
    });

    return Array.from(new Set(labels));
}

export default function ReportPage() {
    const { data, answers, config, resetAssessment, currentAssessmentId, getSavedAssessments, loadAssessment } = useAssessment();
    const router = useRouter();

    const stats = useMemo(() => calculateStats(data, answers), [answers, data]);
    const [viewMode, setViewMode] = useState<'findings' | 'full'>('findings');
    const [showExportMenu, setShowExportMenu] = useState(false);
    const [summary, setSummary] = useState<ExecutiveSummary | null>(null);
    const [summarySource, setSummarySource] = useState<'ai' | 'fallback'>('fallback');
    const [syncMessage, setSyncMessage] = useState('');

    const answeredItems = useMemo(() => {
        return data.flatMap((category) =>
            category.questions
                .filter((question) => {
                    const status = answers[question.id]?.status;
                    return status && status !== 'Unanswered';
                })
                .map((question) => ({ category, question, answer: answers[question.id] }))
        );
    }, [answers, data]);

    const findingsOnly = useMemo(() => answeredItems.filter((item) => item.answer.status === 'No' || item.answer.status === 'Unsure'), [answeredItems]);
    const displayedItems = viewMode === 'findings' ? findingsOnly : answeredItems;

    React.useEffect(() => {
        if (config) return;

        try {
            const saved = getSavedAssessments();
            const byCurrentId = currentAssessmentId ? saved.find((item) => item.id === currentAssessmentId) : undefined;
            const fallback = saved.find((item) => item.status === 'completed') || saved.find((item) => item.status === 'in-progress') || saved[0];
            const candidate = byCurrentId || fallback;

            if (candidate) {
                loadAssessment(candidate.id);
            }
        } catch (error) {
            console.error('Report recovery failed.', error);
        }
    }, [config, currentAssessmentId, getSavedAssessments, loadAssessment]);

    React.useEffect(() => {
        if (!config) return;

        const fallback = fallbackSummary({
            customerName: config.customer.name || 'Customer',
            location: config.customer.location || 'Location',
            assessorName: config.assessor.name || 'Assessor',
            assessmentDate: config.assessor.date || new Date().toISOString().split('T')[0],
            score: stats.complianceScore,
            threshold: stats.threshold,
            answeredCount: stats.answeredCount,
        });

        let cancelled = false;

        const generate = async () => {
            try {
                const response = await fetch('/api/executive-summary', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        customerName: config.customer.name,
                        location: config.customer.location,
                        assessorName: config.assessor.name,
                        assessmentDate: config.assessor.date,
                        stats,
                        topFindings: findingsOnly.slice(0, 10).map((item) => ({
                            category: item.category.title,
                            question: item.question.text,
                            status: item.answer.status,
                            riskRating: item.answer.riskRating,
                        })),
                    }),
                });

                if (!response.ok) throw new Error('Summary generation failed');
                const json = await response.json();
                if (!cancelled) {
                    setSummary((json.summary || fallback) as ExecutiveSummary);
                    setSummarySource(json.source === 'ai' ? 'ai' : 'fallback');
                }
            } catch {
                if (!cancelled) {
                    setSummary(fallback);
                    setSummarySource('fallback');
                }
            }
        };

        generate();

        return () => {
            cancelled = true;
        };
    }, [config, findingsOnly, stats]);

    const handlePrint = () => window.print();

    const handleNewAssessment = () => {
        if (!window.confirm('Start a new assessment?')) return;
        resetAssessment();
        router.push('/');
    };

    const handleExportCSV = () => {
        const csv = generateCSV(data, answers);
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `safety-assessment-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleExportWord = () => {
        const content = document.querySelector('main')?.innerHTML;
        if (!content) return;

        const sourceHTML = `<html><head><meta charset='utf-8'><title>Assessment Report</title></head><body>${content}</body></html>`;
        const blob = new Blob(['\ufeff', sourceHTML], { type: 'application/msword' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `safety-assessment-report-${new Date().toISOString().split('T')[0]}.doc`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleCloudSync = async () => {
        setSyncMessage('Syncing to OneDrive/SharePoint...');

        try {
            const response = await fetch('/api/cloud-sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    assessmentId: currentAssessmentId || 'unsaved-assessment',
                    customerName: config?.customer.name || 'customer',
                    assessedAt: config?.assessor.date || new Date().toISOString(),
                    report: {
                        generatedAt: new Date().toISOString(),
                        config,
                        stats,
                        summary,
                        answers: Object.entries(answers).map(([questionId, answer]) => ({
                            questionId,
                            status: answer.status,
                            riskRating: answer.riskRating,
                            notes: answer.notes,
                            recommendation: answer.recommendation,
                            selectedStandards: answer.selectedStandards || [],
                            evidence: (answer.images || []).map((image) => ({ fileName: image.fileName, fileType: image.fileType, caption: image.caption })),
                        })),
                    },
                }),
            });

            const json = await response.json();
            if (!response.ok) throw new Error(json.error || 'Sync failed');
            setSyncMessage(json.webUrl ? `Synced: ${json.webUrl}` : 'Synced successfully.');
        } catch (error) {
            setSyncMessage(error instanceof Error ? error.message : 'Cloud sync failed.');
        }
    };

    if (!config) {
        return (
            <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
                <div className="max-w-md w-full bg-card border rounded-xl p-6 text-center space-y-4">
                    <h2 className="text-xl font-semibold">No assessment loaded</h2>
                    <p className="text-sm text-muted-foreground">Open a saved assessment or start a new one before viewing a report.</p>
                    <div className="flex justify-center gap-3">
                        <Link href="/assessments" className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
                            My Assessments
                        </Link>
                        <Link href="/" className="px-4 py-2 rounded-md border border-border text-sm font-medium hover:bg-muted transition-colors">
                            Start New
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background text-foreground pb-20 print:pb-0 print:bg-white">
            <div className="print:hidden sticky top-0 z-10 bg-background/80 backdrop-blur border-b p-4 flex justify-between items-center max-w-6xl mx-auto w-full">
                <Link href="/assessment" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
                    <ArrowLeft size={20} /> Back to Assessment
                </Link>

                <div className="flex gap-3 relative">
                    <button onClick={handleNewAssessment} className="flex items-center gap-2 px-4 py-2 rounded-md font-medium text-destructive hover:bg-destructive/10 transition-colors">
                        <RefreshCw size={18} /> New Assessment
                    </button>
                    <button onClick={handleCloudSync} className="flex items-center gap-2 px-4 py-2 rounded-md font-medium border border-border hover:bg-muted">
                        <CloudUpload size={18} /> Sync to OneDrive/SharePoint
                    </button>

                    <div className="relative">
                        <button onClick={() => setShowExportMenu(!showExportMenu)} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium hover:bg-primary/90 transition-colors">
                            <Download size={18} /> Export Options
                        </button>

                        {showExportMenu && (
                            <div className="absolute right-0 top-full mt-2 w-56 bg-white/100 dark:bg-zinc-900/100 opacity-100 border border-border rounded-md shadow-lg py-1 z-50">
                                <button onClick={() => { handlePrint(); setShowExportMenu(false); }} className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted flex items-center gap-2 transition-colors">
                                    <Printer size={16} className="text-muted-foreground" /> Export PDF (Print)
                                </button>
                                <button onClick={() => { handleExportCSV(); setShowExportMenu(false); }} className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted flex items-center gap-2 transition-colors">
                                    <FileSpreadsheet size={16} className="text-muted-foreground" /> Export CSV
                                </button>
                                <button onClick={() => { handleExportWord(); setShowExportMenu(false); }} className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted flex items-center gap-2 transition-colors">
                                    <File size={16} className="text-muted-foreground" /> Export Word (.doc)
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {syncMessage && <div className="max-w-6xl mx-auto px-4 mt-3 text-sm text-muted-foreground print:hidden">{syncMessage}</div>}

            <main className="max-w-6xl mx-auto p-4 sm:p-8 space-y-8 print:p-0 print:space-y-6">
                <header className="border-b-2 border-primary/20 pb-6 print:pb-4">
                    <div className="flex justify-between items-start gap-4">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight mb-2">Safety Assessment Report</h1>
                            <p className="text-sm text-muted-foreground">{config.customer.name} • {config.customer.location}</p>
                            <p className="text-sm text-muted-foreground">Assessor: {config.assessor.name} • Date: {config.assessor.date}</p>
                        </div>
                        <div className="text-right">
                            <div className="text-3xl font-bold text-primary">{stats.complianceScore}%</div>
                            <div className="text-sm text-muted-foreground uppercase font-semibold">Passing Score</div>
                            <div className={cn('text-xs mt-1 font-semibold', stats.meetsThreshold ? 'text-green-600' : 'text-red-600')}>
                                Threshold {stats.threshold}% {stats.meetsThreshold ? 'met' : 'not met'}
                            </div>
                        </div>
                    </div>
                </header>

                <section className="bg-card rounded-xl border p-6 space-y-3">
                    <h2 className="text-xl font-bold">Executive Summary</h2>
                    <p className="text-xs text-muted-foreground">Source: {summarySource === 'ai' ? 'AI-generated' : 'Fallback template'}</p>
                    {!summary ? (
                        <p className="text-sm text-muted-foreground">Generating summary...</p>
                    ) : (
                        <div className="space-y-4 text-sm leading-relaxed">
                            <div><h3 className="font-semibold mb-1">1. Assessment Overview</h3><p className="text-muted-foreground">{summary.assessmentOverview}</p></div>
                            <div><h3 className="font-semibold mb-1">2. Risk Profile</h3><p className="text-muted-foreground">{summary.riskProfile}</p></div>
                            <div><h3 className="font-semibold mb-1">3. Critical Findings</h3><ul className="list-disc pl-5 text-muted-foreground space-y-1">{summary.criticalFindings.map((item, idx) => <li key={`c-${idx}`}>{item}</li>)}</ul></div>
                            <div><h3 className="font-semibold mb-1">4. Recommended Actions</h3><ul className="list-disc pl-5 text-muted-foreground space-y-1">{summary.recommendedActions.map((item, idx) => <li key={`r-${idx}`}>{item}</li>)}</ul></div>
                            <div><h3 className="font-semibold mb-1">5. Closing Summary</h3><p className="text-muted-foreground">{summary.closingSummary}</p></div>
                        </div>
                    )}
                </section>

                <div className="flex justify-end print:hidden">
                    <div className="bg-muted p-1 rounded-lg flex gap-1">
                        <button onClick={() => setViewMode('findings')} className={cn('px-3 py-1.5 text-sm font-medium rounded-md transition-all', viewMode === 'findings' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>Findings Only</button>
                        <button onClick={() => setViewMode('full')} className={cn('px-3 py-1.5 text-sm font-medium rounded-md transition-all', viewMode === 'full' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>Full Report</button>
                    </div>
                </div>

                <section className="space-y-4">
                    <h2 className="text-xl font-bold border-b pb-2 flex items-center gap-2"><FileText size={22} className="text-primary" /> {viewMode === 'findings' ? 'Key Findings' : 'Answered Questions'} ({displayedItems.length})</h2>
                    {displayedItems.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground bg-muted/20 rounded-lg border border-dashed">No items to display.</div>
                    ) : (
                        <div className="grid gap-4 print:block print:space-y-4">
                            {displayedItems.map((item, idx) => (
                                <div key={`${item.question.id}-${idx}`} className="bg-card rounded-lg border p-5 shadow-sm break-inside-avoid print:shadow-none print:border-gray-300">
                                    <span className="text-xs font-semibold uppercase text-muted-foreground tracking-wider block mb-1">{item.category.title} • {item.question.id}</span>
                                    <h3 className="font-medium text-lg leading-tight mb-2">{item.question.text}</h3>
                                    <div className="flex flex-wrap gap-2 mb-2">
                                        <StatusBadge status={item.answer.status} />
                                        <RiskBadge rating={item.answer.riskRating} />
                                    </div>
                                    <ReferenceList question={item.question} selectedStandards={item.answer.selectedStandards} />
                                    <Field label="Findings" value={item.answer.notes} />
                                    <Field label="Recommendations" value={item.answer.recommendation} />
                                    <EvidenceGallery images={item.answer.images} />
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                <footer className="pt-8 border-t text-center text-sm text-muted-foreground print:text-xs">
                    <p>Generated by Safety Assessment Tool</p>
                    <p>{new Date().toLocaleString()}</p>
                </footer>
            </main>
        </div>
    );
}

function Field({ label, value }: { label: string; value?: string }) {
    if (!value || !value.trim()) return null;
    return (
        <div className="mb-2">
            <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-1">{label}</h4>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{value}</p>
        </div>
    );
}

function ReferenceList({ question, selectedStandards }: { question: Question; selectedStandards?: string[] }) {
    const references = resolveSelectedReferenceLabels(question, selectedStandards);

    if (references.length === 0) return null;

    return (
        <div className="mb-3">
            <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-1">Regulatory Non-Compliance References</h4>
            <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
                {references.map((reference, idx) => (
                    <li key={`${question.id}-ref-${idx}`} className="whitespace-pre-line">{reference}</li>
                ))}
            </ul>
        </div>
    );
}

function EvidenceGallery({ images }: { images?: AssessmentImage[] }) {
    if (!images || images.length === 0) return null;

    const openEvidence = (image: AssessmentImage, fallbackName: string) => {
        const viewer = window.open('about:blank', '_blank');
        if (!viewer) return;

        if (image.fileType === 'pdf') {
            const base64Part = image.base64.includes(',') ? image.base64.split(',')[1] : image.base64;
            const byteString = atob(base64Part);
            const bytes = new Uint8Array(byteString.length);

            for (let i = 0; i < byteString.length; i += 1) {
                bytes[i] = byteString.charCodeAt(i);
            }

            const blob = new Blob([bytes], { type: 'application/pdf' });
            const blobUrl = URL.createObjectURL(blob);

            viewer.document.title = image.fileName || fallbackName;
            viewer.document.body.style.margin = '0';
            viewer.document.body.innerHTML = `<embed src="${blobUrl}" type="application/pdf" style="width:100%;height:100vh;">`;
            viewer.addEventListener('beforeunload', () => URL.revokeObjectURL(blobUrl));
            return;
        }

        viewer.document.title = image.fileName || fallbackName;
        viewer.document.body.style.margin = '0';
        viewer.document.body.style.display = 'flex';
        viewer.document.body.style.justifyContent = 'center';
        viewer.document.body.style.alignItems = 'center';
        viewer.document.body.style.backgroundColor = '#0e0e0e';
        viewer.document.body.innerHTML = `<img src="${image.base64}" style="max-width:100%;max-height:100vh;object-fit:contain;">`;
    };

    return (
        <div className="mt-3">
            <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">Attached Evidence</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {images.map((img, idx) => {
                    const fileLabel = img.fileName || `Evidence ${idx + 1}`;
                    const href = img.base64;
                    const downloadName = img.fileName || (img.fileType === 'pdf' ? `evidence-${idx + 1}.pdf` : `evidence-${idx + 1}.png`);

                    return (
                        <div key={img.id || idx} className="border rounded-md overflow-hidden bg-muted/20">
                            <button
                                type="button"
                                onClick={() => openEvidence(img, fileLabel)}
                                className="w-full h-32 bg-black/5 flex items-center justify-center overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                                title="Open in new tab"
                            >
                                {img.fileType === 'pdf' ? (
                                    img.thumbnail ? (
                                        <img src={img.thumbnail} alt={img.fileName || 'PDF preview'} className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-xs text-muted-foreground px-2 text-center whitespace-pre-wrap break-words">PDF: {fileLabel}</span>
                                    )
                                ) : (
                                    <img src={img.base64} alt={img.caption || fileLabel} className="w-full h-full object-cover" />
                                )}
                            </button>
                            <div className="p-2 space-y-1">
                                <p className="text-xs font-medium whitespace-pre-wrap break-words">{fileLabel}</p>
                                {img.caption && <p className="text-xs text-muted-foreground whitespace-pre-wrap break-words">{img.caption}</p>}
                                <div className="flex items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={() => openEvidence(img, fileLabel)}
                                        className="inline-flex text-xs text-primary hover:underline"
                                    >
                                        Open
                                    </button>
                                    <a
                                        href={href}
                                        download={downloadName}
                                        className="inline-flex text-xs text-primary hover:underline"
                                    >
                                        Download
                                    </a>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function RiskBadge({ rating }: { rating?: RiskRating }) {
    if (!rating) return null;

    const styles: Record<RiskRating, string> = {
        Low: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        Medium: 'bg-orange-100 text-orange-800 border-orange-200',
        High: 'bg-red-100 text-red-800 border-red-200',
        Good: 'bg-green-100 text-green-800 border-green-200',
    };

    const label = rating === 'Good' ? 'Good' : `${rating} Risk`;

    return <span className={cn('px-2.5 py-0.5 rounded-full text-xs font-bold border uppercase shrink-0', styles[rating])}>{label}</span>;
}

function StatusBadge({ status }: { status: Answer['status'] }) {
    const styles: Record<Answer['status'], string> = {
        Yes: 'bg-green-100 text-green-700 border-green-200',
        No: 'bg-red-100 text-red-700 border-red-200',
        Unsure: 'bg-orange-100 text-orange-700 border-orange-200',
        NA: 'bg-slate-100 text-slate-700 border-slate-200',
        Unanswered: 'bg-muted text-muted-foreground border-border',
    };

    return <span className={cn('px-2.5 py-0.5 rounded-full text-xs font-semibold border', styles[status])}>{status === 'NA' ? 'N/A' : status}</span>;
}
