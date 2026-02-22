"use client";

import React from 'react';
import { StartAssessmentForm } from '@/components/StartAssessmentForm';
import { ShieldCheck } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-muted/20">
      <div className="max-w-4xl mx-auto px-4 py-12 sm:px-6 lg:px-8">

        <div className="text-center mb-12 space-y-4">
          <div className="inline-flex p-3 rounded-full bg-primary/10 text-primary mb-4">
            <ShieldCheck size={48} />
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            2026 Grainger Safety Assessment
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Comprehensive regulatory compliance tool. Please configure the assessment details below to begin.
          </p>
        </div>

        <StartAssessmentForm />

        <footer className="mt-16 text-center text-sm text-muted-foreground">
          <p>© 2026 AI Safety Compliance Tool. v1.1</p>
        </footer>

      </div>
    </div>
  );
}
