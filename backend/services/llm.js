// services/llm.js - Enhanced with AI provider fallback
const { GoogleGenerativeAI } = require('@google/generative-ai');
const aiProviders = require('./aiProviders');

class LLMService {
    constructor() {
        // Keep original Gemini for backward compatibility
        this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        this.model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    }

    async* generateResponse(query, searchResults) {
        try {
            const contextText = searchResults.map((result, index) => {
                return `Source ${index + 1} ${result.url}:\n${result.content}`;
            }).join('\n\n');

            const fullPrompt = `
Context from web search:
${contextText}

Query: ${query}

Please provide a comprehensive, detailed, well-cited accurate response using the above context. Think and reason deeply. Ensure it answers the query the user is asking. Do not use your knowledge until it is absolutely necessary.
            `.trim();

            // Try AI provider manager first, fallback to direct Gemini
            try {
                const response = await aiProviders.makeRequest(fullPrompt, { streaming: true });
                if (response.stream) {
                    for await (const chunk of response.stream) {
                        yield chunk;
                    }
                } else {
                    yield response.text;
                }
            } catch (providerError) {
                console.log('AI provider failed, using direct Gemini:', providerError.message);
                
                // Fallback to original method
                const result = await this.model.generateContentStream(fullPrompt);
                for await (const chunk of result.stream) {
                    const chunkText = chunk.text();
                    if (chunkText) {
                        yield chunkText;
                    }
                }
            }

        } catch (error) {
            console.error('LLM Service error:', error);
            yield `Error generating response: ${error.message}`;
        }
    }

    async generateResponseComplete(query, searchResults) {
        try {
            const contextText = searchResults.map((result, index) => {
                return `Source ${index + 1} ${result.url}:\n${result.content}`;
            }).join('\n\n');

            const fullPrompt = `
Context from web search:
${contextText}

Query: ${query}

Please provide a comprehensive, detailed, well-cited accurate response using the above context. Think and reason deeply. Ensure it answers the query the user is asking. Do not use your knowledge until it is absolutely necessary.
            `.trim();

            // Try AI provider manager first
            try {
                const response = await aiProviders.makeRequest(fullPrompt);
                return response.text;
            } catch (providerError) {
                console.log('AI provider failed, using direct Gemini:', providerError.message);
                
                // Fallback to original method
                const result = await this.model.generateContent(fullPrompt);
                return result.response.text();
            }

        } catch (error) {
            console.error('LLM Service error:', error);
            return `Error generating response: ${error.message}`;
        }
    }
}

module.exports = LLMService;