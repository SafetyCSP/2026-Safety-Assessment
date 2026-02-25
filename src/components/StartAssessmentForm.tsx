"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAssessment } from '@/context/AssessmentContext';
import { AssessmentConfig } from '@/types/standards';
import { ArrowRight, CheckSquare, Square, User, MapPin, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

export function StartAssessmentForm() {
    const router = useRouter();
    const { startNewAssessment } = useAssessment();
    const [isLoading, setIsLoading] = useState(false);

    // Form State
    const [assessorName, setAssessorName] = useState('');
    const [assessorDate, setAssessorDate] = useState(new Date().toISOString().split('T')[0]);
    const [region, setRegion] = useState('');

    const REGIONS = ['Central', 'Southeast', 'Southwest', 'Northeast'];

    const [amName, setAmName] = useState('');
    const [amEmail, setAmEmail] = useState('');
    const [amPhone, setAmPhone] = useState('');

    const [customerName, setCustomerName] = useState('');
    const [customerLocation, setCustomerLocation] = useState('');
    const [sapAccountNumber, setSapAccountNumber] = useState('');
    const [customerContact, setCustomerContact] = useState('');
    const [trackCode, setTrackCode] = useState('');
    const [subtrackCode, setSubtrackCode] = useState('');

    const [standards, setStandards] = useState<string[]>([]);

    const STANDARDS = ['OSHA 1910', 'The Joint Commission', 'DNV'];

    const toggleSelection = (list: string[], setList: (s: string[]) => void, item: string) => {
        if (list.includes(item)) {
            setList(list.filter(i => i !== item));
        } else {
            setList([...list, item]);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        const config: AssessmentConfig = {
            assessor: {
                name: assessorName,
                date: assessorDate,
                region: region,
            },
            accountManager: {
                name: amName,
                email: amEmail,
                phone: amPhone,
            },
            customer: {
                name: customerName,
                location: customerLocation,
                sapAccountNumber: sapAccountNumber,
                contact: customerContact,
                trackCode: trackCode,
                subtrackCode: subtrackCode,
            },
            standards: standards,
        };

        // Create a new persisted assessment
        startNewAssessment(config);

        // Small delay for UX
        setTimeout(() => {
            router.push('/assessment');
        }, 500);
    };

    const isFormValid = assessorName && amName && customerName;

    return (
        <form onSubmit={handleSubmit} className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* 1. Assessor Info */}
            <Section title="Assessor Information" icon={<User size={18} />}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Input
                        label="Assessor Name"
                        value={assessorName}
                        onChange={setAssessorName}
                        placeholder="John Doe"
                        required
                    />
                    <Input
                        label="Date"
                        type="date"
                        value={assessorDate}
                        onChange={setAssessorDate}
                        required
                    />
                    <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-1.5">Region</label>
                        <select
                            title="Select Region"
                            value={region}
                            onChange={(e) => setRegion(e.target.value)}
                            className="w-full px-3 py-2 rounded-md border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                        >
                            <option value="">Select a region...</option>
                            {REGIONS.map((r) => (
                                <option key={r} value={r}>{r}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </Section>

            {/* 2. Account Manager Info */}
            <Section title="Account Manager Information" icon={<User size={18} />}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Input
                        label="Name"
                        value={amName}
                        onChange={setAmName}
                        placeholder="Jane Smith"
                        required
                    />
                    <Input
                        label="Email"
                        type="email"
                        value={amEmail}
                        onChange={setAmEmail}
                        placeholder="jane@company.com"
                        required
                    />
                    <Input
                        label="Phone Number"
                        type="tel"
                        value={amPhone}
                        onChange={setAmPhone}
                        placeholder="(555) 123-4567"
                        required
                    />
                </div>
            </Section>

            {/* 3. Customer Info */}
            <Section title="Customer Information" icon={<MapPin size={18} />}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Input
                        label="Customer Name"
                        value={customerName}
                        onChange={setCustomerName}
                        placeholder="Acme Corp"
                        required
                    />
                    <Input
                        label="Location / Facility"
                        value={customerLocation}
                        onChange={setCustomerLocation}
                        placeholder="Building A, New York, NY"
                        required
                    />
                    <Input
                        label="SAP Account Number"
                        value={sapAccountNumber}
                        onChange={setSapAccountNumber}
                        placeholder="1234567"
                    />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-1 gap-4 mt-4">
                    <Input
                        label="Customer Contact"
                        value={customerContact}
                        onChange={setCustomerContact}
                        placeholder="Jane Doe, Safety Manager"
                    />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <Input
                        label="Track Code"
                        value={trackCode}
                        onChange={setTrackCode}
                        placeholder="TRK-001"
                    />
                    <Input
                        label="Subtrack Code"
                        value={subtrackCode}
                        onChange={setSubtrackCode}
                        placeholder="SUB-001"
                    />
                </div>
            </Section>



            {/* Submit */}
            <div className="pt-4">
                <button
                    type="submit"
                    disabled={!isFormValid || isLoading}
                    className={cn(
                        "w-full flex items-center justify-center gap-2 py-3 rounded-lg text-lg font-semibold transition-all",
                        isFormValid
                            ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                            : "bg-muted text-muted-foreground cursor-not-allowed"
                    )}
                >
                    {isLoading ? "Starting..." : "Begin Assessment"}
                    {!isLoading && <ArrowRight size={20} />}
                </button>
                {!isFormValid && (
                    <p className="text-center text-xs text-muted-foreground mt-2">
                        Please fill out all required fields.
                    </p>
                )}
            </div>

        </form>
    );
}

function Section({ title, icon, children }: { title: string, icon: React.ReactNode, children: React.ReactNode }) {
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

function Input({ label, value, onChange, type = "text", placeholder, required }: any) {
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

function Checkbox({ label, checked, onChange }: any) {
    return (
        <button
            type="button"
            onClick={onChange}
            className={cn(
                "flex items-center gap-3 p-3 rounded-lg border transition-all text-sm font-medium",
                checked
                    ? "bg-primary/5 border-primary text-primary"
                    : "bg-background border-input text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            )}
        >
            {checked ? <CheckSquare size={18} /> : <Square size={18} />}
            {label}
        </button>
    );
}
