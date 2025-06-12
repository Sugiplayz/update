console.log('script.js loaded and executing'); // Added for debugging

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded fired'); // Added for debugging

    // DOM Elements for Detector
    const newsUrlInput = document.getElementById('newsUrl'); // Correctly references URL input
    const newsTextInput = document.getElementById('newsText'); // Correctly references Text input
    const analyzeButton = document.getElementById('analyzeButton');
    const loadingDiv = document.getElementById('loading');
    const resultDiv = document.getElementById('result');
    const analysisContent = document.getElementById('analysisContent');
    const errorDiv = document.getElementById('error');
    const errorMessage = document.getElementById('errorMessage');

    // DOM Elements for Navigation
    const navLinks = document.querySelectorAll('.nav-link');
    const pages = document.querySelectorAll('.page');
    let currentActivePageId = 'home-page'; // Track currently active page

    // DOM Elements for Input Tabs
    const inputTabs = document.querySelectorAll('.tab');
    const urlSection = document.getElementById('url-section');
    const textSection = document.getElementById('text-section');
    let currentTab = 'url'; // Tracks active input tab (URL or Text)

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

        currentActivePageId = pageId; // Update tracking
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

    // --- Input Tab Logic ---

    function switchTab(tabType) {
        console.log('Attempting to switch tab to:', tabType); // Debugging

        // Update tab appearance
        inputTabs.forEach(t => t.classList.remove('active'));
        const activeTabElement = document.querySelector(`.tab[data-tab="${tabType}"]`);
        if (activeTabElement) {
            activeTabElement.classList.add('active');
            console.log(`Tab '${tabType}' activated.`); // Debugging
        } else {
            console.warn(`Tab element for '${tabType}' not found!`); // Debugging
        }

        // Show/hide sections
        setVisibility(urlSection, false);
        setVisibility(textSection, false);

        if (tabType === 'url') {
            setVisibility(urlSection, true);
        } else {
            setVisibility(textSection, true);
        }

        currentTab = tabType;
        hideAllStatusDisplays(); // Clear status messages when switching tabs
    }

    // Add click listeners to input tabs
    inputTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            console.log('Input tab clicked. Data-tab:', tab.dataset.tab); // Debugging
            switchTab(tab.dataset.tab);
        });
    });

    // --- Analysis Logic ---

    analyzeButton.addEventListener('click', async () => {
        console.log('Analyze button clicked.'); // Debugging
        let content = '';
        let contentType = ''; // 'url' or 'text'

        if (currentTab === 'url') {
            content = newsUrlInput.value.trim();
            contentType = 'url';
            if (!content) {
                setVisibility(errorDiv, true);
                errorMessage.innerText = 'Please enter a valid URL to analyze.';
                console.log('URL input empty.'); // Debugging
                return;
            }
        } else { // currentTab === 'text'
            content = newsTextInput.value.trim();
            contentType = 'text';
            if (!content) {
                setVisibility(errorDiv, true);
                errorMessage.innerText = 'Please enter some news text to analyze.';
                console.log('Text input empty.'); // Debugging
                return;
            }
        }

        // Hide previous results/errors
        hideAllStatusDisplays();
        setVisibility(loadingDiv, true); // Show loading indicator
        analyzeButton.disabled = true; // Disable button during analysis
        console.log('Starting analysis for:', contentType, 'content.'); // Debugging

        try {
            // Call the Netlify Function (your actual API call)
            const response = await fetch('/.netlify/functions/analyze-news', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ news: content, type: contentType }), // Pass type if your function needs it
            });
            console.log('Fetch response received:', response.status); // Debugging

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
        let confidence = Math.random(); // Random confidence for mock
        if (aiAnalysisText.toLowerCase().includes('likely genuine') || aiAnalysisText.toLowerCase().includes('likely real')) {
            verdict = 'real';
            confidence = 0.8 + Math.random() * 0.2; // Higher confidence
        } else if (aiAnalysisText.toLowerCase().includes('likely fake') || aiAnalysisText.toLowerCase().includes('misinformation')) {
            verdict = 'fake';
            confidence = 0.8 + Math.random() * 0.2; // Higher confidence
        }
        console.log('Inferred verdict:', verdict, 'Confidence:', confidence); // Debugging

        // Mock detailed analysis points (since AI returns freeform text)
        const mockDetails = {
            sourceCredibility: ['High', 'Medium', 'Low'][Math.floor(Math.random() * 3)],
            factVerification: ['Verified', 'Partial', 'Disputed'][Math.floor(Math.random() * 3)],
            biasDetection: ['Minimal', 'Moderate', 'High'][Math.floor(Math.random() * 3)],
            crossReference: `${Math.floor(Math.random() * (95 - 20) + 20)}%`
        };
        console.log('Mock details:', mockDetails); // Debugging

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

        // Set analysis details (using mock details for now)
        if (document.getElementById('sourceCredibility')) document.getElementById('sourceCredibility').textContent = mockDetails.sourceCredibility; else console.warn('sourceCredibility element not found!'); // Debugging
        if (document.getElementById('factVerification')) document.getElementById('factVerification').textContent = mockDetails.factVerification; else console.warn('factVerification element not found!'); // Debugging
        if (document.getElementById('biasDetection')) document.getElementById('biasDetection').textContent = mockDetails.biasDetection; else console.warn('biasDetection element not found!'); // Debugging
        if (document.getElementById('crossReference')) document.getElementById('crossReference').textContent = mockDetails.crossReference; else console.warn('crossReference element not found!'); // Debugging

        // Display the actual AI-generated analysis text
        if (analysisContent) analysisContent.innerText = aiAnalysisText;
        else console.warn('analysisContent element not found!'); // Debugging

        // Generate mock sources (from Final Prototype 1.html)
        const sources = [
            'Reuters', 'Associated Press', 'BBC News', 'CNN', 'NPR',
            'The Guardian', 'Wall Street Journal', 'New York Times',
            'Snopes', 'FactCheck.org', 'PolitiFact', 'Washington Post'
        ];
        const sourcesGrid = document.getElementById('sourcesGrid');
        if (sourcesGrid) {
            sourcesGrid.innerHTML = '';
            const numSources = 6 + Math.floor(Math.random() * 3); // Show random 6-8 sources
            const shuffled = sources.sort(() => 0.5 - Math.random());
            for (let i = 0; i < numSources; i++) {
                const sourceDiv = document.createElement('div');
                sourceDiv.className = 'source-item';
                sourceDiv.textContent = shuffled[i];
                sourcesGrid.appendChild(sourceDiv);
            }
            console.log('Mock sources generated.'); // Debugging
        } else {
            console.warn('sourcesGrid element not found!'); // Debugging
        }
    }

    // --- Initializations ---

    // Set initial active page (Home)
    showPage('home-page');
    // Set initial active tab (URL)
    switchTab('url');

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
