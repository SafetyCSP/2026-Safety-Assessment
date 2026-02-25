"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AssessmentProvider, useAssessment } from '@/context/AssessmentContext';
import { calculateStats, generateCSV } from '@/lib/reportUtils';
import { ArrowLeft, Printer, ShieldAlert, CheckCircle2, AlertTriangle, AlertOctagon, XCircle, RefreshCw, FileText, Download, FileSpreadsheet, File, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RiskRating } from '@/types/standards';
import { useRouter } from 'next/navigation';

export default function ReportPage() {
    return (
        <ReportContent />
    );
}

function ReportContent() {
    const { data, answers, config, overallProgress, resetAssessment } = useAssessment();
    const router = useRouter();
    const [showExportMenu, setShowExportMenu] = useState(false);
    const [viewMode, setViewMode] = useState<'findings' | 'full'>('findings');
    const [stats, setStats] = useState({
        high: 0,
        medium: 0,
        low: 0,
        unknown: 0,
        good: 0,
        totalRisks: 0,
        complianceScore: 0,
        totalQuestions: 0,
        complianceCount: 0
    });

    useEffect(() => {
        const newStats = calculateStats(data, answers);
        setStats(newStats);
    }, [answers, data]);

    // Consolidate findings logic
    const getAllAnswered = () => {
        return data.flatMap(cat =>
            cat.questions
                .filter(q => {
                    const status = answers[q.id]?.status;
                    return status && status !== 'Unanswered';
                })
                .map(q => ({
                    question: q,
                    answer: answers[q.id],
                    category: cat
                }))
        );
    };

    const allAnswered = getAllAnswered();
    const findingsOnly = allAnswered.filter(item => item.answer.status === 'No' || item.answer.status === 'Unsure');

    const displayedItems = viewMode === 'findings' ? findingsOnly : allAnswered;

    const handlePrint = () => {
        window.print();
    };

    const handleStartNew = () => {
        if (window.confirm("Are you sure you want to start a new assessment? This will clear all current data.")) {
            resetAssessment();
            router.push('/');
        }
    };

    const handleExportCSV = () => {
        const csv = generateCSV(data, answers);
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `AI-Safety-Assessment-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    const handleExportWord = () => {
        // Create a simple HTML structure for the Word doc
        const content = document.querySelector('main')?.innerHTML;
        if (!content) return;

        const header = `
            <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
            <head><meta charset='utf-8'><title>Assessment Report</title>
            <style>
                body { font-family: Calibri, sans-serif; }
                h1 { font-size: 24pt; }
                h2 { font-size: 18pt; margin-top: 20px; }
                table { border-collapse: collapse; width: 100%; }
                td, th { border: 1px solid #ddd; padding: 8px; }
                .risk-high { color: red; }
                .risk-medium { color: orange; }
                .risk-low { color: #D4AF37; } /* Darker yellow for visibility */
            </style>
            </head><body>
        `;
        const footer = "</body></html>";
        const sourceHTML = header + content + footer;

        const blob = new Blob(['\ufeff', sourceHTML], { type: 'application/msword' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `AI-Safety-Assessment-Report-${new Date().toISOString().split('T')[0]}.doc`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    return (
        <div className="min-h-screen bg-background text-foreground pb-20 print:pb-0 print:bg-white">

            {/* Navigation / Actions - Hidden on Print */}
            <div className="print:hidden sticky top-0 z-10 bg-background/80 backdrop-blur border-b p-4 flex justify-between items-center max-w-5xl mx-auto w-full">
                <Link href="/assessment" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
                    <ArrowLeft size={20} />
                    Back to Assessment
                </Link>
                <div className="flex gap-3 relative">
                    <button
                        onClick={handleStartNew}
                        className="flex items-center gap-2 px-4 py-2 rounded-md font-medium text-destructive hover:bg-destructive/10 transition-colors"
                    >
                        <RefreshCw size={18} />
                        New Assessment
                    </button>

                    <div className="relative">
                        <button
                            onClick={() => setShowExportMenu(!showExportMenu)}
                            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium hover:bg-primary/90 transition-colors"
                        >
                            <Download size={18} />
                            Export Options
                        </button>

                        {showExportMenu && (
                            <div className="absolute right-0 top-full mt-2 w-56 bg-card border border-border rounded-md shadow-lg py-1 z-50 animate-in fade-in zoom-in-95">
                                <button
                                    onClick={() => { handlePrint(); setShowExportMenu(false); }}
                                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted flex items-center gap-2 transition-colors"
                                >
                                    <Printer size={16} className="text-muted-foreground" />
                                    <span>Print / Save PDF</span>
                                </button>
                                <button
                                    onClick={() => { handleExportCSV(); setShowExportMenu(false); }}
                                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted flex items-center gap-2 transition-colors"
                                >
                                    <FileSpreadsheet size={16} className="text-muted-foreground" />
                                    <span>Export CSV</span>
                                </button>
                                <button
                                    onClick={() => { handleExportWord(); setShowExportMenu(false); }}
                                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted flex items-center gap-2 transition-colors"
                                >
                                    <File size={16} className="text-muted-foreground" />
                                    <span>Export Word (.doc)</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Click overlap to close menu */}
                {showExportMenu && (
                    <div className="fixed inset-0 z-0" onClick={() => setShowExportMenu(false)} />
                )}
            </div>

            <main className="max-w-5xl mx-auto p-4 sm:p-8 space-y-8 print:p-0 print:space-y-6">



                {/* Title Page Group */}
                <div className="break-after-page space-y-8">
                    {/* Header Section */}
                    <header className="border-b-2 border-primary/20 pb-6 print:pb-4">
                        <div className="flex justify-between items-start">
                            <div>
                                <h1 className="text-3xl font-bold tracking-tight mb-2">
                                    2026 Grainger Safety Assessment Report
                                </h1>
                            </div>
                            <div className="text-right">
                                <div className="text-2xl font-bold text-primary">{stats.complianceScore}%</div>
                                <div className="text-sm text-muted-foreground uppercase font-semibold">Compliance Score</div>
                            </div>
                        </div>

                        {config && (
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mt-8 text-sm print:grid-cols-3">
                                <div className="space-y-1">
                                    <h4 className="text-xs uppercase font-bold text-muted-foreground tracking-wider border-b pb-1 mb-2">Customer</h4>
                                    <div className="font-medium">{config.customer.name}</div>
                                    <div className="text-muted-foreground">{config.customer.location}</div>
                                    {config.customer.sapAccountNumber && <div className="text-xs text-muted-foreground mt-1">SAP: {config.customer.sapAccountNumber}</div>}
                                    {config.customer.contact && <div className="text-xs text-muted-foreground">Contact: {config.customer.contact}</div>}
                                    {config.customer.trackCode && <div className="text-xs text-muted-foreground">Track: {config.customer.trackCode}{config.customer.subtrackCode ? ` / ${config.customer.subtrackCode}` : ''}</div>}
                                    {config.industry && config.industry.length > 0 && <div className="text-xs text-muted-foreground mt-1">Industry: {config.industry.join(", ")}</div>}
                                </div>

                                <div className="space-y-1">
                                    <h4 className="text-xs uppercase font-bold text-muted-foreground tracking-wider border-b pb-1 mb-2">Assessor</h4>
                                    <div className="font-medium">{config.assessor.name}</div>
                                    <div className="text-muted-foreground">Date: {config.assessor.date}</div>
                                </div>

                                <div className="space-y-1">
                                    <h4 className="text-xs uppercase font-bold text-muted-foreground tracking-wider border-b pb-1 mb-2">Account Manager</h4>
                                    <div className="font-medium">{config.accountManager.name}</div>
                                    <div className="text-muted-foreground">{config.accountManager.email}</div>
                                    <div className="text-muted-foreground">{config.accountManager.phone}</div>
                                </div>
                            </div>
                        )}
                    </header>

                    {/* Risk Breakdown */}
                    <section className="bg-card rounded-xl border shadow-sm p-6 print:shadow-none print:border print:p-4">
                        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <ShieldAlert className="text-primary" size={20} />
                            Assessment Summary
                        </h2>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                            <RiskCard count={stats.good} label="Good (Compliant)" color="green" icon={<CheckCircle2 size={24} />} />
                            <RiskCard count={stats.high} label="High Priority" color="red" icon={<AlertOctagon size={24} />} />
                            <RiskCard count={stats.medium} label="Medium Priority" color="orange" icon={<AlertTriangle size={24} />} />
                            <RiskCard count={stats.low} label="Low Priority" color="yellow" icon={<ShieldAlert size={24} />} />
                            <RiskCard count={stats.unknown} label="Unknown Priority" color="slate" icon={<AlertCircle size={24} />} />
                        </div>
                    </section>
                </div>

                {/* View Filters */}
                <div className="flex justify-end print:hidden">
                    <div className="bg-muted p-1 rounded-lg flex gap-1">
                        <button
                            onClick={() => setViewMode('findings')}
                            className={cn(
                                "px-3 py-1.5 text-sm font-medium rounded-md transition-all",
                                viewMode === 'findings'
                                    ? "bg-background text-foreground shadow-sm"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            Findings Only
                        </button>
                        <button
                            onClick={() => setViewMode('full')}
                            className={cn(
                                "px-3 py-1.5 text-sm font-medium rounded-md transition-all",
                                viewMode === 'full'
                                    ? "bg-background text-foreground shadow-sm"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            Full Report
                        </button>
                    </div>
                </div>

                <ExecutiveSummary stats={stats} findings={findingsOnly} config={config} data={data} />

                {/* Report Items List */}
                <section className="space-y-4">
                    <h2 className="text-xl font-bold border-b pb-2 flex items-center gap-2">
                        {viewMode === 'findings' ? (
                            <XCircle className="text-destructive" size={22} />
                        ) : (
                            <FileText className="text-primary" size={22} />
                        )}
                        {viewMode === 'findings' ? "Key Findings" : "Full Assessment Details"} ({displayedItems.length})
                    </h2>

                    {displayedItems.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground bg-muted/20 rounded-lg border border-dashed">
                            <CheckCircle2 size={48} className="mx-auto mb-3 text-green-500/50" />
                            <p>
                                {viewMode === 'findings'
                                    ? "No compliance issues found. Excellent work!"
                                    : "No questions have been answered yet."}
                            </p>
                        </div>
                    ) : (
                        <div className="grid gap-4 print:block print:space-y-4">
                            {displayedItems.map((item, idx) => (
                                <div key={idx} className="bg-card rounded-lg border p-5 shadow-sm break-inside-avoid print:shadow-none print:border-gray-300">
                                    <div className="flex justify-between items-start gap-4 mb-2">
                                        <div>
                                            <span className="text-xs font-semibold uppercase text-muted-foreground tracking-wider block mb-1">
                                                {item.category.title}
                                            </span>
                                            <h3 className="font-medium mt-1 text-lg leading-tight">{item.question.text}</h3>

                                            {/* References Display Logic */}
                                            {item.question.references && item.answer.selectedStandards && item.answer.selectedStandards.length > 0 && (
                                                <div className="mt-3">
                                                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 block">Applicable Standards:</span>
                                                    <ul className="list-disc pl-5 space-y-1">
                                                        {item.answer.selectedStandards.map((selectionKey) => {
                                                            // Handle composite keys "key__index" vs legacy "key"
                                                            let refKey = selectionKey;
                                                            let lineIndex = -1;

                                                            if (selectionKey.includes('__')) {
                                                                const parts = selectionKey.split('__');
                                                                refKey = parts[0];
                                                                lineIndex = parseInt(parts[1], 10);
                                                            }

                                                            // Get the full reference text block
                                                            // We must cast because Typescript might not know 'key' is an index of references
                                                            // @ts-ignore
                                                            const fullText = item.question.references[refKey] as string;

                                                            if (!fullText) return null;

                                                            let displayText = fullText;

                                                            // If granular index is specified, pick that line (respecting groups)
                                                            if (lineIndex >= 0) {
                                                                const rawLines = fullText.split(/\r?\n/).filter(l => l.trim().length > 0);
                                                                // Reconstruct groups to match index
                                                                const groups: string[] = [];
                                                                rawLines.forEach(line => {
                                                                    if (line.trim().startsWith("Element of Performance")) {
                                                                        if (groups.length > 0) groups[groups.length - 1] += "\n" + line;
                                                                        else groups.push(line);
                                                                    } else {
                                                                        groups.push(line);
                                                                    }
                                                                });

                                                                if (groups[lineIndex]) {
                                                                    displayText = groups[lineIndex];
                                                                } else {
                                                                    return null;
                                                                }
                                                            }

                                                            return (
                                                                <li key={selectionKey} className="text-sm text-muted-foreground pl-1">
                                                                    {displayText}
                                                                </li>
                                                            );
                                                        })}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex flex-col items-end gap-2">
                                            <RiskBadge rating={item.answer.riskRating} />
                                            {viewMode === 'full' && item.answer.status === 'Yes' && (
                                                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-800 border border-green-200">
                                                    Compliant
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {item.answer.notes && (
                                        <div className="mt-3 bg-muted/30 p-3 rounded text-sm print:bg-gray-50">
                                            <span className="font-semibold text-xs text-muted-foreground uppercase block mb-1">Findings / Observations</span>
                                            {item.answer.notes}
                                        </div>
                                    )}

                                    {item.answer.recommendation && (
                                        <div className="mt-3 bg-blue-50/50 p-3 rounded text-sm border border-blue-100/50 print:bg-gray-50">
                                            <span className="font-semibold text-xs text-blue-700/80 uppercase block mb-1">Recommendations / Mitigation</span>
                                            {item.answer.recommendation}
                                        </div>
                                    )}

                                    {/* Evidence - Print Friendly Grid */}
                                    {item.answer.images && item.answer.images.length > 0 && (
                                        <div className="mt-4 pt-4 border-t border-border/50">
                                            <span className="font-semibold text-xs text-muted-foreground uppercase block mb-2">Evidence</span>
                                            <div className="flex gap-3 overflow-x-auto pb-2 print:flex-wrap print:overflow-visible">
                                                {item.answer.images.map((img, i) => (
                                                    <div key={img.id || i} className="flex flex-col gap-1 items-center shrink-0">
                                                        {img.fileType === 'pdf' ? (
                                                            <div
                                                                role="button"
                                                                tabIndex={0}
                                                                onClick={() => {
                                                                    const byteString = atob(img.base64.split(',')[1]);
                                                                    const ab = new ArrayBuffer(byteString.length);
                                                                    const ia = new Uint8Array(ab);
                                                                    for (let j = 0; j < byteString.length; j++) ia[j] = byteString.charCodeAt(j);
                                                                    const blob = new Blob([ab], { type: 'application/pdf' });
                                                                    window.open(URL.createObjectURL(blob), '_blank');
                                                                }}
                                                                className="relative h-24 w-32 rounded border overflow-hidden block hover:opacity-90 transition-opacity cursor-pointer"
                                                            >
                                                                {img.thumbnail ? (
                                                                    <img
                                                                        src={img.thumbnail}
                                                                        alt={img.fileName || 'PDF preview'}
                                                                        className="w-full h-full object-cover"
                                                                    />
                                                                ) : (
                                                                    <div className="w-full h-full flex flex-col items-center justify-center bg-red-50 dark:bg-red-900/20">
                                                                        <FileText size={24} className="text-red-600 dark:text-red-400" />
                                                                    </div>
                                                                )}
                                                                <div className="absolute bottom-0 inset-x-0 bg-black/60 px-1 py-0.5 flex items-center gap-1">
                                                                    <FileText size={10} className="text-white shrink-0" />
                                                                    <span className="text-[9px] text-white truncate">{img.fileName || 'document.pdf'}</span>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <img
                                                                src={img.base64}
                                                                className="h-24 w-auto rounded border object-contain bg-black/5"
                                                                alt={img.caption || "Evidence"}
                                                            />
                                                        )}
                                                        {img.caption && (
                                                            <span className="text-[10px] text-muted-foreground max-w-[10rem] text-center block break-words leading-snug">
                                                                {img.caption}
                                                            </span>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                {/* Disclaimer */}
                <section className="mt-8 bg-muted/30 border rounded-xl p-6 print:p-4 print:border-none break-before-page">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Disclaimer</h3>
                    <p className="text-[10px] leading-relaxed text-muted-foreground print:text-[9px]">
                        This safety assessment (the &quot;Material&quot;) is made available to the user or other receiver of the Material for general informational purposes only. The Material has been developed with consideration of various factors relevant to the subject area, including federal laws and regulations in effect at the time the Information was created and/or certain good management practices relevant to the subject area. Because every industry and/or workplace presents unique circumstances, the Material does not constitute and is not intended to provide specific advice, assurances, or guarantees concerning any user&apos;s compliance with particular regulatory requirements (e.g., OSHA) or other applicable safety and/or health requirements or good management practices. The Material does not constitute training and does not replace the need to properly train all employees nor is the Material a substitute for an assessment of any safety or health hazards present at your facility by a health or safety professional or expert. Users are advised to consult with a legal or other professional advisor concerning specific regulatory compliance requirements applicable to their workplaces and appropriate use of the Material. Users and receivers of the Material are subject in all respects to the terms and conditions set forth at www.grainger.com, including those provisions relating to limitation of liability. Users and receivers of the Material assume all responsibility and risk arising from any and all use of and/or reliance upon the Material, including any modifications made thereto. W.W. Grainger, Inc. (&quot;Grainger&quot;) makes no warranty, expressed or implied that the Material is current, accurate, appropriate or complete for any particular facility or requirements applicable to a particular facility. Grainger shall treat the Material as confidential information of the user or receiver of the Material, not disclose, publish or otherwise disseminate the Material to any third party (except as required by law or court order), and shall only make the Material available to Grainger&apos;s employees and representatives on a need to know basis.
                    </p>
                </section>

                <footer className="pt-8 border-t text-center text-sm text-muted-foreground print:text-xs">
                    <p>Generated by AI Site Safety Assessment Tool</p>
                    <p>{new Date().toLocaleString()}</p>
                </footer>
            </main >
        </div >
    );
}

// Helper to extract clean standard citation
const extractCitation = (text: string) => {
    // Splits by first colon to get "29 CFR 1910.303(b)" from "OSHA: 29 CFR..."
    const parts = text.split(':');
    return parts.length > 1 ? parts[0].trim() : text; // Take the part before the colon for citation
};

function ExecutiveSummary({ stats, findings, config, data }: { stats: any, findings: any[], config: any, data: any[] }) {
    if (!config) return null;

    // Calculate risk profile
    const riskProfile = stats.complianceScore > 90 ? "Low Risk" : stats.complianceScore > 70 ? "Moderate Risk" : "High Risk";
    const riskColor = stats.complianceScore > 90 ? "text-green-600" : stats.complianceScore > 70 ? "text-orange-600" : "text-red-600";

    // Calculate Top Categories by Risk
    const categoryStats = data.map(cat => {
        // Find findings that belong to this category
        // We assume findings.question.id matches cat.questions.id logic
        // But simple way is to check membership
        const catQuestionIds = new Set(cat.questions.map((q: any) => q.id));
        const catFindings = findings.filter(f => catQuestionIds.has(f.question.id));

        const highRisk = catFindings.filter(f => f.answer.riskRating === 'High').length;
        const mediumRisk = catFindings.filter(f => f.answer.riskRating === 'Medium').length;

        return {
            title: cat.title,
            totalFindings: catFindings.length,
            highRisk,
            mediumRisk,
            score: (highRisk * 3) + (mediumRisk * 2) + (catFindings.length - highRisk - mediumRisk) // Weighted score
        };
    }).sort((a, b) => b.score - a.score || b.highRisk - a.highRisk);

    const topCategories = categoryStats.filter(c => c.totalFindings > 0).slice(0, 3);
    const topCategoryNames = topCategories.map(c => c.title).join(", ");

    const standardsList = config.standards && config.standards.length > 0
        ? config.standards.join(", ")
        : "OSHA, TJC, and DNV standards";

    return (
        <section className="bg-card rounded-xl border p-8 print:p-0 print:border-none space-y-6 break-after-page">
            <div className="flex items-center justify-between border-b pb-6">
                <div>
                    <h2 className="text-2xl font-bold">Executive Summary</h2>
                    <p className="text-muted-foreground mt-1">
                        Assessment Date: {new Date(config.assessor.date).toLocaleDateString()}
                    </p>
                </div>
                <div className="text-right">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Compliance Score</h3>
                    <div className={`text-4xl font-bold ${riskColor}`}>
                        {stats.complianceScore}%
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <div>
                    <h3 className="text-lg font-bold mb-2">1. Assessment Overview</h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                        This report presents the findings of the safety assessment conducted at <strong>{config.customer.name}</strong> ({config.customer.location}) on {config.assessor.date}.
                        The objective of this review was to evaluate the degree of alignment with applicable <strong>regulatory compliance</strong> standards and identify areas where current conditions may differ from established requirements or best practices.
                    </p>
                    <p className="text-sm leading-relaxed text-muted-foreground mt-2">
                        The assessment identified <strong>{stats.totalQuestions - stats.complianceCount}</strong> areas where alignment with applicable standards has not yet been fully achieved.
                        Of these, <strong>{stats.high}</strong> were categorized as High Priority based on potential regulatory exposure.
                        {topCategoryNames && `The categories with the greatest number of identified gaps are ${topCategoryNames}.`}
                    </p>
                </div>

                <div>
                    <h3 className="text-lg font-bold mb-2">2. Critical Findings & Risk Profile</h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                        Based on observed conditions, the facility presents a <strong className={riskColor}>{riskProfile}</strong> profile.
                    </p>

                    {/* Top Risk Categories List */}
                    {topCategories.length > 0 && (
                        <div className="mt-4">
                            <h4 className="text-sm font-semibold text-foreground mb-3">Categories with Identified Gaps:</h4>
                            <div className="grid gap-3 sm:grid-cols-3">
                                {topCategories.map((cat, idx) => (
                                    <div key={idx} className="bg-muted/20 p-3 rounded-lg border">
                                        <div className="font-semibold text-sm truncate" title={cat.title}>{cat.title}</div>
                                        <div className="mt-2 flex gap-2 text-xs">
                                            <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full font-medium">
                                                {cat.highRisk} High
                                            </span>
                                            <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full font-medium">
                                                {cat.mediumRisk} Med
                                            </span>
                                        </div>
                                        <div className="mt-2 text-xs text-muted-foreground">
                                            {cat.totalFindings} total findings
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div>
                    <h3 className="text-lg font-bold mb-2">3. Recommendations for Remediation</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                        The following recommendations have been identified to support alignment with applicable standards and best practices:
                    </p>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="border p-3 rounded bg-muted/10">
                            <h4 className="font-semibold text-sm mb-2 text-foreground">Near-Term Opportunities</h4>
                            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                                {stats.high > 0
                                    ? <li>Review {stats.high} High Priority items where gaps were observed relative to applicable requirements.</li>
                                    : <li>Review all items where alignment with standards has not yet been fully achieved.</li>}
                                <li>Ensure all emergency exits are clear and accessible.</li>
                            </ul>
                        </div>
                        <div className="border p-3 rounded bg-muted/10">
                            <h4 className="font-semibold text-sm mb-2 text-foreground">Ongoing Opportunities</h4>
                            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                                <li>Conduct refresher training for affected staff.</li>
                                <li>Develop a corrective action plan to track resolution of Medium Priority items.</li>
                            </ul>
                        </div>
                    </div>
                </div>

                <div>
                    <h3 className="text-lg font-bold mb-2">4. Summary</h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                        This assessment identified areas where <strong>{config.customer.name}</strong> is currently aligned with applicable standards, as well as areas where further action may be needed to achieve full alignment.
                        {stats.complianceScore < 100
                            ? " Addressing the identified gaps will bring the facility into closer alignment with regulatory requirements and industry best practices. The findings in this report are intended to support ongoing improvement efforts."
                            : " The facility demonstrates a strong commitment to safety and regulatory compliance. Continued self-assessment and periodic review are recommended to maintain this level of alignment."}
                    </p>
                </div>
            </div>
        </section>
    );
}

function RiskCard({ count, label, color, icon }: any) {
    const colorStyles = {
        red: "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900",
        orange: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-900",
        yellow: "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-900",
        green: "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-900",
        slate: "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900/20 dark:text-slate-400 dark:border-slate-900"
    };

    return (
        <div className={cn("p-4 rounded-lg border flex items-center gap-4", colorStyles[color as keyof typeof colorStyles])}>
            <div className="p-2 bg-white/50 rounded-full dark:bg-black/20">
                {icon}
            </div>
            <div>
                <div className="text-3xl font-bold">{count}</div>
                <div className="text-sm font-medium opacity-80">{label}</div>
            </div>
        </div>
    );
}

function RiskBadge({ rating }: { rating?: RiskRating }) {
    if (!rating) return null;

    const styles = {
        Good: "bg-green-100 text-green-800 border-green-200",
        Low: "bg-yellow-100 text-yellow-800 border-yellow-200",
        Medium: "bg-orange-100 text-orange-800 border-orange-200",
        High: "bg-red-100 text-red-800 border-red-200",
        Unknown: "bg-slate-100 text-slate-800 border-slate-200"
    };

    return (
        <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-bold border uppercase shrink-0", styles[rating])}>
            {rating} Risk
        </span>
    );
}
