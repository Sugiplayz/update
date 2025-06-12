console.log('script.js loaded and executing'); // Added for debugging

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded fired'); // Added for debugging

    // DOM Elements for Detector
    // Removed newsUrlInput as URL analysis is removed
    const newsTextInput = document.getElementById('newsText'); // Correctly references Text input
    const analyzeButton = document.getElementById('analyzeButton');
    const loadingDiv = document.getElementById('loading');
    const resultDiv = document.getElementById('result');
    const analysisContent = document.getElementById('analysisContent'); // Targeted div for AI text explanation
    const errorDiv = document.getElementById('error');
    const errorMessage = document.getElementById('errorMessage');

    // DOM Elements for Navigation
    const navLinks = document.querySelectorAll('.nav-link');
    const pages = document.querySelectorAll('.page');
    // Removed currentActivePageId as it's less relevant with simplified input
    // let currentActivePageId = 'home-page'; // Track currently active page

    // Removed inputTabs, urlSection, textSection, currentTab as URL analysis and tabs are removed

    // --- Utility Functions ---

    // Function to show/hide elements and apply animation class
    function setVisibility(element, show) {
        if (element) { // Ensure element exists
            if (show) {
                element.classList.remove('hidden');
                // Trigger reflow to restart animation if element was hidden and quickly shown again
                void element.offsetWidth; // Forces reflow
                element.classList.add('animated');
            } else {
                element.classList.add('hidden');
                element.classList.remove('animated');
            }
        } else {
            console.warn('Attempted to set visibility on null element:', element); // Debugging
        }
    }

    // Function to hide all result/loading/error displays
    function hideAllStatusDisplays() {
        setVisibility(resultDiv, false);
        setVisibility(loadingDiv, false);
        setVisibility(errorDiv, false);
        console.log('All status displays hidden.'); // Debugging
    }

    // --- Navigation Logic ---

    function showPage(pageId) {
        console.log('Attempting to show page:', pageId); // Debugging

        // Deactivate all pages and nav links
        pages.forEach(p => p.classList.remove('active'));
        navLinks.forEach(link => link.classList.remove('active'));
        console.log('All pages and nav links deactivated.'); // Debugging

        // Activate the selected page and corresponding nav link
        const targetPage = document.getElementById(pageId);
        const targetNavLink = document.querySelector(`.nav-link[data-page="${pageId.replace('-page', '')}"]`); // Get link by data-page attribute

        if (targetPage) {
            targetPage.classList.add('active');
            console.log(`Page '${pageId}' activated.`); // Debugging

            // Trigger animation for the section within the page if it's the first time or re-showing
            targetPage.querySelectorAll('section').forEach(section => {
                section.classList.remove('animated'); // Reset animation
                void section.offsetWidth; // Trigger reflow
                section.classList.add('animated');
                console.log('Triggered section animation for:', section.id); // Debugging
            });
        } else {
            console.error(`Page element with ID '${pageId}' not found!`); // Debugging
        }
        if (targetNavLink) {
            targetNavLink.classList.add('active');
            console.log(`Nav link for '${pageId}' activated.`); // Debugging
        } else {
            console.warn(`Nav link for '${pageId.replace('-page', '')}' not found!`); // Debugging
        }

        // currentActivePageId = pageId; // Update tracking - no longer strictly necessary with simplified input
        hideAllStatusDisplays(); // Clear status messages when switching pages
    }

    // Add click listeners to navigation links
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            const pageToShow = link.dataset.page + '-page'; // e.g., 'home-page' or 'about-us-page'
            console.log('Nav link clicked. Data-page:', link.dataset.page); // Debugging
            showPage(pageToShow);
        });
    });

    // --- Analysis Logic ---

    analyzeButton.addEventListener('click', async () => {
        console.log('Analyze button clicked.'); // Debugging
        let content = newsTextInput.value.trim(); // Always read from text input now
        let contentType = 'text'; // Always 'text' now

        // Log input values directly before validation
        console.log('Value from newsTextInput (trimmed):', newsTextInput ? newsTextInput.value.trim() : 'N/A');

        if (!content) {
            setVisibility(errorDiv, true);
            errorMessage.innerText = 'Please enter some news text to analyze.';
            console.log('Text input empty, showing error.'); // Debugging
            return;
        }
        
        // Hide previous results/errors
        hideAllStatusDisplays();
        setVisibility(loadingDiv, true); // Show loading indicator
        analyzeButton.disabled = true; // Disable button during analysis
        console.log(`Starting analysis for type: ${contentType}, content length: ${content.length}`); // Debugging

        try {
            // Call the Netlify Function (your actual API call)
            const response = await fetch('/.netlify/functions/analyze-news', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ news: content, type: contentType }), // Pass type if your function needs it
            });
            console.log('Fetch response received, status:', response.status); // Debugging

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('Analysis data received:', data); // Debugging
            displayAnalysisResult(data.analysis); // Display AI analysis result
            setVisibility(resultDiv, true); // Show results section
        } catch (err) {
            console.error('Analysis failed during fetch:', err); // Debugging
            setVisibility(errorDiv, true);
            errorMessage.innerText = `Analysis failed: ${err.message}. Please try again.`;
        } finally {
            setVisibility(loadingDiv, false); // Hide loading indicator
            analyzeButton.disabled = false; // Re-enable button
            console.log('Analysis process finished.'); // Debugging
        }
    });

    // Function to display the analysis result received from the AI
    function displayAnalysisResult(aiAnalysisText) {
        console.log('Displaying analysis result. AI Text:', aiAnalysisText); // Debugging

        let verdict = 'uncertain';
        let confidence = Math.random(); // Default for mock
        if (aiAnalysisText.toLowerCase().includes('likely genuine') || aiAnalysisText.toLowerCase().includes('likely real') || aiAnalysisText.toLowerCase().includes('true')) {
            verdict = 'real';
            confidence = 0.8 + Math.random() * 0.2; // Higher confidence for "real"
        } else if (aiAnalysisText.toLowerCase().includes('likely fake') || aiAnalysisText.toLowerCase().includes('misinformation') || aiAnalysisText.toLowerCase().includes('false')) {
            verdict = 'fake';
            confidence = 0.8 + Math.random() * 0.2; // Higher confidence for "fake"
        } else {
            // If AI text doesn't strongly indicate real/fake, use a lower/mid confidence for "uncertain"
            confidence = 0.3 + Math.random() * 0.4; 
        }
        console.log('Inferred verdict:', verdict, 'Confidence:', confidence); // Debugging

        const resultIcon = document.getElementById('resultIcon');
        const resultTitle = document.getElementById('resultTitle');
        const confidenceScore = document.getElementById('confidenceScore');

        // Set result type and styling based on inferred verdict
        if (resultDiv) resultDiv.className = `status-box result ${verdict}`;

        // Set icon and title based on verdict
        if (resultIcon) {
            if (verdict === 'real') {
                resultIcon.innerHTML = '<i class="fas fa-check-circle"></i>';
                if (resultTitle) resultTitle.textContent = 'Likely REAL News';
            } else if (verdict === 'fake') {
                resultIcon.innerHTML = '<i class="fas fa-times-circle"></i>';
                if (resultTitle) resultTitle.textContent = 'Likely FAKE News';
            } else {
                resultIcon.innerHTML = '<i class="fas fa-question-circle"></i>';
                if (resultTitle) resultTitle.textContent = 'Uncertain - Needs Verification';
            }
        } else {
            console.warn('resultIcon element not found!'); // Debugging
        }
        
        // Set confidence score
        if (confidenceScore) confidenceScore.textContent = `Confidence: ${Math.round(confidence * 100)}%`;
        else console.warn('confidenceScore element not found!'); // Debugging

        // Display the actual AI-generated analysis text
        if (analysisContent) {
            analysisContent.innerText = aiAnalysisText;
            console.log('AI analysis text displayed.'); // Debugging
        } else {
            console.warn('analysisContent element not found!'); // Debugging
        }
    }

    // --- Initializations ---

    // Set initial active page (Home)
    showPage('home-page');
    // Removed initial active tab setting as there's only one input type now
    // switchTab('url'); 

    // Intersection Observer for scroll animations
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animated');
                // Only unobserve sections that have animations we only want to play once
                if (entry.target.classList.contains('fade-in') || entry.target.classList.contains('slide-up')) {
                    observer.unobserve(entry.target);
                }
            }
        });
    }, {
        threshold: 0.1, // Trigger when 10% of element is visible
        rootMargin: '0px 0px -50px 0px' // Adjust margin for earlier/later trigger
    });

    // Observe all sections, main-card, and footer for animations
    document.querySelectorAll('section, .main-card, .footer, .input-area, .status-box').forEach(el => {
        observer.observe(el);
    });

    // Initial check for elements already in view on load
    document.querySelectorAll('section, .main-card, .footer, .input-area, .status-box').forEach(el => {
        if (el.getBoundingClientRect().top < window.innerHeight) {
            el.classList.add('animated');
        }
    });
});
