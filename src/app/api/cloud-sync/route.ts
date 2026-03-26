import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

interface SyncPayload {
    assessmentId: string;
    customerName: string;
    assessedAt: string;
    report: Record<string, unknown>;
}

interface GraphTokenResponse {
    access_token: string;
}

function sanitizeFileName(value: string): string {
    return value.replace(/[\\/:*?"<>|]/g, '-').replace(/\s+/g, '-').slice(0, 80);
}

async function getGraphAccessToken() {
    const tenantId = process.env.MS_TENANT_ID;
    const clientId = process.env.MS_CLIENT_ID;
    const clientSecret = process.env.MS_CLIENT_SECRET;

    if (!tenantId || !clientId || !clientSecret) {
        throw new Error('Missing Microsoft Graph credentials. Set MS_TENANT_ID, MS_CLIENT_ID, and MS_CLIENT_SECRET.');
    }

    const form = new URLSearchParams();
    form.set('grant_type', 'client_credentials');
    form.set('client_id', clientId);
    form.set('client_secret', clientSecret);
    form.set('scope', 'https://graph.microsoft.com/.default');

    const tokenResponse = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: form,
    });

    if (!tokenResponse.ok) {
        const detail = await tokenResponse.text();
        throw new Error(`Unable to retrieve Graph token: ${detail}`);
    }

    const tokenJson = (await tokenResponse.json()) as GraphTokenResponse;
    return tokenJson.access_token;
}

async function uploadJsonToDrive(accessToken: string, payload: SyncPayload) {
    const driveId = process.env.MS_DRIVE_ID;
    const folderPath = process.env.MS_FOLDER_PATH || 'SafetyAssessments';

    if (!driveId) {
        throw new Error('Missing MS_DRIVE_ID.');
    }

    const safeCustomer = sanitizeFileName(payload.customerName || 'customer');
    const safeAssessment = sanitizeFileName(payload.assessmentId || 'assessment');
    const dateStamp = new Date(payload.assessedAt || Date.now()).toISOString().split('T')[0];
    const fileName = `${safeCustomer}-${safeAssessment}-${dateStamp}.json`;

    const uploadUrl = `https://graph.microsoft.com/v1.0/drives/${driveId}/root:/${folderPath}/${fileName}:/content`;
    const body = JSON.stringify(payload.report, null, 2);

    const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body,
    });

    if (!uploadResponse.ok) {
        const detail = await uploadResponse.text();
        throw new Error(`Upload failed: ${detail}`);
    }

    return uploadResponse.json();
}

export async function POST(request: Request) {
    try {
        const payload = (await request.json()) as SyncPayload;

        if (!payload?.assessmentId || !payload?.report) {
            return NextResponse.json({ error: 'Missing assessmentId or report payload.' }, { status: 400 });
        }

        const token = await getGraphAccessToken();
        const uploadedItem = await uploadJsonToDrive(token, payload);

        return NextResponse.json({
            ok: true,
            id: uploadedItem?.id,
            name: uploadedItem?.name,
            webUrl: uploadedItem?.webUrl,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Cloud sync failed.';
        console.error('Cloud sync error:', error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
