import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const graphVars = ['MS_TENANT_ID', 'MS_CLIENT_ID', 'MS_CLIENT_SECRET', 'MS_DRIVE_ID'] as const;

export async function GET() {
    const geminiConfigured = Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY);

    const graphValues = graphVars.map((key) => process.env[key]);
    const graphConfigured = graphValues.every(Boolean);
    const graphPartiallyConfigured = graphValues.some(Boolean) && !graphConfigured;

    const status = graphPartiallyConfigured ? 'degraded' : 'ok';

    return NextResponse.json({
        status,
        timestamp: new Date().toISOString(),
        service: 'ai-safety-tool',
        checks: {
            aiFeaturesConfigured: geminiConfigured,
            cloudSyncConfigured: graphConfigured,
            cloudSyncPartiallyConfigured: graphPartiallyConfigured,
        },
    });
}