const { GoogleGenerativeAI } = require('@google/generative-ai');
const fetch = require('node-fetch'); // Still needed for general HTTP requests, though not directly for Google Search API here

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
        
        // Get the Gemini model
        const model = genAI.getGenerativeModel({ 
            model: "gemini-2.0-flash",
            // IMPORTANT: Enable the built-in Google Search tool here
            tools: [{
                googleSearch: {} // This activates the built-in Google Search grounding
            }],
        });

        // The prompt should still guide the model on what to do.
        // It will automatically use the enabled Google Search tool if it deems it helpful.
        const prompt = `
            Act as a meticulous fact-checker. Your task is to verify the authenticity of the following news story. To do this, use your knowledge and, crucially, leverage Google Search to find corroborating evidence.

            Follow these steps:
            1.  **Analyze the News:** Carefully read the provided news story.
            2.  **Perform Grounded Search:** If needed, use Google Search to find relevant, recent, and reputable information, official statements, and multiple sources.
            3.  **Synthesize and Conclude:** Based on all available information (your knowledge and search results), provide a clear conclusion (Real, Fake, or Uncertain) and explain your reasoning, citing any factual discrepancies or corroborating evidence.

            Here is the news story to verify: "${news}"
        `;
        
        // Send the message. The model will internally decide when to use Google Search.
        const result = await model.generateContent(prompt);
        const response = result.response;

        let analysisText = response.text();
        let groundingDetails = '';

        // Optional: Retrieve grounding metadata if available
        if (response.candidates && response.candidates[0] && response.candidates[0].groundingMetadata) {
            const groundingMetadata = response.candidates[0].groundingMetadata;
            if (groundingMetadata.searchQueries && groundingMetadata.searchQueries.length > 0) {
                groundingDetails += '\n\n--- Search Queries Used ---\n';
                groundingMetadata.searchQueries.forEach(query => {
                    groundingDetails += `- "${query.text}"\n`;
                });
            }
            if (groundingMetadata.webPages && groundingMetadata.webPages.length > 0) {
                groundingDetails += '\n--- Web Pages Referenced ---\n';
                groundingMetadata.webPages.forEach(page => {
                    groundingDetails += `- ${page.url}\n`;
                });
            }
            if (groundingMetadata.searchEntryPoint && groundingMetadata.searchEntryPoint.renderedContent) {
                groundingDetails += '\n--- Grounding Rendered Content ---\n';
                groundingDetails += groundingMetadata.searchEntryPoint.renderedContent;
            }
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ 
                analysis: analysisText,
                grounding: groundingDetails // Include grounding details in the response
            }),
        };

    } catch (error) {
        console.error('Error interacting with Gemini API:', error);
        // You might want to distinguish between API errors and other errors
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
