// services/llm.js - Converted from your Python llm_service.py

const { GoogleGenerativeAI } = require('@google/generative-ai');

class LLMService {
    constructor() {
        // Initialize Gemini (same as your Python version)
        this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        this.model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    }

    // Convert your Python generate_response method to JavaScript
    // This returns an async generator (similar to your Python yield)
    async* generateResponse(query, searchResults) {
        try {
            // Build context text (exact same logic as your Python version)
            const contextText = searchResults.map((result, index) => {
                return `Source ${index + 1} ${result.url}:\n${result.content}`;
            }).join('\n\n');

            // Build the full prompt (exact same as your Python version)
            const fullPrompt = `
Context from web search:
${contextText}

Query: ${query}

Please provide a comprehensive, detailed, well-cited accurate response using the above context. Think and reason deeply. Ensure it answers the query the user is asking. Do not use your knowledge until it is absolutely necessary.
            `.trim();

            // Generate response with streaming (same as your Python version)
            const result = await this.model.generateContentStream(fullPrompt);

            // Stream the response chunks (equivalent to your Python yield)
            for await (const chunk of result.stream) {
                const chunkText = chunk.text();
                if (chunkText) {
                    yield chunkText;
                }
            }

        } catch (error) {
            console.error('LLM Service error:', error);
            yield `Error generating response: ${error.message}`;
        }
    }

    // Non-streaming version for regular REST API calls
    async generateResponseComplete(query, searchResults) {
        try {
            // Build context text (same logic)
            const contextText = searchResults.map((result, index) => {
                return `Source ${index + 1} ${result.url}:\n${result.content}`;
            }).join('\n\n');

            // Build the full prompt
            const fullPrompt = `
Context from web search:
${contextText}

Query: ${query}

Please provide a comprehensive, detailed, well-cited accurate response using the above context. Think and reason deeply. Ensure it answers the query the user is asking. Do not use your knowledge until it is absolutely necessary.
            `.trim();

            // Generate complete response
            const result = await this.model.generateContent(fullPrompt);
            return result.response.text();

        } catch (error) {
            console.error('LLM Service error:', error);
            return `Error generating response: ${error.message}`;
        }
    }
}

// Export the service
module.exports = LLMService;