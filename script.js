document.addEventListener('DOMContentLoaded', () => {
    const newsInput = document.getElementById('newsInput');
    const analyzeButton = document.getElementById('analyzeButton');
    const loadingDiv = document.getElementById('loading');
    const resultDiv = document.getElementById('result');
    const analysisContent = document.getElementById('analysisContent');
    const errorDiv = document.getElementById('error');
    const errorMessage = document.getElementById('errorMessage');

    analyzeButton.addEventListener('click', async () => {
        const newsText = newsInput.value.trim();

        if (!newsText) {
            showError('Please enter some news text to analyze.');
            return;
        }

        // Hide previous results/errors
        resultDiv.classList.add('hidden');
        errorDiv.classList.add('hidden');
        loadingDiv.classList.remove('hidden'); // Show loading indicator

        try {
            // Call the Netlify Function
            const response = await fetch('/.netlify/functions/analyze-news', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ news: newsText }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            analysisContent.innerText = data.analysis;
            resultDiv.classList.remove('hidden'); // Show results
        } catch (err) {
            console.error('Fetch error:', err);
            showError(`Failed to get analysis: ${err.message}`);
        } finally {
            loadingDiv.classList.add('hidden'); // Hide loading indicator
        }
    });

    function showError(message) {
        errorMessage.innerText = message;
        errorDiv.classList.remove('hidden');
        resultDiv.classList.add('hidden'); // Hide results if error occurs
    }
});