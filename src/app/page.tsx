"use client";

import React from 'react';
import { StartAssessmentForm } from '@/components/StartAssessmentForm';
import { ShieldCheck, FolderOpen } from 'lucide-react';
import Link from 'next/link';

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
          <Link
            href="/assessments"
            className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors mt-2"
          >
            <FolderOpen size={16} />
            My Assessments
          </Link>
        </div>

        <StartAssessmentForm />

        <details className="mt-12 bg-muted/30 border rounded-xl p-4 text-left">
          <summary className="text-xs font-semibold uppercase tracking-wider text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
            Disclaimer
          </summary>
          <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
            This safety assessment (the &quot;Material&quot;) is made available to the user or other receiver of the Material for general informational purposes only. The Material has been developed with consideration of various factors relevant to the subject area, including federal laws and regulations in effect at the time the Information was created and/or certain good management practices relevant to the subject area. Because every industry and/or workplace presents unique circumstances, the Material does not constitute and is not intended to provide specific advice, assurances, or guarantees concerning any user&apos;s compliance with particular regulatory requirements (e.g., OSHA) or other applicable safety and/or health requirements or good management practices. The Material does not constitute training and does not replace the need to properly train all employees nor is the Material a substitute for an assessment of any safety or health hazards present at your facility by a health or safety professional or expert. Users are advised to consult with a legal or other professional advisor concerning specific regulatory compliance requirements applicable to their workplaces and appropriate use of the Material. Users and receivers of the Material are subject in all respects to the terms and conditions set forth at www.grainger.com, including those provisions relating to limitation of liability. Users and receivers of the Material assume all responsibility and risk arising from any and all use of and/or reliance upon the Material, including any modifications made thereto. W.W. Grainger, Inc. (&quot;Grainger&quot;) makes no warranty, expressed or implied that the Material is current, accurate, appropriate or complete for any particular facility or requirements applicable to a particular facility. Grainger shall treat the Material as confidential information of the user or receiver of the Material, not disclose, publish or otherwise disseminate the Material to any third party (except as required by law or court order), and shall only make the Material available to Grainger&apos;s employees and representatives on a need to know basis.
          </p>
        </details>

        <footer className="mt-8 text-center text-sm text-muted-foreground">
          <p>&copy; 2026 AI Safety Compliance Tool. v1.1</p>
        </footer>

      </div>
    </div>
  );
}
