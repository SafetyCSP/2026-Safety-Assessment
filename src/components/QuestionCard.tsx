"use client";

import React, { useState } from 'react';
import { Question, AnswerStatus, RiskRating } from '@/types/standards';
import { useAssessment } from '@/context/AssessmentContext';
import { compressImage } from '@/lib/imageUtils';
import { generatePdfThumbnail } from '@/lib/pdfUtils';
import { cn } from '@/lib/utils';
import { Check, X, Minus, ChevronDown, ChevronUp, AlertCircle, Bookmark, Camera, Trash2, ShieldAlert, Sparkles, FileText, ArrowUp, ArrowDown, Plus, FileUp } from 'lucide-react';

interface QuestionCardProps {
    question: Question;
    categoryId: string; // To help with unique keys if needed or styling
}

export function QuestionCard({ question, categoryId }: QuestionCardProps) {
    const { answers, setAnswer, addImage, updateImageCaption, removeImage, moveImage, config } = useAssessment();
    const currentAnswer = answers[question.id];
    const [showRefs, setShowRefs] = useState(false);
    const [showNotes, setShowNotes] = useState(!!currentAnswer?.notes);
    const [showRiskModal, setShowRiskModal] = useState(false);

    const status = currentAnswer?.status;

    const handleStatusChange = (newStatus: AnswerStatus) => {
        if (status === newStatus) {
            // Optional: allow deselecting if using buttons, but for dropdown usually just stays
            // But since we have a select with 'Select status...', we might not need this.
            // Keeping for consistency if it was useful.
            // Actually for dropdown, selecting the same value doesn't trigger onChange usually.
            return;
        }

        if (newStatus === 'Yes' || newStatus === 'NA') {
            setAnswer(question.id, newStatus, undefined, 'Good');
        } else {
            // No or Unsure - Update status immediately
            // If we don't have a risk entry yet (or it was Good), prompt for it.
            const existingRisk = currentAnswer?.riskRating;
            const needsRisk = !existingRisk || existingRisk === 'Good';

            // We set the status first so the UI updates
            setAnswer(question.id, newStatus);

            if (needsRisk) {
                setShowRiskModal(true);
            }
        }
    };

    const handleRiskSelection = (rating: RiskRating) => {
        // Use the current status (which was updated in handleStatusChange)
        // Fallback to 'No' if something is weird, but it should be set.
        const targetStatus = currentAnswer?.status === 'Unsure' ? 'Unsure' : 'No';
        setAnswer(question.id, targetStatus, undefined, rating);
        setShowRiskModal(false);
    };

    // AI Vision Logic
    const [analyzingId, setAnalyzingId] = useState<string | null>(null);
    const [analysisResult, setAnalysisResult] = useState<{ id: string, text: string } | null>(null);

    const handleAnalyzeImage = async (imageId: string, base64: string) => {
        setAnalyzingId(imageId);
        setAnalysisResult(null);

        try {
            const res = await fetch('/api/analyze-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    image: base64,
                    context: question.text
                })
            });

            const data = await res.json();

            if (data.analysis) {
                setAnalysisResult({ id: imageId, text: data.analysis });
            } else {
                alert(data.error || "Failed to analyze image");
            }
        } catch (error) {
            console.error("Analysis failed", error);
            alert("Network error processing image.");
        } finally {
            setAnalyzingId(null);
        }
    };

    const handleApplyAnalysis = () => {
        if (!analysisResult) return;

        const existingNotes = currentAnswer?.notes ? currentAnswer.notes + "\n\n" : "";
        const entry = `[AI Analysis]: ${analysisResult.text}`;

        setAnswer(question.id, status || 'Unanswered', existingNotes + entry);
        setAnalysisResult(null);
        setShowNotes(true); // Open comments to show the addition
    };

    const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setAnswer(question.id, status || 'Unanswered', e.target.value);
    };

    // ... (keep file handling logic)

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const isPdf = file.type === 'application/pdf';
            const maxSize = isPdf ? 10 * 1024 * 1024 : 5 * 1024 * 1024;

            if (file.size > maxSize) {
                alert(`"${file.name}" is too large. ${isPdf ? 'PDFs must be under 10MB.' : 'Images must be under 5MB.'}`);
                continue;
            }

            try {
                if (isPdf) {
                    // Read PDF as data URL
                    const base64 = await new Promise<string>((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = () => resolve(reader.result as string);
                        reader.onerror = reject;
                        reader.readAsDataURL(file);
                    });
                    // Generate thumbnail from first page
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
                console.error("File processing failed", error);
                alert(`Failed to process "${file.name}". Please try another file.`);
            }
        }

        // Reset input
        e.target.value = '';
    };

    return (
        <div className="bg-card text-card-foreground rounded-xl border border-border shadow-sm mb-4 overflow-hidden transition-all hover:shadow-md dark:bg-[#1a1a1a] dark:border-[#333]">
            <div className="p-6">
                <div className="flex gap-4 items-start">
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">
                                {question.id}
                            </span>
                            {question.updated && (
                                <span className="text-xs font-semibold text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/20 px-2 py-0.5 rounded flex items-center gap-1">
                                    <AlertCircle size={10} /> Updated
                                </span>
                            )}
                            {currentAnswer?.riskRating && (
                                <span className={cn(
                                    "text-xs font-semibold px-2 py-0.5 rounded flex items-center gap-1 border",
                                    currentAnswer.riskRating === 'Good' ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-900" :
                                        currentAnswer.riskRating === 'Low' ? "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-900" :
                                            currentAnswer.riskRating === 'Medium' ? "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-900" :
                                                currentAnswer.riskRating === 'Unknown' ? "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900/20 dark:text-slate-400 dark:border-slate-900" :
                                                    "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900"
                                )}>
                                    <ShieldAlert size={10} /> Risk: {currentAnswer.riskRating}
                                </span>
                            )}
                        </div>
                        <h3 className="text-lg font-medium leading-relaxed text-foreground">
                            {question.text}
                        </h3>
                    </div>

                    <div className="flex gap-2 shrink-0">
                        <div className="relative">
                            <select
                                value={status === 'Unanswered' || !status ? '' : status}
                                onChange={(e) => handleStatusChange(e.target.value as AnswerStatus)}
                                className={cn(
                                    "h-10 w-40 px-3 py-2 bg-background border rounded-md text-sm appearance-none cursor-pointer focus:ring-2 focus:ring-primary focus:border-primary transition-colors",
                                    status === 'Yes' && "border-green-500 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 font-medium",
                                    status === 'No' && "border-red-500 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 font-medium",
                                    status === 'Unsure' && "border-orange-500 bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400 font-medium",
                                    status === 'NA' && "border-slate-300 bg-slate-50 text-slate-700 font-medium"
                                )}
                            >
                                <option value="" disabled>Select status...</option>
                                <option value="Yes">Yes</option>
                                <option value="No">No</option>
                                <option value="Unsure">Unsure</option>
                                <option value="NA">N/A</option>
                            </select>
                            <ChevronDown className="absolute right-3 top-3 h-4 w-4 opacity-50 pointer-events-none" />
                        </div>
                    </div>
                </div>

                {/* Action Bar */}
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/50">
                    <button
                        onClick={() => setShowRefs(!showRefs)}
                        className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors"
                    >
                        {showRefs ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        {showRefs ? 'Hide References' : 'Show References'}
                    </button>

                    <button
                        onClick={() => setShowNotes(!showNotes)}
                        className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors"
                    >
                        <Bookmark size={14} />
                        {(currentAnswer?.notes || currentAnswer?.recommendation) ? 'Edit Findings' : 'Findings'}
                    </button>

                    <label className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors cursor-pointer">
                        <Camera size={14} />
                        Attach Files
                        <input
                            type="file"
                            accept="image/*,.pdf,application/pdf"
                            multiple
                            onChange={handleFileChange}
                            className="hidden"
                        />
                    </label>
                </div>

                {/* Images Preview */}
                {currentAnswer?.images && currentAnswer.images.length > 0 && (
                    <div className="mt-4 space-y-4">
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                            {currentAnswer.images.map((img, idx) => (
                                <div key={img.id || idx} className="relative group bg-muted/20 p-2 rounded-lg border border-border">
                                    <div className="relative overflow-hidden rounded-md">
                                        {img.fileType === 'pdf' ? (
                                            /* PDF Thumbnail — show rendered first page if available */
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
                                                className="block w-full aspect-video relative border border-border/50 hover:opacity-90 transition-opacity cursor-pointer"
                                            >
                                                {img.thumbnail ? (
                                                    <img
                                                        src={img.thumbnail}
                                                        alt={img.fileName || 'PDF preview'}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex flex-col items-center justify-center bg-red-50 dark:bg-red-900/20">
                                                        <FileText size={32} className="text-red-600 dark:text-red-400 mb-2" />
                                                    </div>
                                                )}
                                                <div className="absolute bottom-0 inset-x-0 bg-black/60 px-2 py-1 flex items-center gap-1">
                                                    <FileText size={12} className="text-white shrink-0" />
                                                    <span className="text-[10px] text-white truncate">{img.fileName || 'document.pdf'}</span>
                                                </div>
                                            </div>
                                        ) : (
                                            /* Image Thumbnail */
                                            <img
                                                src={img.base64}
                                                alt={`Evidence ${idx + 1}`}
                                                className="w-full aspect-video object-cover border border-border/50"
                                            />
                                        )}

                                        {/* Overlay Actions (only for images) */}
                                        {img.fileType !== 'pdf' && (
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                <button
                                                    onClick={() => handleAnalyzeImage(img.id, img.base64)}
                                                    disabled={analyzingId === img.id}
                                                    className="bg-primary/90 text-primary-foreground hover:bg-primary p-2 rounded-full shadow-lg transform hover:scale-105 transition-all"
                                                    title="Analyze with AI"
                                                >
                                                    {analyzingId === img.id ? (
                                                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
                                                    ) : (
                                                        <Sparkles size={16} />
                                                    )}
                                                </button>
                                            </div>
                                        )}

                                        {/* Reorder buttons */}
                                        <div className="absolute top-1 left-1 flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {idx > 0 && (
                                                <button
                                                    onClick={() => moveImage(question.id, idx, idx - 1)}
                                                    className="bg-background/80 hover:bg-background text-foreground rounded p-0.5 shadow-sm"
                                                    title="Move up"
                                                >
                                                    <ArrowUp size={12} />
                                                </button>
                                            )}
                                            {idx < (currentAnswer.images?.length || 0) - 1 && (
                                                <button
                                                    onClick={() => moveImage(question.id, idx, idx + 1)}
                                                    className="bg-background/80 hover:bg-background text-foreground rounded p-0.5 shadow-sm"
                                                    title="Move down"
                                                >
                                                    <ArrowDown size={12} />
                                                </button>
                                            )}
                                        </div>

                                        <button
                                            onClick={() => removeImage(question.id, idx)}
                                            className="absolute top-1 right-1 bg-destructive/90 text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-destructive"
                                            title="Remove"
                                        >
                                            <X size={12} />
                                        </button>
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Add a caption..."
                                        value={img.caption || ''}
                                        onChange={(e) => updateImageCaption(question.id, img.id, e.target.value)}
                                        className="mt-2 w-full text-xs p-1.5 bg-transparent border-b border-border/50 focus:border-primary focus:outline-none transition-colors placeholder:text-muted-foreground/50"
                                    />
                                </div>
                            ))}
                        </div>

                        {/* Analysis Result Popover */}
                        {analysisResult && (
                            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 animate-in fade-in slide-in-from-top-2">
                                <div className="flex items-start gap-3">
                                    <Sparkles className="text-primary mt-1 shrink-0" size={18} />
                                    <div className="flex-1 space-y-2">
                                        <h4 className="font-semibold text-sm text-primary">AI Analysis</h4>
                                        <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                                            {analysisResult.text}
                                        </p>
                                        <div className="flex gap-2 mt-2">
                                            <button
                                                onClick={handleApplyAnalysis}
                                                className="text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded hover:bg-primary/90 transition-colors font-medium"
                                            >
                                                Apply to Findings
                                            </button>
                                            <button
                                                onClick={() => setAnalysisResult(null)}
                                                className="text-xs bg-muted text-muted-foreground px-3 py-1.5 rounded hover:bg-muted/80 transition-colors"
                                            >
                                                Dismiss
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* References Toggle */}
                <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                        <button
                            onClick={() => setShowRefs(!showRefs)}
                            className="text-xs font-medium text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
                        >
                            <FileText size={14} />
                            {showRefs ? "Hide References" : "Show References"}
                        </button>
                    </div>

                    {showRefs && (
                        <div className="bg-muted/30 p-3 rounded-lg border text-sm space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Select standards to include in report:</p>

                            {Object.entries(question.references).map(([key, val]) => {
                                if (!val) return null;



                                // Group standards logic: Merge "Element of Performance" with previous line
                                const rawLines = val.split(/\r?\n/).filter((line: string) => line.trim().length > 0);
                                const lines: string[] = [];

                                rawLines.forEach((line: string) => {
                                    if (line.trim().startsWith("Element of Performance")) {
                                        if (lines.length > 0) {
                                            lines[lines.length - 1] += "\n" + line;
                                        } else {
                                            lines.push(line);
                                        }
                                    } else {
                                        lines.push(line);
                                    }
                                });

                                return lines.map((line, idx) => {
                                    // Composite key for granular selection: "key__index"
                                    const compositeKey = `${key}__${idx}`;
                                    const isSelected = currentAnswer?.selectedStandards?.includes(compositeKey) || false;

                                    return (
                                        <div key={compositeKey} className="flex gap-2 items-start">
                                            <input
                                                type="checkbox"
                                                id={`${question.id}-${compositeKey}`}
                                                className="mt-1 shrink-0"
                                                checked={isSelected}
                                                onChange={(e) => {
                                                    const currentSelected = currentAnswer?.selectedStandards || [];
                                                    let newSelection;
                                                    if (e.target.checked) {
                                                        newSelection = [...currentSelected, compositeKey];
                                                    } else {
                                                        newSelection = currentSelected.filter(k => k !== compositeKey);
                                                    }
                                                    // Update answer with new selection
                                                    setAnswer(question.id, status || 'Unanswered', undefined, undefined, undefined, newSelection);
                                                }}
                                            />
                                            <div className="flex-1">
                                                <label htmlFor={`${question.id}-${compositeKey}`} className="text-muted-foreground cursor-pointer text-sm block leading-relaxed whitespace-pre-line">{line}</label>
                                            </div>
                                        </div>
                                    );
                                });
                            })}

                            {question.notes && (
                                <div className="pt-2 mt-2 border-t border-border/50">
                                    <span className="font-semibold text-xs text-muted-foreground">Additional Notes:</span>
                                    <p className="text-muted-foreground mt-1">{question.notes}</p>
                                </div>
                            )}

                            {/* Custom Standard Input */}
                            <div className="pt-2 mt-2 border-t border-border/50">
                                <div className="flex gap-2 items-start">
                                    <input
                                        type="checkbox"
                                        id={`${question.id}-custom`}
                                        className="mt-1 shrink-0"
                                        checked={currentAnswer?.selectedStandards?.some(s => s.startsWith('customstd:')) || false}
                                        onChange={(e) => {
                                            const currentSelected = currentAnswer?.selectedStandards || [];
                                            let newSelection;
                                            if (e.target.checked) {
                                                newSelection = [...currentSelected, 'customstd:'];
                                            } else {
                                                newSelection = currentSelected.filter(k => !k.startsWith('customstd:'));
                                            }
                                            setAnswer(question.id, status || 'Unanswered', undefined, undefined, undefined, newSelection);
                                        }}
                                    />
                                    <div className="flex-1">
                                        {currentAnswer?.selectedStandards?.some(s => s.startsWith('customstd:')) ? (
                                            <input
                                                type="text"
                                                placeholder="Enter custom regulation or standard..."
                                                value={
                                                    (currentAnswer?.selectedStandards?.find(s => s.startsWith('customstd:')) || '').substring('customstd:'.length)
                                                }
                                                onChange={(e) => {
                                                    const currentSelected = (currentAnswer?.selectedStandards || []).filter(k => !k.startsWith('customstd:'));
                                                    const newSelection = [...currentSelected, `customstd:${e.target.value}`];
                                                    setAnswer(question.id, status || 'Unanswered', undefined, undefined, undefined, newSelection);
                                                }}
                                                className="w-full text-sm p-2 bg-background border rounded-md focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                                            />
                                        ) : (
                                            <label htmlFor={`${question.id}-custom`} className="text-muted-foreground/60 cursor-pointer text-sm block leading-relaxed italic">
                                                Add custom standard...
                                            </label>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Findings & Recommendations Section */}
                {showNotes && (
                    <div className="mt-4 space-y-4 animate-in fade-in slide-in-from-top-2">
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold uppercase text-muted-foreground">Findings / Observations</label>
                            <textarea
                                className="w-full min-h-[80px] p-3 rounded-md border border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 text-sm resize-y dark:bg-[#222] dark:border-[#444]"
                                placeholder="Describe the compliance gap or hazard..."
                                value={currentAnswer?.notes || ''}
                                onChange={handleNotesChange}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold uppercase text-muted-foreground">Recommendations / Mitigation</label>
                            <textarea
                                className="w-full min-h-[80px] p-3 rounded-md border border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 text-sm resize-y dark:bg-[#222] dark:border-[#444]"
                                placeholder="Enter recommendations for mitigation..."
                                value={currentAnswer?.recommendation || ''}
                                onChange={(e) => setAnswer(question.id, status || 'Unanswered', undefined, undefined, e.target.value)}
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Risk Selection Modal */}
            {showRiskModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-background rounded-xl border border-border shadow-lg max-w-sm w-full p-6 animate-in zoom-in-95">
                        <h3 className="text-lg font-semibold mb-2">Select Risk Level</h3>
                        <p className="text-sm text-muted-foreground mb-6">
                            Since compliance was not met, please assign a risk rating to this finding.
                        </p>

                        <div className="space-y-3">
                            <button
                                onClick={() => handleRiskSelection('High')}
                                className="w-full flex items-center justify-between p-3 rounded-lg border border-red-200 bg-red-50 text-red-900 hover:bg-red-100 transition-colors"
                            >
                                <span className="font-medium">High Risk</span>
                                <ShieldAlert size={16} />
                            </button>
                            <button
                                onClick={() => handleRiskSelection('Medium')}
                                className="w-full flex items-center justify-between p-3 rounded-lg border border-orange-200 bg-orange-50 text-orange-900 hover:bg-orange-100 transition-colors"
                            >
                                <span className="font-medium">Medium Risk</span>
                                <ShieldAlert size={16} />
                            </button>
                            <button
                                onClick={() => handleRiskSelection('Low')}
                                className="w-full flex items-center justify-between p-3 rounded-lg border border-yellow-200 bg-yellow-50 text-yellow-900 hover:bg-yellow-100 transition-colors"
                            >
                                <span className="font-medium">Low Risk</span>
                                <ShieldAlert size={16} />
                            </button>
                            <button
                                onClick={() => handleRiskSelection('Unknown')}
                                className="w-full flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 hover:bg-slate-100 transition-colors"
                            >
                                <span className="font-medium">Unknown Risk</span>
                                <ShieldAlert size={16} />
                            </button>
                        </div>

                        <button
                            onClick={() => setShowRiskModal(false)}
                            className="mt-6 w-full py-2 text-sm text-muted-foreground hover:text-foreground"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div >
    );
}

function StatusButton({ active, onClick, type, icon, label }: {
    active: boolean;
    onClick: () => void;
    type: 'yes' | 'no' | 'na';
    icon: React.ReactNode;
    label: string;
}) {
    const styles = {
        yes: "hover:bg-green-100 hover:text-green-700 hover:border-green-200 dark:hover:bg-green-900/30 dark:hover:text-green-400 dark:hover:border-green-800",
        no: "hover:bg-red-100 hover:text-red-700 hover:border-red-200 dark:hover:bg-red-900/30 dark:hover:text-red-400 dark:hover:border-red-800",
        na: "hover:bg-gray-100 hover:text-gray-700 hover:border-gray-200 dark:hover:bg-gray-800 dark:hover:text-gray-300 dark:hover:border-gray-700"
    };

    const activeStyles = {
        yes: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800 shadow-inner",
        no: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800 shadow-inner",
        na: "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 shadow-inner"
    };

    return (
        <button
            onClick={onClick}
            className={cn(
                "flex flex-col items-center justify-center w-16 h-14 rounded-lg border border-transparent transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-background",
                active ? activeStyles[type] : "bg-secondary/50 text-muted-foreground border-transparent " + styles[type]
            )}
            title={label}
        >
            {icon}
            <span className="text-[10px] font-medium mt-1 uppercase tracking-wide">{label}</span>
        </button>
    );
}
