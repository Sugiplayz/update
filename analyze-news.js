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
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // You can use "gemini-pro" or other available models

        const prompt = `Analyze the following news text for signs of fake news, misinformation, or bias. Provide a concise assessment, clearly stating whether it appears 'Likely Genuine', 'Likely Fake', or 'Uncertain'. Explain your reasoning briefly. Focus on factual accuracy, source credibility, sensationalism, and logical consistency.

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
