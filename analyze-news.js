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

        const prompt = `You are an advanced news authenticity analyzer. Your task is to critically evaluate a given piece of news (either plain text or from a provided URL) and determine its likely authenticity: 'Fake', 'Real', or 'Uncertain'.Analysis Instructions:Initial Assessment:Read the news carefully.Identify key claims, facts, figures, names, dates, and locations.Information Retrieval & Verification:Internal Knowledge Check: First, use your existing knowledge to verify the claims.Google Search Grounding (Crucial Step):If the news contains information dated after your knowledge cutoff (currently January 2025 for Gemini 2.5 Pro/Flash), or if you cannot find sufficient internal information, you MUST use Google Search Grounding to find relevant and up-to-date sources.If a URL is provided in the input, you MUST analyze the content within that specific webpage. Do NOT rely on the general reputation of the website; focus solely on the information presented on the given URL.Formulate precise search queries to verify specific claims, quoted statements, events, or statistics. Look for corroborating evidence from multiple credible sources.Analysis Breakdown and Reasoning:Fact-Checking: Verify each key claim individually.Consistency: Check if the information is consistent across different reliable sources found via grounding.Evidence: Is the news supported by verifiable evidence (e.g., official statements, data, expert testimony, direct observations)?Language & Tone: Is the language objective or does it contain emotional, sensational, or highly biased wording?Context: Is the news presented with appropriate context? Is anything omitted that might change the perception of the information?Date: Is the news current or is it recycled old information presented as new? (This is especially where Google Search Grounding will be vital).Attribution: Are sources cited clearly? Are they reputable (when applicable, but remember to prioritize content for URLs)?Logical Fallacies/Misinformation Tactics: Look for common signs of fake news, such as logical fallacies, appeals to emotion, false urgency, or manipulated media (though image/video analysis is outside the scope of text-based grounding).Output Format:Provide your analysis in the following structured format:Overall Verdict: [Fake | Real | Uncertain]Analysis Breakdown:Claim 1 Verification: [Result of verification, e.g., "Verified by X, Y sources," "Contradicted by A, B sources," "No independent verification found."]Reasoning: [Brief explanation of why this claim contributed to the verdict. E.g., "Multiple reputable news outlets reported this event.", "This statistic could not be found or was misrepresented in source C."]Claim 2 Verification: [Result of verification]Reasoning: [Brief explanation][Add more claims/points as necessary]Source Reliability (for Grounding Results): [Comment on the types of sources found through Google Search (e.g., "Information corroborated by government reports and major news organizations," "Information found primarily on social media and unverified blogs," "Conflicting reports from equally credible sources.")]Language/Tone Assessment: [Comment on the tone, e.g., "Objective and factual," "Highly sensationalized with emotional language," "Neutral but lacking depth."]Final Reasoning for Overall Verdict:[Provide a concise paragraph explaining why you arrived at the 'Fake', 'Real', or 'Uncertain' verdict, summarizing the most impactful findings from your breakdown.
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
