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
        
        // Get the Gemini model with the built-in Google Search tool enabled
        const model = genAI.getGenerativeModel({ 
            model: "gemini-2.0-flash",
            tools: [{
                googleSearch: {} // This activates the built-in Google Search grounding
            }],
        });

        // --- REFINED PROMPT ---
        const prompt = `
            You are an extremely concise and direct fact-checker.
            Your ONLY task is to determine if the following news story is "Real" or "Fake".

            Rules:
            1.  For news that is likely within your general knowledge cutoff (typically recent events up to early 2024), prioritize your internal knowledge.
            2.  For older news, obscure details, or information not within your direct knowledge, you are empowered and encouraged to use Google Search to find corroborating evidence.
            3.  Your response MUST be ONLY ONE WORD: either "Real" or "Fake".
            4.  Do NOT provide any explanations, reasoning, additional sentences, or commentary.
            5.  Do NOT act conversational. Be strictly factual and to the point.

            News story to verify: "${news}"
        `;
        
        // Send the message. The model will internally decide when to use Google Search based on the prompt.
        const result = await model.generateContent(prompt);
        const response = result.response;

        // The model's text should now only be "Real" or "Fake" due to the strict prompt.
        const analysisText = response.text().trim(); // Use .trim() to remove any leading/trailing whitespace

        // We are no longer including detailed grounding metadata in the immediate analysis response,
        // as the requirement is for a single-word output.
        // If you need to log or view grounding metadata for debugging, you can still access:
        // response.candidates[0].groundingMetadata.searchQueries
        // response.candidates[0].groundingMetadata.webPages
        // console.log("Grounding metadata (for debug):", response.candidates?.[0]?.groundingMetadata);

        // Ensure the output is strictly "Real" or "Fake"
        if (analysisText === "Real" || analysisText === "Fake") {
            return {
                statusCode: 200,
                body: JSON.stringify({ 
                    analysis: analysisText
                }),
            };
        } else {
            // Fallback if the model doesn't strictly follow the "Real" or "Fake" output
            console.warn("Model did not return strictly 'Real' or 'Fake'. Raw response:", analysisText);
            return {
                statusCode: 200,
                body: JSON.stringify({ 
                    analysis: "Uncertain (Model output not 'Real' or 'Fake')"
                }),
            };
        }


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
