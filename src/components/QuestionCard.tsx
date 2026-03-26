"use client";

import React, { useMemo, useState } from 'react';
import { Question, AnswerStatus, RiskRating } from '@/types/standards';
import { useAssessment } from '@/context/AssessmentContext';
import { compressImage } from '@/lib/imageUtils';
import { generatePdfThumbnail } from '@/lib/pdfUtils';
import { FormattedTextarea } from '@/components/FormattedTextarea';
import { cn } from '@/lib/utils';
import { AlertCircle, Bookmark, Camera, ChevronDown, ChevronUp, FileText, ShieldAlert, Trash2, Sparkles, Loader2 } from 'lucide-react';

interface QuestionCardProps {
    question: Question;
    categoryId: string;
}

const RISK_BADGE_STYLES: Record<RiskRating, string> = {
    High: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900',
    Medium: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-900',
    Low: 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-900',
    Good: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-900',
};

const ACTIONABLE_RATINGS: Array<Exclude<RiskRating, 'Good'>> = ['High', 'Medium', 'Low'];

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

export function QuestionCard({ question }: QuestionCardProps) {
    const { answers, setAnswer, addImage, updateImageCaption, removeImage } = useAssessment();
    const currentAnswer = answers[question.id];

    const [showRefs, setShowRefs] = useState(false);
    const [showNotes, setShowNotes] = useState(false);
    const [showRiskModal, setShowRiskModal] = useState(false);
    const [analyzingImageId, setAnalyzingImageId] = useState<string | null>(null);

    const status = currentAnswer?.status;
    const answered = !!status && status !== 'Unanswered';
    const requiresRiskSelection = status === 'No' || status === 'Unsure';
    const hasRisk = !!currentAnswer?.riskRating;
    const isMissingRequired = requiresRiskSelection && !hasRisk;

    const handleStatusChange = (newStatus: AnswerStatus) => {
        if (newStatus === 'Yes') {
            setAnswer(question.id, { status: newStatus, riskRating: 'Good' });
            setShowRiskModal(false);
            return;
        }

        if (newStatus === 'No' || newStatus === 'Unsure') {
            setAnswer(question.id, { status: newStatus });
            setShowRiskModal(true);
            return;
        }

        setAnswer(question.id, { status: newStatus, riskRating: undefined });
        setShowRiskModal(false);
    };

    const selectActionableRisk = (rating: Exclude<RiskRating, 'Good'>) => {
        setAnswer(question.id, { riskRating: rating });
        setShowRiskModal(false);
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        for (let i = 0; i < files.length; i += 1) {
            const file = files[i];
            const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

            try {
                if (isPdf) {
                    const base64 = await new Promise<string>((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = () => resolve(reader.result as string);
                        reader.onerror = reject;
                        reader.readAsDataURL(file);
                    });

                    let thumbnail = '';
                    try {
                        thumbnail = await generatePdfThumbnail(base64);
                    } catch (thumbErr) {
                        console.error('PDF thumbnail generation failed:', thumbErr);
                    }

                    addImage(question.id, base64, 'pdf', file.name, thumbnail);
                } else {
                    const compressedBase64 = await compressImage(file);
                    addImage(question.id, compressedBase64, 'image', file.name);
                }
            } catch (error) {
                console.error('File processing failed', error);
                alert(`Failed to process "${file.name}". Please try another file.`);
            }
        }

        e.target.value = '';
    };

    const handleAnalyzeImage = async (base64: string, imageId: string) => {
        try {
            setAnalyzingImageId(imageId);
            
            let contextText = question.text;
            if (currentAnswer?.selectedStandards && currentAnswer.selectedStandards.length > 0) {
                contextText += '\n\nSelected Standards:\n';
                currentAnswer.selectedStandards.forEach(std => {
                    if (std.startsWith('customstd:')) {
                        contextText += `- ${std.substring('customstd:'.length)}\n`;
                    } else {
                        const [key, idx] = std.split('__');
                        if (question.references[key as keyof typeof question.references]) {
                            const lines = splitReferenceLines(question.references[key as keyof typeof question.references]!);
                            if (lines[parseInt(idx)]) contextText += `- ${lines[parseInt(idx)]}\n`;
                        }
                    }
                });
            }

            const response = await fetch('/api/analyze-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: base64, context: contextText })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to analyze');

            if (data.analysis) {
                const { status, riskRating, notes, recommendation } = data.analysis;
                
                const existingNotes = currentAnswer?.notes ? currentAnswer.notes + '\n\n' : '';
                const existingRec = currentAnswer?.recommendation ? currentAnswer.recommendation + '\n\n' : '';
                
                setAnswer(question.id, {
                    status: (status as AnswerStatus) || currentAnswer?.status,
                    riskRating: (riskRating as RiskRating) || currentAnswer?.riskRating,
                    notes: notes ? existingNotes + "AI Analysis:\n" + notes : currentAnswer?.notes,
                    recommendation: recommendation ? existingRec + "AI Suggestion:\n" + recommendation : currentAnswer?.recommendation
                });
                
                setShowNotes(true);
            }
        } catch (error) {
            console.error(error);
            alert("Failed to analyze image.");
        } finally {
            setAnalyzingImageId(null);
        }
    };

    const selectedStandards = useMemo(() => currentAnswer?.selectedStandards || [], [currentAnswer?.selectedStandards]);

    const customStandardValue = useMemo(() => {
        const match = selectedStandards.find((item) => item.startsWith('customstd:'));
        return match ? match.substring('customstd:'.length) : '';
    }, [selectedStandards]);

    return (
        <>
            <div className="bg-card text-card-foreground rounded-xl border border-border shadow-sm mb-4 overflow-hidden transition-all hover:shadow-md dark:bg-[#1a1a1a] dark:border-[#333]">
                <div className="p-6 space-y-4">
                    <div className="flex gap-4 items-start">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                                <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">{question.id}</span>
                                {question.updated && (
                                    <span className="text-xs font-semibold text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/20 px-2 py-0.5 rounded flex items-center gap-1">
                                        <AlertCircle size={10} /> Updated
                                    </span>
                                )}
                                {currentAnswer?.riskRating && (
                                    <span className={cn('text-xs font-semibold px-2 py-0.5 rounded flex items-center gap-1 border', RISK_BADGE_STYLES[currentAnswer.riskRating])}>
                                        <ShieldAlert size={10} /> Risk: {currentAnswer.riskRating}
                                    </span>
                                )}
                                {isMissingRequired && <span className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded">Risk rating required</span>}
                            </div>
                            <h3 className="text-lg font-medium leading-relaxed text-foreground">{question.text}</h3>
                        </div>

                        <div className="relative shrink-0">
                            <select
                                value={status === 'Unanswered' || !status ? '' : status}
                                onChange={(e) => handleStatusChange(e.target.value as AnswerStatus)}
                                className={cn(
                                    'h-10 w-40 px-3 py-2 bg-background border rounded-md text-sm appearance-none cursor-pointer focus:ring-2 focus:ring-primary focus:border-primary transition-colors',
                                    status === 'Yes' && 'border-green-500 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 font-medium',
                                    status === 'No' && 'border-red-500 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 font-medium',
                                    status === 'Unsure' && 'border-orange-500 bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400 font-medium',
                                    status === 'NA' && 'border-slate-300 bg-slate-50 text-slate-700 font-medium'
                                )}
                            >
                                <option value="" disabled>
                                    Select status...
                                </option>
                                <option value="Yes">Yes</option>
                                <option value="No">No</option>
                                <option value="Unsure">Unsure</option>
                                <option value="NA">N/A</option>
                            </select>
                            <ChevronDown className="absolute right-3 top-3 h-4 w-4 opacity-50 pointer-events-none" />
                        </div>
                    </div>

                    {answered && status === 'Yes' && (
                        <div className="border-t border-border/50 pt-4 text-sm text-green-700 dark:text-green-400">
                            Risk Rating automatically set to <span className="font-semibold">Good</span> for compliant responses.
                        </div>
                    )}

                    {requiresRiskSelection && (
                        <div className="border-t border-border/50 pt-4 text-sm flex items-center justify-between gap-3">
                            <p className={cn('text-muted-foreground', isMissingRequired && 'text-red-700 dark:text-red-400')}>
                                Select a risk rating for <span className="font-semibold">{status}</span> responses.
                            </p>
                            <button
                                type="button"
                                onClick={() => setShowRiskModal(true)}
                                className={cn(
                                    'px-3 py-1.5 rounded-md text-sm border transition-colors',
                                    isMissingRequired
                                        ? 'border-red-300 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20'
                                        : 'border-border text-foreground hover:bg-muted'
                                )}
                            >
                                {hasRisk ? 'Update Risk Rating' : 'Set Risk Rating'}
                            </button>
                        </div>
                    )}

                    <div className="flex items-center justify-between pt-1">
                        <button onClick={() => setShowRefs(!showRefs)} className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors">
                            {showRefs ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            {showRefs ? 'Hide References' : 'Show References'}
                        </button>

                        <button onClick={() => setShowNotes(!showNotes)} className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors">
                            <Bookmark size={14} />
                            {(currentAnswer?.notes || currentAnswer?.recommendation) ? 'Edit Findings' : 'Findings'}
                        </button>

                        <label className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors cursor-pointer">
                            <Camera size={14} />
                            Attach Files
                            <input type="file" accept="image/*,.pdf,application/pdf" multiple onChange={handleFileChange} className="hidden" />
                        </label>
                    </div>

                    {currentAnswer?.images && currentAnswer.images.length > 0 && (
                        <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {currentAnswer.images.map((img, idx) => (
                                <div key={img.id || idx} className="bg-muted/20 p-2 rounded-lg border border-border space-y-2">
                                    <div className="relative overflow-hidden rounded-md border border-border/50 h-36 bg-black/5">
                                        {img.fileType === 'pdf' ? (
                                            <div
                                                role="button"
                                                tabIndex={0}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    e.preventDefault();
                                                    const byteString = atob(img.base64.split(',')[1]);
                                                    const ab = new ArrayBuffer(byteString.length);
                                                    const ia = new Uint8Array(ab);
                                                    for (let j = 0; j < byteString.length; j += 1) {
                                                        ia[j] = byteString.charCodeAt(j);
                                                    }
                                                    const blob = new Blob([ab], { type: 'application/pdf' });
                                                    const blobUrl = URL.createObjectURL(blob);
                                                    const viewer = window.open('about:blank', '_blank');
                                                    if (viewer) {
                                                        viewer.document.title = img.fileName || 'PDF Document';
                                                        viewer.document.body.style.margin = '0';
                                                        viewer.document.body.innerHTML = `<embed src="${blobUrl}" type="application/pdf" style="width:100%;height:100vh;">`;
                                                    }
                                                }}
                                                className="block w-full h-full cursor-pointer"
                                            >
                                                {img.thumbnail ? <img src={img.thumbnail} alt={img.fileName || 'PDF preview'} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center bg-red-50 dark:bg-red-900/20"><FileText size={26} className="text-red-600 dark:text-red-400" /></div>}
                                            </div>
                                        ) : (
                                            <img
                                                src={img.base64}
                                                alt={img.caption || `Evidence ${idx + 1}`}
                                                className="w-full h-full object-cover cursor-pointer"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    e.preventDefault();
                                                    const viewer = window.open('about:blank', '_blank');
                                                    if (viewer) {
                                                        viewer.document.title = img.caption || 'Image Evidence';
                                                        viewer.document.body.style.margin = '0';
                                                        viewer.document.body.style.display = 'flex';
                                                        viewer.document.body.style.justifyContent = 'center';
                                                        viewer.document.body.style.alignItems = 'center';
                                                        viewer.document.body.style.backgroundColor = '#0e0e0e';
                                                        viewer.document.body.innerHTML = `<img src="${img.base64}" style="max-width:100%;max-height:100vh;object-fit:contain;">`;
                                                    }
                                                }}
                                            />
                                        )}
                                    </div>
                                    <input type="text" value={img.caption || ''} onChange={(e) => updateImageCaption(question.id, img.id, e.target.value)} placeholder="File caption (optional)" className="w-full text-xs p-2 rounded border border-input bg-background" />
                                    <div className="flex gap-2">
                                        {img.fileType !== 'pdf' && (
                                            <button 
                                                type="button" 
                                                onClick={() => handleAnalyzeImage(img.base64, img.id)} 
                                                disabled={analyzingImageId === img.id}
                                                className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium text-blue-700 hover:text-blue-800 border border-blue-300 bg-blue-50 hover:bg-blue-100 rounded py-1.5 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-900/40 transition-colors"
                                            >
                                                {analyzingImageId === img.id ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                                                {analyzingImageId === img.id ? 'Analyzing...' : 'AI Analyze'}
                                            </button>
                                        )}
                                        <button type="button" onClick={() => removeImage(question.id, idx)} className="flex-[0.5] flex items-center justify-center gap-1.5 text-xs text-red-600 hover:text-red-700 border border-red-200 rounded py-1.5 transition-colors hover:bg-red-50 dark:hover:bg-red-900/20">
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {showRefs && (
                        <div className="bg-muted/30 p-3 rounded-lg border text-sm space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Select standards to include in report:</p>

                            {Object.entries(question.references).map(([key, value]) => {
                                if (!value) return null;

                                const lines = splitReferenceLines(value);

                                return lines.map((line, idx) => {
                                    const compositeKey = `${key}__${idx}`;
                                    const isSelected = selectedStandards.includes(compositeKey);

                                    return (
                                        <div key={compositeKey} className="flex gap-2 items-start">
                                            <input
                                                type="checkbox"
                                                id={`${question.id}-${compositeKey}`}
                                                className="mt-1 shrink-0"
                                                checked={isSelected}
                                                onChange={(e) => {
                                                    const newSelection = e.target.checked ? [...selectedStandards, compositeKey] : selectedStandards.filter((item) => item !== compositeKey);
                                                    setAnswer(question.id, { selectedStandards: newSelection });
                                                }}
                                            />
                                            <div className="flex-1">
                                                <label htmlFor={`${question.id}-${compositeKey}`} className="text-muted-foreground cursor-pointer text-sm block leading-relaxed whitespace-pre-line">{line}</label>
                                            </div>
                                        </div>
                                    );
                                });
                            })}

                            <div className="pt-2 mt-2 border-t border-border/50">
                                <div className="flex gap-2 items-start">
                                    <input
                                        type="checkbox"
                                        id={`${question.id}-custom`}
                                        className="mt-1 shrink-0"
                                        checked={selectedStandards.some((item) => item.startsWith('customstd:'))}
                                        onChange={(e) => {
                                            const withoutCustom = selectedStandards.filter((item) => !item.startsWith('customstd:'));
                                            const newSelection = e.target.checked ? [...withoutCustom, 'customstd:'] : withoutCustom;
                                            setAnswer(question.id, { selectedStandards: newSelection });
                                        }}
                                    />
                                    <div className="flex-1">
                                        {selectedStandards.some((item) => item.startsWith('customstd:')) ? (
                                            <input
                                                type="text"
                                                placeholder="Enter custom regulation or standard..."
                                                value={customStandardValue}
                                                onChange={(e) => {
                                                    const withoutCustom = selectedStandards.filter((item) => !item.startsWith('customstd:'));
                                                    setAnswer(question.id, { selectedStandards: [...withoutCustom, `customstd:${e.target.value}`] });
                                                }}
                                                className="w-full text-sm p-2 bg-background border rounded-md focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                                            />
                                        ) : (
                                            <label htmlFor={`${question.id}-custom`} className="text-muted-foreground/60 cursor-pointer text-sm block leading-relaxed italic">Add custom standard...</label>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {showNotes && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold uppercase text-muted-foreground">Findings / Observations</label>
                                <FormattedTextarea value={currentAnswer?.notes || ''} onChange={(val) => setAnswer(question.id, { notes: val })} placeholder="Describe the compliance gap or hazard..." />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold uppercase text-muted-foreground">Recommendations / Mitigation</label>
                                <FormattedTextarea value={currentAnswer?.recommendation || ''} onChange={(val) => setAnswer(question.id, { recommendation: val })} placeholder="Enter recommendations for mitigation..." />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {showRiskModal && requiresRiskSelection && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowRiskModal(false)}>
                    <div className="bg-card border border-border rounded-lg shadow-xl w-full max-w-sm p-6 m-4" onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-lg font-bold mb-2 text-foreground">Select Risk Rating</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            This question is marked <span className="font-semibold">{status}</span>. Choose the risk rating to continue.
                        </p>
                        <div className="grid grid-cols-1 gap-2">
                            {ACTIONABLE_RATINGS.map((rating) => (
                                <button
                                    key={rating}
                                    type="button"
                                    onClick={() => selectActionableRisk(rating)}
                                    className={cn('w-full px-3 py-2 rounded-md border text-sm font-medium transition-colors', RISK_BADGE_STYLES[rating], 'hover:opacity-90')}
                                >
                                    {rating}
                                </button>
                            ))}
                        </div>
                        <div className="flex justify-end mt-4">
                            <button type="button" onClick={() => setShowRiskModal(false)} className="px-3 py-1.5 rounded-md text-sm border border-border hover:bg-muted transition-colors">
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}