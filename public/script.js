document.addEventListener('DOMContentLoaded', () => {
    const inputText = document.getElementById('inputText');
    const lengthButtons = document.querySelectorAll('.length-btn');
    const analyzeBtn = document.getElementById('analyzeBtn');
    const summaryOutput = document.getElementById('summaryOutput');
    const keywordsOutput = document.getElementById('keywordsOutput');
    const loader = document.getElementById('loader');
    const outputContainer = document.getElementById('outputContainer');

    let selectedLength = 'short'; 

    lengthButtons.forEach(button => {
        button.addEventListener('click', () => {
            lengthButtons.forEach(btn => btn.classList.replace('bg-cyan-600', 'bg-gray-600'));
            button.classList.replace('bg-gray-600', 'bg-cyan-600');
            selectedLength = button.innerText.toLowerCase();
        });
    });

    analyzeBtn.addEventListener('click', async () => {
        const text = inputText.value;
        if (text.trim() === '') {
            alert('Please paste some text to analyze.');
            return;
        }

        loader.classList.remove('hidden');
        outputContainer.style.display = 'none';
        summaryOutput.innerText = '';
        keywordsOutput.innerHTML = '';
        
        try {

            const backendUrl = 'https://ai-content-summarizer-ry3g.onrender.com'; 
            
            const [summaryResponse, keywordsResponse] = await Promise.all([
                fetch(`${backendUrl}/api/summarize`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ textToSummarize: text, summaryLength: selectedLength })
                }),
                fetch(`${backendUrl}/api/keywords`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ textToAnalyze: text })
                })
            ]);

            const summaryData = await summaryResponse.json();
            const keywordsData = await keywordsResponse.json();

            summaryOutput.innerText = summaryData.summary || 'Could not generate summary.';
            
            if (keywordsData.keywords && keywordsData.keywords.length > 0) {
                keywordsData.keywords.forEach(keyword => {
                    const keywordPill = document.createElement('span');
                    keywordPill.className = 'bg-blue-500 text-white px-3 py-1 text-sm rounded-full';
                    keywordPill.innerText = keyword;
                    keywordsOutput.appendChild(keywordPill);
                });
            } else {
                keywordsOutput.innerText = 'No keywords found.';
            }

        } catch (error) {
            summaryOutput.innerText = 'An error occurred. Please try again.';
            console.error('Error:', error);
        } finally {

            loader.classList.add('hidden');
            outputContainer.style.display = 'block';
        }
    });
});