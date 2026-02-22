import { NextResponse } from 'next/server';
import standardsData from '../../../data/standards.json';

const API_KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

// 1. Tool Definitions
const tools = [
    {
        function_declarations: [
            {
                name: "search_local_standards",
                description: "Search the internal safety standards database. Use single keywords or short phrases.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        query: {
                            type: "STRING",
                            description: "Keywords (e.g., 'lithium', 'ladder', '1910.147')."
                        }
                    },
                    required: ["query"]
                }
            },
            {
                name: "search_external_sources",
                description: "Check for external regulations on OSHA.gov or eCFR.gov.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        query: { type: "STRING", description: "The topic to verify." }
                    },
                    required: ["query"]
                }
            }
        ]
    }
];

// 2. Local Search Implementation
function searchLocalStandards(query: string) {
    if (!query) return "No query provided.";
    const terms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2); // Filter short words
    const results: any[] = [];

    // Safety check
    if (Array.isArray(standardsData)) {
        standardsData.forEach((cat: any) => {
            if (cat.questions) {
                cat.questions.forEach((q: any) => {
                    const textContent = q.text?.toLowerCase() || "";
                    const referencesVals = Object.values(q.references || {}).map((r: any) =>
                        typeof r === 'string' ? r.toLowerCase() : ""
                    );

                    // Match IF any term is found in text OR references
                    const match = terms.some(term =>
                        textContent.includes(term) || referencesVals.some(rv => rv.includes(term))
                    );

                    if (match) {
                        results.push({
                            standard_id: q.id,
                            category: cat.title,
                            requirement: q.text,
                            references: q.references
                        });
                    }
                });
            }
        });
    }

    if (results.length === 0) return "No local standards found.";
    return JSON.stringify(results.slice(0, 5));
}

export async function POST(req: Request) {
    if (!API_KEY) {
        return NextResponse.json({ error: 'API Key missing' }, { status: 500 });
    }

    try {
        const { message, messages } = await req.json();
        const history = messages || [{ role: 'user', parts: [{ text: message }] }];
        const lastUserMsg = history[history.length - 1]?.content || message;

        const systemPrompt = `
You are an expert AI Safety Assessor.
**TOOLS**:
1. \`search_local_standards\`: PRIMARY source.
2. \`search_external_sources\`: Use for 'Verification Gate'.

**VERIFICATION GATE**:
If the user asks about a regulation, ALWAYS check local standards first.
If you need to verify externally, call \`search_external_sources\`.

User Query: "${lastUserMsg}"
`;

        let contents: any[] = [{
            role: "user",
            parts: [{ text: systemPrompt }]
        }];

        // Multi-turn Loop
        let turn = 0;
        const maxTurns = 3;
        let finalReply = "";

        while (turn < maxTurns) {
            turn++;

            // Call Gemini
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents, tools })
            });

            const data = await response.json();

            if (!response.ok) {
                console.error("Gemini Loop Error:", data);
                return NextResponse.json({ error: data.error?.message || "Bot Error" }, { status: 500 });
            }

            const candidate = data.candidates?.[0];
            const functionCall = candidate?.content?.parts?.find((p: any) => p.functionCall);

            if (functionCall) {
                const { name, args } = functionCall.functionCall;
                console.log(`[Turn ${turn}] Calling Tool: ${name}`, args);

                let toolResult = "";
                if (name === 'search_local_standards') {
                    toolResult = searchLocalStandards(args.query);
                } else if (name === 'search_external_sources') {
                    toolResult = "External Search API is restricted. Please advise the user to verify manually on OSHA.gov/eCFR.gov.";
                }

                // Add Model Request to History
                contents.push({
                    role: "model",
                    parts: [{ functionCall: functionCall.functionCall }]
                });

                // Add Function Response to History
                contents.push({
                    role: "function",
                    parts: [{
                        functionResponse: {
                            name: name,
                            response: { name: name, content: toolResult }
                        }
                    }]
                });

                // Loop continues to next iteration to get analysis of tool result
            } else {
                // No function call -> Final text response
                finalReply = candidate?.content?.parts?.map((p: any) => p.text).join(' ') || "No response.";
                break; // Exit loop
            }
        }

        return NextResponse.json({ reply: finalReply });

    } catch (error) {
        console.error("Route Error:", error);
        return NextResponse.json({ error: "Server Error" }, { status: 500 });
    }
}
