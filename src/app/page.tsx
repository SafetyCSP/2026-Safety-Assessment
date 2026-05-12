"use client";

import React from 'react';
import { StartAssessmentForm } from '@/components/StartAssessmentForm';
import { ShieldCheck, FolderOpen, Settings } from 'lucide-react';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-muted/20">
      <div className="max-w-4xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <div className="text-center mb-12 space-y-4">
          <div className="inline-flex p-3 rounded-full bg-primary/10 text-primary mb-4">
            <ShieldCheck size={48} />
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">Safety Assessment Tool</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            OSHA-aligned assessment workflow with configurable questions, evidence attachments, and report generation.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link href="/assessments" className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors mt-2">
              <FolderOpen size={16} />
              My Assessments
            </Link>
            <Link href="/questions" className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors mt-2">
              <Settings size={16} />
              Question Configuration
            </Link>
          </div>
        </div>

        <StartAssessmentForm />


        <footer className="mt-8 text-center text-sm text-muted-foreground">
          <p>&copy; 2026 Site Safety Compliance Tool. v2.0</p>
        </footer>
      </div>
    </div>
  );
}
