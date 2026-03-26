# AI Site Safety Assessment Tool - Project Context & Instructions

This document provides comprehensively detailed context, architecture, and constraints for the "AI Site Safety Assessment Tool" project. It is intended to be uploaded to a Custom GPT, agent builder, or other AI assistant to provide ground truth on how to assist with development, debugging, and feature additions for this specific application.

## 1. Project Overview & Purpose
**Name:** AI Site Safety Assessment Tool
**Purpose:** A digital compliance and safety assessment tool for field assessors to evaluate facilities against regulatory standards (e.g., OSHA, TJC, DNV) and generate comprehensive, offline-ready PDF reports.
**Key Constraint:** STRICLY LOCAL. The application must not send any sensitive company data, assessment answers, or images to ANY external API (including external AI models like OpenAI, Anthropic, Gemini, etc.). It operates 100% locally in the user's browser to comply with strict internal data security and privacy company policies.

## 2. Tech Stack
- **Framework:** Next.js 16.1.6 (App Router)
- **UI Library:** React 19.2.3
- **Styling:** Tailwind CSS v4, `clsx`, `tailwind-merge`
- **Icons:** `lucide-react`
- **Language:** TypeScript
- **PDF Handling:** `pdfjs-dist` (for generating thumbnails locally)
- **Data Export:** `xlsx` (for CSV/spreadsheet exports)

## 3. Architecture & State Management
- **Client-Side Only:** The application relies entirely on client components (`"use client";`) due to the heavy use of browser APIs (localStorage, File API for images/PDFs, window.print). 
- **AssessmentContext (`src/context/AssessmentContext.tsx`):** The central state manager. It handles:
  - Loading questions (`data/standards.json`).
  - Tracking current assessment progress and answers.
  - Storing data locally utilizing browser `localStorage`.
  - Handling image/PDF attachment state as base64 strings.
- **Reporting (`src/app/report/page.tsx`):** A dedicated route designed specifically for printing to PDF. It includes complex layout rules (e.g., `break-inside-avoid`, explicit `@page` print margins) to ensure report elements (Question responses, Risk Breakdown) are split cleanly across printed pages.

## 4. Key Data Models (`src/types/standards.ts`)
- **AssessmentData:** Array of category objects, which contain an array of `Question` objects.
- **Question:** Contains ID, text, and regulatory references.
- **Answer:** Tracks the status (`Yes`, `No`, `Unsure`, `NA`), assigned `RiskRating` (Good, Low, Medium, High, Unknown), custom notes (Findings), recommendations, and a list of attached image/PDF evidence (stored as lightweight thumbnails and base64).
- **AssessmentConfig:** Holds metadata about the assessment (Customer info, Assessor name, Date, etc.).

## 5. Strict Constraints & Development Rules for the GPT
When assisting with this project, you **MUST** adhere to the following rules:
1. **NO EXTERNAL APIS:** Do not suggest or implement code that uses `fetch` or Axios to send assessment data, text, or images to backend servers or external AI models. All features must be able to run completely offline.
2. **LOCAL STORAGE RESTRICTIONS:** Be mindful of `localStorage` limits (usually ~5MB). The project currently compresses images and extracts early thumbnails from PDFs before saving them to context to avoid quota exceptions. Do not alter this compression logic.
3. **PRINT-FRIENDLY CSS:** If making changes to the `src/app/report/page.tsx`, you must maintain the existing `@media print` rules, Tailwind `print:*` utility classes, and avoid adding CSS that breaks page breaks (e.g., avoid `flex/grid` containers that lock aspect ratios across page boundaries without `break-inside-avoid` handlers).
4. **COMPONENT DESIGN:** Use standard Tailwind CSS. Maintain the existing dark/light mode compatibility present in `globals.css` and the `cn()` utility from `utils.ts` for classy component classes. 
5. **NO AI VISION:** The AI image analysis feature was explicitly removed to comply with company data policies. Do not suggest adding it back in.

## 6. Common Workflows
- **Adding a Question:** Modify the static `src/data/standards.json` file. The UI dynamically renders questions.
- **Customizing the Report:** Edit `src/app/report/page.tsx`. Report summaries are calculated dynamically based strictly on the risk values assigned to "No" or "Unsure" answers on the active `AssessmentContext`.
- **Handling Evidence:** `src/components/QuestionCard.tsx` manages file uploads. Images and PDFs are parsed client-side using native FileReader APIs.

---
*End of Custom GPT Instructions.*
