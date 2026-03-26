"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useAssessment } from '@/context/AssessmentContext';
import { AssessmentData, Category, Question, RegulatoryReference } from '@/types/standards';
import { ArrowLeft, Download, Plus, Save, Trash2, Upload, RotateCcw } from 'lucide-react';

function emptyReferences(): RegulatoryReference {
    return {
        osha: '',
        cms: '',
        tjc: '',
        dnv: '',
    };
}

function sanitizeData(input: unknown): AssessmentData {
    if (!Array.isArray(input)) {
        throw new Error('Standards JSON must be an array of categories.');
    }

    return input.map((categoryRaw, categoryIndex) => {
        const category = categoryRaw as Partial<Category>;

        const categoryId = String(category.id || (categoryIndex + 1).toString().padStart(2, '0'));
        const categoryTitle = (category.title || `Category ${categoryId}`).toString();

        const questions = Array.isArray(category.questions)
            ? category.questions.map((questionRaw, questionIndex) => {
                  const question = questionRaw as Partial<Question>;
                  const refs = (question.references || {}) as Partial<RegulatoryReference>;

                  return {
                      id: String(question.id || `${categoryId}.${(questionIndex + 1).toString().padStart(2, '0')}.001`),
                      text: (question.text || '').toString(),
                      references: {
                          osha: (refs.osha || '').toString(),
                          cms: (refs.cms || '').toString(),
                          tjc: (refs.tjc || '').toString(),
                          dnv: (refs.dnv || '').toString(),
                      },
                      notes: (question.notes || '').toString(),
                      updated: Boolean(question.updated),
                  } as Question;
              })
            : [];

        return {
            id: categoryId,
            title: categoryTitle,
            questions,
        };
    });
}

