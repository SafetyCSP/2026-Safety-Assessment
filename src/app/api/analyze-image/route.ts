import { NextResponse } from 'next/server';

const API_KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

export async function POST(req: Request) {
    if (!API_KEY) {
        return NextResponse.json({ error: 'API Key not configured' }, { status: 500 });
    }

    try {
        const { image, context } = await req.json();

        if (!image || !context) {
            return NextResponse.json({ error: 'Image and context are required' }, { status: 400 });
        }

        // Robustly handle data URL removal and mime type detection
        let base64Data = image;
        let mimeType = "image/png"; // Default to png which is safer for most web uploads than jpeg

        if (image.includes('base64,')) {
            const parts = image.split(';base64,');
            if (parts.length === 2 && parts[0].includes(':')) {
                mimeType = parts[0].split(':')[1];
            }
            base64Data = parts[1] || image.split('base64,')[1];
        }

        console.log(`Analyzing image: Mime=${mimeType}, Size=${base64Data.length} chars`);

        const systemPrompt = `
You are an expert AI Safety Assessor. 
Your task is to analyze the provided image specifically for compliance with the following safety standard:

"${context}"

Instructions:
1. Identify any visual evidence in the image that supports or contradicts compliance with this standard.
2. Be specific about what you see (e.g., "The worker is wearing a hard hat" or "There is no guardrail on the platform").
3. If the image is not relevant to the standard or is unclear, state that.
4. Keep your response concise (bullet points prefered) and suitable for a professional safety report.
`;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [
                        { text: systemPrompt },
                        {
                            inline_data: {
                                mime_type: mimeType,
                                data: base64Data
                            }
                        }
                    ]
                }]
            })
        });

        const data = await response.json();

        if (!response.ok) {
            console.error("Gemini Vision API Error", data);
            return NextResponse.json({ error: data.error?.message || 'Failed to analyze image' }, { status: response.status });
        }

        const analysis = data.candidates?.[0]?.content?.parts?.[0]?.text || "No analysis generated.";

        return NextResponse.json({ analysis });

    } catch (error) {
        console.error("Analyze Image Error:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
