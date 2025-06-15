const { GoogleGenerativeAI } = require('@google/generative-ai');

exports.handler = async function(event, context) {
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method Not Allowed' }),
        };
    }

    const { news } = JSON.parse(event.body);

    if (!news) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'News text is required.' }),
        };
    }

    // Access your API key as an environment variable
    // This is crucial for security and Netlify's recommended practice
    const API_KEY = process.env.GEMINI_API_KEY;

    if (!API_KEY) {
        console.error("GEMINI_API_KEY environment variable is not set.");
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Server configuration error: API key missing.' }),
        };
    }

    try {
        const genAI = new GoogleGenerativeAI(API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-preview-05-20" }); // You can use "gemini-pro" or other available models

        const prompt = `As a neutral news analyst, evaluate the following news articles related to my query.
                Based *only* on the provided articles or url or text, perform the following tasks:
                1. Determine a final verdict. The verdict must be one of these exact phrases: "Likely Real", "Potentially Misleading", "Likely Fake", or "Uncertain".
                2. Write a brief, unbiased reasoning for your verdict based on the provided articles.
                3. If the query says the news is in the future say its future and result as uncertain
this is for when the text is given with articles url or just long texts, if short and just a heading of a news use this prompt
Analyze the following news text for signs of fake news, misinformation, or bias. Provide a concise assessment, clearly stating whether it appears 'Likely Genuine', 'Likely Fake', or 'Uncertain'. Just say it even if its not on your own knowledge surf through the web and give feed back, If its too short just give a close to the real thing feedback and say this will be more accurate if you give more information or the website url. if url given analyze the contents not the website whether its reputable or not.If the give news is suppsedly in the future or something like that Say its uncertain as the result
News Text:
"${news}"`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const analysis = response.text();

        return {
            statusCode: 200,
            body: JSON.stringify({ analysis: analysis }),
        };

    } catch (error) {
        console.error('Error interacting with Gemini API:', error.response?.data || error.message);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to analyze news using the AI. Please try again later.' }),
        };
    }
};