export default function QuestionConfigurationPage() {
    const { data, updateStandardsData, resetStandardsData } = useAssessment();
    const [draftData, setDraftData] = useState<AssessmentData>(data);
    const [statusMessage, setStatusMessage] = useState('');
    const importInputRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        setDraftData(data);
    }, [data]);

    const counts = useMemo(() => {
        const categories = draftData.length;
        const questions = draftData.reduce((sum, category) => sum + category.questions.length, 0);
        return { categories, questions };
    }, [draftData]);

    const setCategoryField = (categoryIndex: number, field: keyof Category, value: string) => {
        setDraftData((prev) => {
            const next = [...prev];
            next[categoryIndex] = {
                ...next[categoryIndex],
                [field]: value,
            };
            return next;
        });
    };

    const setQuestionField = <K extends keyof Question>(
        categoryIndex: number,
        questionIndex: number,
        field: K,
        value: Question[K]
    ) => {
        setDraftData((prev) => {
            const next = [...prev];
            const category = { ...next[categoryIndex] };
            const questions = [...category.questions];
            questions[questionIndex] = {
                ...questions[questionIndex],
                [field]: value,
            };
            category.questions = questions;
            next[categoryIndex] = category;
            return next;
        });
    };

    const setReferenceField = (
        categoryIndex: number,
        questionIndex: number,
        key: keyof RegulatoryReference,
        value: string
    ) => {
        setDraftData((prev) => {
            const next = [...prev];
            const category = { ...next[categoryIndex] };
            const questions = [...category.questions];
            const question = { ...questions[questionIndex] };

            question.references = {
                ...question.references,
                [key]: value,
            };

            questions[questionIndex] = question;
            category.questions = questions;
            next[categoryIndex] = category;
            return next;
        });
    };

    const addCategory = () => {
        setDraftData((prev) => {
            const numericIds = prev
                .map((item) => parseInt(item.id, 10))
                .filter((value) => !Number.isNaN(value));
            const nextId = (Math.max(0, ...numericIds) + 1).toString().padStart(2, '0');

            return [
                ...prev,
                {
                    id: nextId,
                    title: 'New Category',
                    questions: [],
                },
            ];
        });
    };

    const deleteCategory = (categoryIndex: number) => {
        if (!window.confirm('Delete this category and all of its questions?')) {
            return;
        }

        setDraftData((prev) => prev.filter((_, index) => index !== categoryIndex));
    };

    const addQuestion = (categoryIndex: number) => {
        setDraftData((prev) => {
            const next = [...prev];
            const category = { ...next[categoryIndex] };
            const questionNumber = (category.questions.length + 1).toString().padStart(2, '0');
            const categoryPrefix = (category.id || '00').padStart(2, '0');

            const newQuestion: Question = {
                id: `${categoryPrefix}.${questionNumber}.001`,
                text: '',
                references: emptyReferences(),
                notes: '',
                updated: true,
            };

            category.questions = [...category.questions, newQuestion];
            next[categoryIndex] = category;
            return next;
        });
    };

    const deleteQuestion = (categoryIndex: number, questionIndex: number) => {
        if (!window.confirm('Delete this question?')) {
            return;
        }

        setDraftData((prev) => {
            const next = [...prev];
            const category = { ...next[categoryIndex] };
            category.questions = category.questions.filter((_, index) => index !== questionIndex);
            next[categoryIndex] = category;
            return next;
        });
    };

    const saveChanges = () => {
        updateStandardsData(draftData);
        setStatusMessage('Question library saved.');
    };

    const resetToDefault = () => {
        if (!window.confirm('Reset question library to the default standards.json content?')) {
            return;
        }

        resetStandardsData();
        setStatusMessage('Question library reset to defaults.');
    };

    const exportJson = () => {
        const json = JSON.stringify(draftData, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `safety-standards-${new Date().toISOString().split('T')[0]}.json`;
        anchor.click();
        URL.revokeObjectURL(url);
    };

    const importJson = (file: File) => {
        const reader = new FileReader();

        reader.onload = () => {
            try {
                const parsed = JSON.parse(String(reader.result || ''));
                const sanitized = sanitizeData(parsed);
                setDraftData(sanitized);
                setStatusMessage('JSON imported. Review and click Save Changes to apply.');
            } catch (error) {
                console.error(error);
                alert('Invalid JSON file. Please use the standards array format.');
            }
        };

        reader.onerror = () => {
            alert('Unable to read file.');
        };

        reader.readAsText(file);
    };

    return (
        <div className="min-h-screen bg-muted/20">
            <div className="max-w-7xl mx-auto px-4 py-10 sm:px-6 lg:px-8 space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <Link href="/assessment" className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80">
                            <ArrowLeft size={16} />
                            Back to Assessment
                        </Link>
                        <h1 className="text-3xl font-bold tracking-tight text-foreground mt-2">Question Configuration</h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            {counts.categories} categories • {counts.questions} questions
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            type="button"
                            onClick={addCategory}
                            className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-md border bg-background hover:bg-muted"
                        >
                            <Plus size={16} /> Add Category
                        </button>
                        <button
                            type="button"
                            onClick={exportJson}
                            className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-md border bg-background hover:bg-muted"
                        >
                            <Download size={16} /> Export JSON
                        </button>
                        <button
                            type="button"
                            onClick={() => importInputRef.current?.click()}
                            className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-md border bg-background hover:bg-muted"
                        >
                            <Upload size={16} /> Import JSON
                        </button>
                        <button
                            type="button"
                            onClick={resetToDefault}
                            className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-md border border-amber-300 text-amber-700 bg-amber-50 hover:bg-amber-100"
                        >
                            <RotateCcw size={16} /> Reset Defaults
                        </button>
                        <button
                            type="button"
                            onClick={saveChanges}
                            className="inline-flex items-center gap-2 px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
                        >
                            <Save size={16} /> Save Changes
                        </button>
                        <input
                            ref={importInputRef}
                            type="file"
                            accept="application/json,.json"
                            className="hidden"
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                    importJson(file);
                                }
                                e.target.value = '';
                            }}
                        />
                    </div>
                </div>

                {statusMessage && (
                    <div className="rounded-md border border-blue-200 bg-blue-50 text-blue-700 px-4 py-2 text-sm">{statusMessage}</div>
                )}

                <div className="space-y-4">
                    {draftData.map((category, categoryIndex) => (
                        <section key={`${category.id}-${categoryIndex}`} className="bg-card border rounded-xl p-4 space-y-4">
                            <div className="flex items-center justify-between gap-3">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
                                    <input
                                        value={category.id}
                                        onChange={(e) => setCategoryField(categoryIndex, 'id', e.target.value)}
                                        placeholder="Category ID"
                                        className="w-full p-2 text-sm rounded border bg-background"
                                    />
                                    <input
                                        value={category.title}
                                        onChange={(e) => setCategoryField(categoryIndex, 'title', e.target.value)}
                                        placeholder="Category Title"
                                        className="w-full p-2 text-sm rounded border bg-background"
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={() => deleteCategory(categoryIndex)}
                                    className="inline-flex items-center gap-1 px-2.5 py-2 text-sm rounded border border-red-200 text-red-600 hover:bg-red-50 shrink-0"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>

                            <div className="space-y-3">
                                {category.questions.map((question, questionIndex) => (
                                    <details key={`${question.id}-${questionIndex}`} className="border rounded-lg p-3 bg-muted/20" open={questionIndex === 0}>
                                        <summary className="cursor-pointer font-medium text-sm flex items-center justify-between">
                                            <span>{question.id || `Question ${questionIndex + 1}`}</span>
                                        </summary>
                                        <div className="mt-3 space-y-3">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                <input
                                                    value={question.id}
                                                    onChange={(e) => setQuestionField(categoryIndex, questionIndex, 'id', e.target.value)}
                                                    placeholder="Question ID"
                                                    className="w-full p-2 text-sm rounded border bg-background"
                                                />
                                                <label className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                                                    <input
                                                        type="checkbox"
                                                        checked={question.updated}
                                                        onChange={(e) => setQuestionField(categoryIndex, questionIndex, 'updated', e.target.checked)}
                                                    />
                                                    Updated
                                                </label>
                                            </div>

                                            <textarea
                                                value={question.text}
                                                onChange={(e) => setQuestionField(categoryIndex, questionIndex, 'text', e.target.value)}
                                                placeholder="Question text"
                                                className="w-full min-h-[70px] p-2 text-sm rounded border bg-background"
                                            />

                                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                                                <textarea
                                                    value={question.references.osha}
                                                    onChange={(e) => setReferenceField(categoryIndex, questionIndex, 'osha', e.target.value)}
                                                    placeholder="OSHA reference"
                                                    className="w-full min-h-[80px] p-2 text-xs rounded border bg-background"
                                                />
                                                <textarea
                                                    value={question.references.cms}
                                                    onChange={(e) => setReferenceField(categoryIndex, questionIndex, 'cms', e.target.value)}
                                                    placeholder="CMS reference"
                                                    className="w-full min-h-[80px] p-2 text-xs rounded border bg-background"
                                                />
                                                <textarea
                                                    value={question.references.tjc}
                                                    onChange={(e) => setReferenceField(categoryIndex, questionIndex, 'tjc', e.target.value)}
                                                    placeholder="TJC reference"
                                                    className="w-full min-h-[80px] p-2 text-xs rounded border bg-background"
                                                />
                                                <textarea
                                                    value={question.references.dnv}
                                                    onChange={(e) => setReferenceField(categoryIndex, questionIndex, 'dnv', e.target.value)}
                                                    placeholder="DNV reference"
                                                    className="w-full min-h-[80px] p-2 text-xs rounded border bg-background"
                                                />
                                            </div>

                                            <textarea
                                                value={question.notes}
                                                onChange={(e) => setQuestionField(categoryIndex, questionIndex, 'notes', e.target.value)}
                                                placeholder="Question notes"
                                                className="w-full min-h-[60px] p-2 text-sm rounded border bg-background"
                                            />

                                            <div className="flex justify-end">
                                                <button
                                                    type="button"
                                                    onClick={() => deleteQuestion(categoryIndex, questionIndex)}
                                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs rounded border border-red-200 text-red-600 hover:bg-red-50"
                                                >
                                                    <Trash2 size={12} /> Delete Question
                                                </button>
                                            </div>
                                        </div>
                                    </details>
                                ))}
                            </div>

                            <button
                                type="button"
                                onClick={() => addQuestion(categoryIndex)}
                                className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-md border bg-background hover:bg-muted"
                            >
                                <Plus size={14} /> Add Question
                            </button>
                        </section>
                    ))}
                </div>
            </div>
        </div>
    );
}
