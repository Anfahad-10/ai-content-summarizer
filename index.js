require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const axios = require('axios');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

async function queryAI(data) {
    try {
        const response = await axios.post(
            "https://api-inference.huggingface.co/models/facebook/bart-large-cnn",
            data,
            { headers: { Authorization: `Bearer ${process.env.HUGGING_FACE_API_KEY}` } }
        );
        return response.data;
    } catch (error) {
        console.error("Error querying AI model:", error.response ? error.response.data : error.message);
        throw new Error("AI service is currently unavailable or failed to process the request.");
    }
}

async function queryKeywords(data) {
    try {
        const response = await axios.post(
            "https://api-inference.huggingface.co/models/dslim/bert-base-NER",
            data,
            { headers: { Authorization: `Bearer ${process.env.HUGGING_FACE_API_KEY}` } }
        );
        return response.data;
    } catch (error) {
        console.error("Error querying Keyword model:", error.response ? error.response.data : error.message);
        throw new Error("Keyword extraction service failed.");
    }
}

app.get('/', (req, res) => {
  res.send('AI Summarizer API is running!');
});

app.post('/api/summarize', async (req, res) => {
    try {
        const { textToSummarize, summaryLength } = req.body;

        // --- FIX #2: ADDED LENGTH VALIDATION ---
        // A simple way to estimate token count. 1 word is roughly 1.3 tokens.
        const estimatedTokens = textToSummarize.split(' ').length; // Simple word count is safer
        if (estimatedTokens > 800) { // Keep a safe margin below the 1024 limit
            // Sending a specific JSON structure that the frontend can handle
            return res.status(400).json({ 
                summary: `Article is too long (${estimatedTokens} words). Please provide text with less than 800 words for summarization.` 
            });
        }

        if (!textToSummarize || textToSummarize.trim() === '') {
            return res.status(400).json({ error: "Please provide 'textToSummarize' in the request body." });
        }

        let minLength, maxLength;
        switch (summaryLength) {
            case 'short': minLength = 20; maxLength = 50; break;
            case 'long': minLength = 100; maxLength = 150; break;
            case 'medium': default: minLength = 50; maxLength = 100; break;
        }

        console.log(`Sending text to AI for a '${summaryLength || 'medium'}' summary...`);

        const aiPayload = {
            "inputs": textToSummarize,
            "parameters": { "min_length": minLength, "max_length": maxLength }
        };

        const aiResponse = await queryAI(aiPayload);
        const summary = aiResponse[0]?.summary_text || "Sorry, could not generate a summary.";

        res.json({
            summary: summary,
            requested_length: summaryLength || 'medium'
        });

    } catch (error) {
        res.status(500).json({ summary: "An unexpected error occurred. Please try again." }); // Send error in summary field
    }
});

app.post('/api/keywords', async (req, res) => {
    try {
        const { textToAnalyze } = req.body;
        if (!textToAnalyze || textToAnalyze.trim() === '') {
            return res.status(400).json({ error: "Please provide 'textToAnalyze' in the request body." });
        }

        const aiResponse = await queryKeywords({ "inputs": textToAnalyze });

        const groupedWords = [];
        let currentWord = '';
        for (const entity of aiResponse) {
            const isConfidentKeyword = entity.score > 0.85 && ['PER', 'ORG', 'LOC', 'MISC'].includes(entity.entity_group);
            if (isConfidentKeyword) {
                if (entity.word.startsWith('##')) {
                    currentWord += entity.word.substring(2);
                } else {
                    if (currentWord.length > 0) groupedWords.push(currentWord);
                    currentWord = entity.word;
                }
            } else {
                if (currentWord.length > 0) groupedWords.push(currentWord);
                currentWord = '';
            }
        }
        if (currentWord.length > 0) groupedWords.push(currentWord);
        const uniqueKeywords = [...new Set(groupedWords)];

        res.json({ keywords: uniqueKeywords });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});