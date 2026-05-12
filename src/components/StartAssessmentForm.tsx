"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAssessment } from '@/context/AssessmentContext';
import { AssessmentConfig } from '@/types/standards';
import { ArrowRight, FileText, User, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

export function StartAssessmentForm() {
    const router = useRouter();
    const { startNewAssessment } = useAssessment();
    const [isLoading, setIsLoading] = useState(false);

    // Assessment Details
    const [reportTitle, setReportTitle] = useState('');
    const [assessmentId, setAssessmentId] = useState('');
    const [date, setDate] = useState('');
    const [reviewStatus, setReviewStatus] = useState<'Draft' | 'Final' | 'Approved'>('Draft');

    // Site Information
    const [location, setLocation] = useState('');
    const [operationalScope, setOperationalScope] = useState('');

    // Personnel
    const [assessorName, setAssessorName] = useState('');
    const [pointOfContact, setPointOfContact] = useState('');

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setDate(new Date().toISOString().split('T')[0]);
    }, []);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        const config: AssessmentConfig = {
            reportTitle,
            date,
            location,
            assessmentId,
            assessorName,
            pointOfContact,
            operationalScope,
            reviewStatus,
            standards: ['OSHA'], // Keep default standard for now
        };

        startNewAssessment(config);

        setTimeout(() => {
            router.push('/assessment');
        }, 300);
    };

    const isFormValid = reportTitle && location && assessorName;

    return (
        <form onSubmit={handleSubmit} className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Section title="Assessment Details" icon={<FileText size={18} />}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input label="Report Title" value={reportTitle} onChange={setReportTitle} placeholder="e.g. Q3 Site Safety Assessment" required />
                    <Input label="Assessment ID" value={assessmentId} onChange={setAssessmentId} placeholder="e.g. AST-2026-001" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <Input label="Date" type="date" value={date} onChange={setDate} required />
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-1.5">Review Status <span className="text-red-500">*</span></label>
                        <select title="Select Review Status" value={reviewStatus} onChange={(e) => setReviewStatus(e.target.value as any)} className="w-full px-3 py-2 rounded-md border border-input bg-background/50 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all">
                            <option value="Draft">Draft</option>
                            <option value="Final">Final</option>
                            <option value="Approved">Approved</option>
                        </select>
                    </div>
                </div>
            </Section>

            <Section title="Site Information" icon={<MapPin size={18} />}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input label="Location / Department" value={location} onChange={setLocation} placeholder="e.g. Building A, Maintenance Dept" required />
                    <Input label="Operational Scope" value={operationalScope} onChange={setOperationalScope} placeholder="e.g. Full Facility Walkthrough" />
                </div>
            </Section>

            <Section title="Personnel" icon={<User size={18} />}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input label="Assessor Name(s)" value={assessorName} onChange={setAssessorName} placeholder="e.g. Jane Doe, John Smith" required />
                    <Input label="Point of Contact" value={pointOfContact} onChange={setPointOfContact} placeholder="e.g. Safety Manager" />
                </div>
            </Section>

            <div className="pt-4">
                <button
                    type="submit"
                    disabled={!isFormValid || isLoading}
                    className={cn(
                        'w-full flex items-center justify-center gap-2 py-3 rounded-lg text-lg font-semibold transition-all',
                        isFormValid ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-md hover:shadow-lg transform hover:-translate-y-0.5' : 'bg-muted text-muted-foreground cursor-not-allowed'
                    )}
                >
                    {isLoading ? 'Starting...' : 'Begin Assessment'}
                    {!isLoading && <ArrowRight size={20} />}
                </button>
                {!isFormValid && <p className="text-center text-xs text-muted-foreground mt-2">Please fill out all required fields.</p>}
            </div>
        </form>
    );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
    return (
        <div className="bg-card border border-border/50 rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4 text-primary">
                {icon}
                <h3 className="font-semibold text-lg text-foreground">{title}</h3>
            </div>
            {children}
        </div>
    );
}

interface InputProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
    type?: string;
    placeholder?: string;
    required?: boolean;
}

function Input({ label, value, onChange, type = 'text', placeholder, required }: InputProps) {
    return (
        <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            <input
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="w-full p-2 rounded-md border border-input bg-background/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
                required={required}
            />
        </div>
    );
}
