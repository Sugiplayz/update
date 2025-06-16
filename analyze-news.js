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

        const prompt = 'You are an advanced news authenticity analyzer. Your task is to critically evaluate a given piece of news (either plain text or from a provided URL) and determine its likely authenticity: Fake, Real, or Uncertain. Your analysis must rely heavily on verifiable information from the most recent and authoritative sources found via search.Input:[User will provide news text or a URL here]Analysis Instructions:Initial Assessment:Read the news carefully.Identify key claims, facts, figures, names, dates, and locations.Information Retrieval & Verification (Critical Focus on Date and Grounding):Internal Knowledge Check: First, use your existing knowledge to verify the claims.Google Search Grounding (MANDATORY for Verification):Crucial Rule on Dates: Do not automatically classify news as Fake solely because its stated event date is in the future relative to the current date or your knowledge cutoff (January 2025 for Gemini 2.5 Pro/Flash).Instead, you MUST use Google Search Grounding to actively search for information about the event, regardless of its reported date.For Events in the Future (relative to current date):Search for pre-reporting, official announcements, or credible plans related to the event from reputable sources.Also, specifically search for any discussions, analyses, or fact-checks that might label such a "future event" as hypothetical, fictional, or part of a simulation/exercise.The absence of legitimate, anticipatory reporting (e.g., press releases, official schedules, confirmed news from major outlets) for an unscheduled future event is a strong indicator of Fake news.If search results show extensive, detailed "news reports" about a future event as if it already happened, critically assess if these reports are actual real-world news or likely part of a simulated/hypothetical scenario that has been indexed as news content. For an event of significant magnitude, genuine pre-reporting would typically occur, followed by live, unfolding coverage if it were real.For Events in the Past/Present (relative to current date):Search for contemporaneous reports, official statements, and corroborating evidence from multiple, independent, authoritative sources.If a URL is provided in the input, you MUST analyze the content within that specific webpage. Do NOT rely on the general reputation of the website; focus solely on the information presented on the given URL, but still use grounding to cross-reference its claims.Formulate precise search queries to verify specific claims, quoted statements, events, or statistics. Prioritize sources with the most recent publication dates or last updated timestamps for all searches.Analysis Breakdown and Reasoning:Fact-Checking (with Date Context): Verify each key claim individually. Explain what your grounding searches found regarding the claim, explicitly mentioning how the date of the event (future, past, present) influenced the type of verification performed and the sources found.Consistency: Check if the information is consistent across different reliable and latest sources found via grounding. Note any inconsistencies or contradictions.Evidence & Authority: Is the news supported by verifiable evidence (e.g., official statements, data, expert testimony, direct observations)? Evaluate the authority of the sources that report on the event.Language & Tone: Is the language objective or does it contain emotional, sensational, or highly biased wording?Context: Is the news presented with appropriate context? Is anything omitted that might change the perception of the information?Attribution: Are sources cited clearly? Are they reputable?Logical Fallacies/Misinformation Tactics: Look for common signs of fake news, such as logical fallacies, appeals to emotion, false urgency, or manipulated media.Output Format:Provide your analysis in the following structured format:Overall Verdict: [Fake | Real | Uncertain]Analysis Breakdown:Claim 1 Verification: [Result of verification, e.g., "Verified by X, Y sources (most recent: [Date])," "Contradicted by A, B sources (most recent: [Date])," "No independent verification found in legitimate pre-reporting/live coverage, despite extensive recent searches for a future/past event."]Reasoning: [Brief explanation of why this claim contributed to the verdict, specifically detailing how the search was conducted based on the events date, and what the nature of the search results indicated. E.g., "Google Search Grounding for this future-dated event yielded numerous reports from [Source Names] describing it as having occurred, however, these appear to be part of a simulated news scenario rather than a genuine real-world incident confirmed by official channels.", "This claim is widely reported by major news organizations with live updates from [Date], confirming it as a real, ongoing event. Claim 2 Verification: [Result of verification]Reasoning: [Brief explanation][Add more claims/points as necessary]Source Reliability (for Grounding Results): [Comment on the types and recency of sources found through Google Search. Explicitly state if the sources confirm a real event, a planned future event, or indicate a likely simulated/fabricated scenario based on their content and context.]Language/Tone Assessment: [Comment on the tone.]Final Reasoning for Overall Verdict:[Provide a concise paragraph explaining why you arrived at the Fake, Real, or Uncertain verdict, summarizing the most impactful findings from your breakdown, focusing on the results of the comprehensive search efforts and the nature of the information found, irrespective of the news dates relation to the current date.'
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
