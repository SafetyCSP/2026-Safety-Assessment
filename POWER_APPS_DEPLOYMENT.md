# Power Apps Deployment Playbook

This checklist prepares the Safety Assessment Tool for deployment and Power Apps integration.

## 1. Pre-deploy validation
Run these commands from the project root:

```bash
npm install
npm run validate:env:strict
npm run typecheck
npm run build
```

If you are not using cloud sync yet, run `npm run validate:env` instead of strict mode.

## 2. Required environment variables
Set these in your hosting platform (Azure App Service, Container Apps, or Vercel):

- `GOOGLE_GENERATIVE_AI_API_KEY` (required for chat/image analysis/AI summary)

Set these when enabling OneDrive or SharePoint sync:

- `MS_TENANT_ID`
- `MS_CLIENT_ID`
- `MS_CLIENT_SECRET`
- `MS_DRIVE_ID`
- `MS_FOLDER_PATH` (optional, defaults to `SafetyAssessments`)

Optional:

- `NEXT_PUBLIC_APP_URL` (used for documentation/connector clarity)

## 3. Microsoft Graph setup (OneDrive/SharePoint storage)
1. Create an Entra app registration.
2. Add application permissions:
   - `Files.ReadWrite.All`
   - `Sites.ReadWrite.All` (for SharePoint drives)
3. Grant admin consent.
4. Create a client secret.
5. Find your target Drive ID:
   - OneDrive: the user drive ID.
   - SharePoint: document library drive ID from the site.
6. Store IDs/secrets as environment variables.

## 4. Deploy the app
Deploy with your standard Next.js workflow (Azure/Vercel/Docker).

After deploy, verify:

- `GET /api/health` returns JSON status
- `POST /api/executive-summary` works
- `POST /api/cloud-sync` uploads JSON when Graph vars are configured

## 5. Configure Power Apps / Power Automate connector
1. Open `openapi.yaml`.
2. Replace `https://<YOUR_APP_URL>` with your deployed API URL.
3. In Power Apps or Power Automate, create a Custom Connector from this OpenAPI file.
4. Test actions:
   - `GetHealth`
   - `GenerateExecutiveSummary`
   - `SyncAssessmentToCloud`
   - (optional) `AnalyzeSafetyImage`, `ChatWithSafetyBot`

## 6. Production readiness checklist
- [ ] Assessment flow validated end-to-end in browser
- [ ] Export options verified (PDF/CSV/Word)
- [ ] Executive summary formatting is consistent
- [ ] Unanswered questions excluded from score/report
- [ ] Cloud sync tested against OneDrive/SharePoint target folder
- [ ] Connector imported into Power Apps and actions tested