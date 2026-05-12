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

        let base64Data = image;
        let mimeType = "image/png";

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
3. Determine the compliance status based on the evidence.
4. If there is a hazard or non-compliance, estimate a risk rating.
5. Provide a brief recommendation for mitigation if applicable.

You MUST respond with a valid JSON object matching exactly this schema:
{
  "status": "Yes" | "No" | "Unsure" | "NA",
  "riskRating": "Good" | "Low" | "Medium" | "High",
  "notes": "Bullet points describing the visual evidence and compliance...",
  "recommendation": "Brief recommendation for mitigation (or empty string if compliant)"
}
`;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                generationConfig: {
                    responseMimeType: "application/json"
                },
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

        const analysisText = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
        let analysis = {};
        try {
            analysis = JSON.parse(analysisText);
        } catch {
            console.error("Failed to parse JSON response:", analysisText);
            return NextResponse.json({ error: 'Failed to process AI response properly' }, { status: 500 });
        }

        return NextResponse.json({ analysis });

    } catch (error) {
        console.error("Analyze Image Error:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
