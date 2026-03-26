# 2026 Site Safety Assessment — Project Handover

Welcome to the **2026 Site Safety Assessment** tool! This document provides an overview of the project's current state, instructions for local development, and steps for deployment to help you review the build and get it live.

## 🚀 Project Overview
A comprehensive AI-powered site safety assessment tool built with **Next.js 16 (App Router)** and **React**. It evaluates regulatory compliance against OSHA, TJC, DNV, and CMS standards, completely augmented with AI-assisted analysis using Google Gemini.

### Core Features:
- **AI Vision Analysis**: Evaluates uploaded images for site safety hazards and formulates risk ratings.
- **AI Chat Assistant**: Provides answers based on both local standards and external regulations.
- **Multi-Standard Assessment**: Tracks standard safety questions and measures compliance percentages.
- **Report Generation**: Outputs an executive summary and full risk breakdown.

---

## 🛠️ Current Build Status
The application is functionally complete and ready for deployment review. 
- **Tests**: The Chat API, Vision API, and Report Generation logic are fully tested and functional. 
- **Typecheck**: Passes `npm run typecheck` successfully.
- **Linting**: Discovered 26 minor linting problems (mostly React `useEffect` dependency warnings and `setState` usage inside effects). While technically considered errors by `eslint-config-next`, they do not block the development server or core application execution, but should be addressed before a strict production build.

---

## 💻 Running Locally

To run the application on your local machine:

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Configure Environment Variables**:
   Create a `.env.local` file in the root directory and add your Gemini API key:
   ```env
   GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_api_key_here
   ```

3. **Start the Development Server**:
   ```bash
   npm run dev
   ```
   *The app will be available at [http://localhost:3000](http://localhost:3000)*.

---

## ☁️ Deployment Instructions

The project is already tailored for **Vercel**, which is the recommended hosting provider. 

### Quick Deploy (Vercel):
1. **Push to GitHub**: Commit the repository and push to your GitHub account.
2. **Import to Vercel**: Connect your GitHub account to Vercel and import the repository.
3. **Environment Variables**: Add `GOOGLE_GENERATIVE_AI_API_KEY` to Vercel's environment variables dashboard securely.
4. **Deploy**: Vercel handles the Next.js build automatically! 

*Note: For detailed domain configuration and deployment nuances (such as Docker or Power Apps), check out the `DEPLOYMENT.md` and `POWER_APPS_DEPLOYMENT.md` files already included in the repository.*

---

## 📞 Troubleshooting
- **Build Fails in Vercel?** If Vercel fails to build due to the ESLint errors mentioned above, you can temporarily bypass them by modifying `next.config.ts` to include `eslint: { ignoreDuringBuilds: true }`.
- **API Failing?** Verify your `GOOGLE_GENERATIVE_AI_API_KEY` is completely valid and has necessary permissions.
