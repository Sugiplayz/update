const { GoogleGenerativeAI } = require('@google/generative-ai');
const fetch = require('node-fetch'); // Still needed for general HTTP requests if you add other APIs, but not directly for Google Search API in this grounding setup

exports.handler = async function(event) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const { news } = JSON.parse(event.body);
    if (!news) {
        return { statusCode: 400, body: JSON.stringify({ error: 'News text is required.' }) };
    }
    
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
        console.error("GEMINI_API_KEY environment variable is not set.");
        return { statusCode: 500, body: JSON.stringify({ error: 'Server configuration error.' }) };
    }

    try {
        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        
        // Get the Gemini model with the built-in Google Search tool enabled
        const model = genAI.getGenerativeModel({ 
            model: "gemini-2.0-flash",
            tools: [{
                googleSearch: {} // This activates the built-in Google Search grounding
            }],
        });

        // --- REFINED PROMPT FOR DETAILED ANALYSIS AND GROUNDING ---
        const prompt = `
            Act as a meticulous, impartial, and concise fact-checker. Your task is to analyze the provided news text for signs of fake news, misinformation, or bias.

            Based on your assessment, provide a clear conclusion, stating whether the news appears:
            - 'Likely Genuine'
            - 'Likely Fake'
            - 'Uncertain'

            After your conclusion, provide a brief, direct explanation (1-3 sentences) of your reasoning. Focus your analysis on:
            - Factual accuracy: Are the claims supported by verifiable facts?
            - Source credibility: Is the source reliable and unbiased?
            - Sensationalism: Does the language use emotional appeals, hyperbole, or misleading headlines?
            - Logical consistency: Are there contradictions or unsupported claims within the text?

            Utilize Google Search as necessary to verify facts, cross-reference information with reputable sources, and check for official statements, especially for information that might be outside your direct knowledge cutoff. For very recent events, prioritize your internal knowledge, but use search if details are obscure or require real-time verification.

            Do NOT include any conversational filler like "As a fact-checker..." or "Here's my analysis:". Be straightforward and objective.

            News text to analyze: "${news}"
        `;
        
        // Send the message. The model will internally decide when to use Google Search based on the prompt.
        const result = await model.generateContent(prompt);
        const response = result.response;

        let analysisText = response.text().trim(); // Trim any whitespace

        let groundingDetails = ''; // Initialize to an empty string
        const searchQueriesUsed = [];
        const webPagesReferenced = [];
        let renderedGroundingContent = '';

        // Retrieve and format grounding metadata if available
        if (response.candidates && response.candidates[0] && response.candidates[0].groundingMetadata) {
            const groundingMetadata = response.candidates[0].groundingMetadata;
            
            if (groundingMetadata.searchQueries && groundingMetadata.searchQueries.length > 0) {
                groundingDetails += '\n\n--- Search Queries Used ---\n';
                groundingMetadata.searchQueries.forEach(query => {
                    groundingDetails += `- "${query.text}"\n`;
                    searchQueriesUsed.push(query.text);
                });
            }
            if (groundingMetadata.webPages && groundingMetadata.webPages.length > 0) {
                groundingDetails += '\n--- Web Pages Referenced ---\n';
                groundingMetadata.webPages.forEach(page => {
                    groundingDetails += `- ${page.url}\n`;
                    webPagesReferenced.push(page.url);
                });
            }
            if (groundingMetadata.searchEntryPoint && groundingMetadata.searchEntryPoint.renderedContent) {
                renderedGroundingContent = groundingMetadata.searchEntryPoint.renderedContent;
            }
        }

        // Return the structured analysis and optional grounding details
        return {
            statusCode: 200,
            body: JSON.stringify({ 
                analysis: analysisText,
                groundingInfo: {
                    searchQueries: searchQueriesUsed,
                    webPages: webPagesReferenced,
                    renderedContent: renderedGroundingContent // This can be quite verbose
                }
            }),
        };

    } catch (error) {
        console.error('Error interacting with Gemini API:', error);
        // Distinguish between API errors and other errors for better debugging
        if (error.status) {
            return {
                statusCode: error.status,
                body: JSON.stringify({ 
                    error: `Gemini API Error: ${error.statusText || 'Unknown'}`,
                    details: error.errorDetails || error.message
                }),
            };
        }
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to analyze news due to an unexpected error.' }),
        };
    }
};
