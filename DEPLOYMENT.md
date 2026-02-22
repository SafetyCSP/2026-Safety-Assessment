# Deployment Guide for AI Safety Tool

**Target Domain:** `portal.berryanalytical.com`
**Hosting Provider:** Vercel (Recommended)

## Prerequisites
- **Git Installed**: If not, download from [git-scm.com](https://git-scm.com/downloads) and install it.
- A **GitHub**, **GitLab**, or **Bitbucket** account.
- A **Vercel** account (can sign up with GitHub).
- Access to your DNS provider for `berryanalytical.com`.

## Step 1: Push Code to Git / GitHub
1.  Initialize Git (if not already done):
    ```bash
    git init
    git add .
    git commit -m "Initial commit of AI Safety Tool"
    ```
2.  Create a new repository on GitHub.
3.  Link and push:
    ```bash
    git remote add origin <your-github-repo-url>
    git branch -M main
    git push -u origin main
    ```

## Step 2: Deploy to Vercel
1.  Log in to [Vercel](https://vercel.com/dashboard).
2.  Click **"Add New..."** -> **"Project"**.
3.  Select your `ai-safety-tool` repository.
4.  **Configure Project**:
    - **Framework Preset**: Next.js (should be auto-detected).
    - **Root Directory**: `./` (default).
    - **Environment Variables**:
        - Key: `GOOGLE_GENERATIVE_AI_API_KEY`
        - Value: *(Paste your API Key here)*
5.  Click **Deploy**.

## Step 3: Configure Domain
1.  Once the deployment is complete (confetti!), go to the project dashboard.
2.  Click **Settings** (top tab) -> **Domains** (side menu).
3.  Enter `portal.workflowanalyticsgroup.com` and click **Add**.
4.  Vercel will display **DNS Records** (usually a CNAME or A record) that are Invalid.
    - **Type**: CNAME
    - **Name**: `portal`
    - **Value**: `cname.vercel-dns.com` (Verify this in the dashboard).

## Step 4: Update DNS Records
1.  Log in to where you bought your domain (GoDaddy, Google Domains, etc.).
2.  Go to **DNS Management** for `workflowanalyticsgroup.com`.
3.  Add the record provided by Vercel:
    - **Type**: `CNAME`
    - **Host/Name**: `portal`
    - **Value/Target**: `cname.vercel-dns.com`
    - **TTL**: Default (e.g., 3600 or 1 hour).
4.  Wait for propagation (usually minutes, up to 24h).
5.  Vercel will show the domain as "Valid" (Green) once it connects.

## Step 5: Verify
Visit [https://portal.workflowanalyticsgroup.com](https://portal.workflowanalyticsgroup.com). Your app should be live!
