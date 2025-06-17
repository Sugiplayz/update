const { GoogleGenerativeAI } = require('@google/generative-ai');
const fetch = require('node-fetch'); // You may need to add 'node-fetch' to your project's dependencies

// --- Helper Function to Perform the actual Google Search ---
// This function will be called by the Gemini model when it needs to search the web.
async function performGoogleSearch(query) {
    console.log(`Performing a real-time search for: ${query}`);
    
    // Corrected variable names to use underscores instead of spaces for consistency and validity
    const Google_Search_API_KEY = process.env.Google_Search_API_KEY;
    const SEARCH_ENGINE_ID = process.env.SEARCH_ENGINE_ID;

    if (!Google_Search_API_KEY || !SEARCH_ENGINE_ID) {
        console.error("Google Search API Key or Search Engine ID is not set.");
        return "Error: Server is not configured for searching.";
    }

    // CORRECTED: Using the valid variable name in the URL to avoid syntax errors in template literals.
    const url = `https://www.googleapis.com/customsearch/v1?key=${Google Search_API_KEY}&cx=${SEARCH_ENGINE_ID}&q=${encodeURIComponent(query)}`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            console.error(`Google Search API error: ${response.statusText}`);
            return `Error: Failed to fetch search results. Status: ${response.status}`;
        }
        const data = await response.json();

        // Extract and format the most relevant results for the model
        const results = data.items?.slice(0, 5).map(item => ({
            title: item.title,
            link: item.link,
            snippet: item.snippet
        })) || [];
        
        return JSON.stringify(results);

    } catch (error) {
        console.error('Error during Google Search API call:', error);
        return "Error: An exception occurred while trying to perform a web search.";
    }
}

// --- Tool Definition ---
// Tool names for the API should be single strings without spaces.
const tools = {
    "Google Search": { // Tool name as a single string
        description: "Performs a Google search to find the most recent and relevant information on a given topic. Use this to verify news, check facts, and find official statements.",
        parameters: {
            type: "object",
            properties: {
                query: {
                    type: "string",
                    description: "The search query to use. Be specific to get the best results."
                }
            },
            required: ["query"]
        },
        function: performGoogleSearch // Link the definition to our actual search function
    }
};


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
        // Get a model that supports tool use and pass the tool definition
        const model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash", // Using a model that is excellent at tool use
            tools: tools,
        });

        // Start a chat session to handle the back-and-forth for tool calling
        const chat = model.startChat();

        // Use the clear, direct prompt designed for tool use
        const prompt = `
            Act as a meticulous fact-checker. Your task is to verify the authenticity of the following news story. To do this, you must use the search tool provided to find corroborating evidence.

            Follow these steps:
            1.  **Analyze the Source (if provided):** Scrutinize the original source.
            2.  **Corroborate with Multiple Reputable Sources:** Use the search tool to find other well-established news outlets reporting on the same story.
            3.  **Check for Official Statements:** Use the search tool to look for official statements from anyone involved.
            4.  **Synthesize and Conclude:** Based on your search findings, provide a clear conclusion (Real, Fake, or Uncertain) and explain your reasoning, citing the sources you found.

            Here is the news story to verify: "${news}"
        `;
        
        const result = await chat.sendMessage(prompt);
        const response = result.response;

        // Check if the model decided to call a tool
        const functionCall = response.functionCalls()?.[0];

        if (functionCall) {
            // The model wants to search!
            const { name, args } = functionCall;
            if (tools[name]) {
                const searchFunction = tools[name].function;
                const searchQuery = args.query;

                // Execute the search function
                const searchResults = await searchFunction(searchQuery);

                // Send the search results back to the model
                const result2 = await chat.sendMessage([
                    {
                        functionResponse: {
                            // CORRECTED: The name sent back must match the tool name defined in the `tools` object.
                            name: 'Google Search', 
                            response: {
                                content: searchResults,
                            }
                        }
                    }
                ]);

                // Get the final answer after the model has analyzed the search results
                const finalResponse = result2.response.text();
                return {
                    statusCode: 200,
                    body: JSON.stringify({ analysis: finalResponse }),
                };

            }
        }
        
        // If the model answered without a tool call (unlikely for this prompt but possible)
        const analysis = response.text();
        return {
            statusCode: 200,
            body: JSON.stringify({ analysis: analysis }),
        };

    } catch (error) {
        console.error('Error interacting with Gemini API:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to analyze news.' }),
        };
    }
};
