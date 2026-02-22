# Deployment & Integration Guide: From Local to Web & Copilot

This guide explains how to take your **AI Safety Assessment Tool** from your local machine to the web, and how to integrate it into **Microsoft Copilot Studio**.

---

## Part 1: Getting on the Web (Deployment)

To use your tool in Copilot Studio or share it with others, it must be hosted on a public URL (e.g., `https://my-safety-tool.vercel.app`).

### Option A: Vercel (Recommended for Next.js)
Vercel is the creators of Next.js and offers the easiest deployment.

1.  **Push your code to GitHub/GitLab/Bitbucket**.
    *   Initialize a repo: `git init`, `git add .`, `git commit -m "Initial commit"`.
    *   Push to a remote repository.
2.  **Sign up for Vercel** at [vercel.com](https://vercel.com).
3.  **Import your project**:
    *   Click "Add New..." -> "Project".
    *   Select your Git repository.
4.  **Configure Environment Variables**:
    *   In the Vercel dashboard project settings, add:
        *   `GOOGLE_GENERATIVE_AI_API_KEY`: Your Gemini API key.
5.  **Deploy**: Click "Deploy".
    *   You will get a URL like `https://ai-safety-tool.vercel.app`. **Save this URL.**

### Option B: Azure / Docker (Enterprise)
If you prefer Microsoft Azure or Docker containers:
1.  Refer to the included `deploy_to_azure.md` file in your project root.
2.  Follow the steps to build your container and push it to Azure App Service or Azure Container Apps.
3.  **Save your App Service URL** (e.g., `https://ai-safety-tool-123.azurewebsites.net`).

---

## Part 2: Integrating with Copilot Studio

Once your app is live (Part 1), you can connect it to your Microsoft Copilot.

### What You Need
1.  **Your Functioning App URL** (from Part 1).
2.  **The OpenAPI Definition**: We have created a file named `openapi.yaml` in your project root.

### Steps to Integrate
1.  **Open Copilot Studio** (formerly Power Virtual Agents).
2.  **Open your Copilot** (or create a new one).
3.  **Navigate to "Topic & Plugins"** (or "AI Capabilities").
4.  **Add a Plugin (Action)**:
    *   Choose **"From an API"** or **"Custom Connector"**.
5.  **Upload the OpenAPI Definition**:
    *   Select the `openapi.yaml` file from your project.
    *   **CRITICAL**: You must edit `openapi.yaml` first!
        *   Open `openapi.yaml` in a text editor.
        *   Replace `https://<YOUR_APP_URL>` with your *actual* deployed URL (e.g., `https://ai-safety-tool.vercel.app`).
        *   Save the file.
6.  **Review the Actions**:
    *   Copilot will detect two actions: `AnalyzeSafetyImage` and `ChatWithSafetyBot`.
    *   You can now use these actions in your conversational topics.

### Example Usage in Copilot
**User**: "I have a photo of a hazard."
**Copilot**: (Calls `AnalyzeSafetyImage` action with the photo)
**Copilot**: "I've analyzed the image. It appears to be a blocked fire exit..."

---

## Summary Checklist
- [ ] Push code to GitHub.
- [ ] Deploy to Vercel (or Azure).
- [ ] Get the public URL.
- [ ] Update `openapi.yaml` with the public URL.
- [ ] Upload `openapi.yaml` to Copilot Studio as a Plugin/Connector.
