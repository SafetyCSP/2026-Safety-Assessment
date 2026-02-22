"use client";

import React from 'react';
import { useAssessment } from '@/context/AssessmentContext';
import { cn } from '@/lib/utils';
import { CheckCircle2, Circle } from 'lucide-react';

interface CategoryListProps {
    selectedCategoryId: string;
    onSelectCategory: (id: string) => void;
}

export function CategoryList({ selectedCategoryId, onSelectCategory }: CategoryListProps) {
    const { data, getCategoryProgress, overallProgress } = useAssessment();

    return (
        <div className="space-y-1 py-2">
            <button
                onClick={() => onSelectCategory('all')}
                className={cn(
                    "w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-md transition-colors border border-transparent",
                    selectedCategoryId === 'all'
                        ? "bg-primary/10 text-primary dark:bg-primary/20"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
            >
                <span className="truncate text-left font-semibold">ALL CATEGORIES</span>
                <span className={cn(
                    "text-xs px-1.5 py-0.5 rounded-full ml-2",
                    selectedCategoryId === 'all' ? "bg-primary/20" : "bg-muted"
                )}>
                    {overallProgress.percentage}%
                </span>
            </button>

            <div className="h-px bg-border/50 my-2 mx-2" />

            {data.map(category => {
                const { completed, total, percentage } = getCategoryProgress(category.id);
                const isDone = completed === total && total > 0;
                const isActive = selectedCategoryId === category.id;

                return (
                    <button
                        key={category.id}
                        onClick={() => onSelectCategory(category.id)}
                        className={cn(
                            "w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-md transition-colors",
                            isActive
                                ? "bg-primary/10 text-primary dark:bg-primary/20"
                                : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                    >
                        <div className="flex items-center gap-3 truncate">
                            {isDone ? (
                                <CheckCircle2 size={16} className="text-green-500 shrink-0" />
                            ) : (
                                <div className="relative shrink-0">
                                    <Circle size={16} className="text-muted-foreground/40" />
                                    {percentage > 0 && (
                                        <svg className="absolute top-0 left-0 w-4 h-4 -rotate-90 text-primary" viewBox="0 0 24 24">
                                            <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="4" strokeDasharray="63" strokeDashoffset={63 - (63 * percentage) / 100} />
                                        </svg>
                                    )}
                                </div>
                            )}
                            <span className="truncate text-left">{category.title}</span>
                        </div>

                        <span className={cn(
                            "text-xs px-1.5 py-0.5 rounded-full ml-2",
                            isActive ? "bg-primary/20" : "bg-muted"
                        )}>
                            {completed}/{total}
                        </span>
                    </button>
                );
            })}
        </div>
    );
}
