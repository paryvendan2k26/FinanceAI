// services/stock.js - Converted from your Python stock_analysis_service.py

const { GoogleGenerativeAI } = require('@google/generative-ai');

class StockAnalysisService {
    constructor() {
        // Initialize Gemini (same as your Python version)
        this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        this.model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        // Same sector mappings as your Python version
        this.sectorMappings = {
            "bank": ["banking", "financial services", "finance"],
            "fmcg": ["consumer goods", "retail", "food and beverage"],
            "telecom": ["telecommunications", "communication services"],
            "infrastructure": ["construction", "engineering", "real estate"],
            "automobile": ["automotive", "transportation"],
            "oil": ["energy", "oil and gas"],
            "pharma": ["healthcare", "pharmaceuticals", "medical"],
            "it": ["information technology", "software", "technology"]
        };

        // Same key metrics as your Python version
        this.keyMetrics = {
            financial: [
                "P/E Ratio", "EPS", "Revenue Growth", "Profit Margin",
                "ROE", "ROCE", "Debt-to-Equity", "Current Ratio",
                "Operating Cash Flow", "Dividend Yield"
            ],
            technical: [
                "RSI", "MACD", "Moving Averages", "Support/Resistance",
                "Volume Trends", "Price Patterns", "Bollinger Bands",
                "Stochastic Oscillator", "ADX", "Fibonacci Retracement"
            ],
            qualitative: [
                "Management Quality", "Competitive Position", "Industry Outlook",
                "Regulatory Environment", "Innovation Pipeline", "ESG Factors"
            ]
        };
    }

    // Convert your Python generate_response method
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

            const result = await this.model.generateContentStream(fullPrompt);

            for await (const chunk of result.stream) {
                const chunkText = chunk.text();
                if (chunkText) {
                    yield chunkText;
                }
            }
        } catch (error) {
            console.error('Stock response generation error:', error);
            yield `Error generating response: ${error.message}`;
        }
    }

    // Convert your Python extract_key_metrics method
    async extractKeyMetrics(searchResults, stockName) {
        try {
            const contextText = searchResults.slice(0, 5).map((result, index) => {
                const content = result.content.length > 1000 ? 
                    result.content.substring(0, 1000) + '...' : result.content;
                return `Source ${index + 1}:\n${content}`;
            }).join('\n\n');

            const metricsQuery = `
Context from web search:
${contextText}

Extract the following key metrics for ${stockName} from the search results.
If a metric is not available, use "N/A" as the value.

Return the following financial metrics (ONLY include metrics with actual values, skip those without data):
- PE Ratio: [value]
- EPS: [value]
- Revenue: [value]
- Market Cap: [value]
- Profit Margin: [value]
- Debt-to-Equity: [value]
- Current Ratio: [value]
- Dividend Yield: [value]

Format the output as a simple list with the metric name followed by its value. 
Do not attempt to create JSON directly.
            `.trim();

            const result = await this.model.generateContent(metricsQuery);
            const metricsText = result.response.text();

            // Parse metrics from text format (same logic as Python)
            const metricsDict = {};
            const lines = metricsText.trim().split('\n');
            
            for (const line of lines) {
                if (line.includes(':')) {
                    const [key, value] = line.split(':', 2);
                    metricsDict[key.trim()] = value.trim();
                }
            }

            // Add default values for missing metrics
            const defaultMetrics = [
                "PE Ratio", "EPS", "Revenue", "Market Cap",
                "Profit Margin", "Debt-to-Equity", "Current Ratio", "Dividend Yield"
            ];

            for (const metric of defaultMetrics) {
                if (!metricsDict[metric]) {
                    metricsDict[metric] = "N/A";
                }
            }

            return metricsDict;

        } catch (error) {
            console.error('Metrics extraction error:', error);
            // Return fallback metrics (same as Python)
            return {
                "PE Ratio": "N/A",
                "EPS": "N/A",
                "Revenue": "N/A",
                "Market Cap": "N/A",
                "Profit Margin": "N/A",
                "Debt-to-Equity": "N/A",
                "Current Ratio": "N/A",
                "Dividend Yield": "N/A",
                "_extraction_error": error.message
            };
        }
    }

    // Convert your Python analyze_stock_from_web_data method
    async analyzeStockFromWebData(stockName, searchResults, timeHorizon = "medium-term", documentContent = null) {
        try {
            // Format web search results (same logic as Python)
            const contextText = searchResults.slice(0, 5).map((result, index) => {
                const content = result.content.length > 2000 ? 
                    result.content.substring(0, 2000) + '...' : result.content;
                return `Source ${index + 1}:\n${content}`;
            }).join('\n\n');

            // Add document content if available (same logic as Python)
            let finalContextText = contextText;
            if (documentContent) {
                if (typeof documentContent === 'string') {
                    const truncatedDoc = documentContent.length > 3000 ? 
                        documentContent.substring(0, 3000) + '...' : documentContent;
                    finalContextText += `\n\nUploaded Document Content:\n${truncatedDoc}`;
                } else {
                    finalContextText += '\n\nUploaded Document Content:\n[Binary content omitted]';
                }
            }

            // Extract key metrics with timeout (same as Python logic)
            let metrics;
            try {
                const timeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Timeout')), 15000)
                );
                
                metrics = await Promise.race([
                    this.extractKeyMetrics(searchResults, stockName),
                    timeoutPromise
                ]);
            } catch (error) {
                // Fallback metrics if extraction times out
                metrics = {
                    "PE Ratio": "N/A",
                    "EPS": "N/A",
                    "Revenue": "N/A",
                    "Market Cap": "N/A",
                    "_extraction_note": "Metrics extraction timed out"
                };
            }

            // Simplified analysis query (same as Python)
            const analysisQuery = `
Context from web search:
${finalContextText}

Provide a concise analysis of ${stockName} for a ${timeHorizon} investment horizon.

Cover these key areas:
1. Company Overview
2. Financial Analysis
3. Technical Analysis
4. Risk Assessment
5. Investment Recommendation

Keep your analysis focused and evidence-based.
            `.trim();

            const analysisResult = await this.model.generateContent(analysisQuery);

            // Compile results (same structure as Python)
            return {
                metrics: metrics,
                analysis: analysisResult.response.text(),
                stock_name: stockName,
                time_horizon: timeHorizon,
                analysis_date: new Date().toISOString().split('T')[0] // Format as YYYY-MM-DD
            };

        } catch (error) {
            console.error('Stock analysis error:', error);
            throw new Error(`Stock analysis failed: ${error.message}`);
        }
    }

    // Convert your Python generate_recommendation method
    async generateRecommendation(analysisResults) {
        try {
            const recommendationQuery = `
Based on the following analysis of ${analysisResults.stock_name} for a ${analysisResults.time_horizon} investment horizon:

${analysisResults.analysis}

And these key metrics:
${JSON.stringify(analysisResults.metrics, null, 2)}

Provide a clear, concise investment recommendation that includes:

1. Recommendation: Buy/Hold/Sell with confidence level (High/Medium/Low)
2. Target Price: If available, or a price range
3. Key Reasons: 3-5 bullet points supporting the recommendation
4. Risk Factors: 2-3 key risks to be aware of
5. Ideal Investor Profile: Who this investment is best suited for
6. Time Horizon: Expected holding period for best results

Your recommendation should be data-driven, balanced, and clearly justified.
            `.trim();

            const result = await this.model.generateContent(recommendationQuery);
            return result.response.text();

        } catch (error) {
            console.error('Recommendation generation error:', error);
            return `Error generating recommendation: ${error.message}`;
        }
    }

    // Convert your Python analyze_stock_generate_response method (streaming version)
    async* analyzeStockGenerateResponse(stockName, searchResults, timeHorizon = "medium-term", documentContent = null) {
        try {
            // Get analysis results
            const analysisResults = await this.analyzeStockFromWebData(
                stockName, searchResults, timeHorizon, documentContent
            );

            // Generate recommendation
            const recommendation = await this.generateRecommendation(analysisResults);

            // Format context for comprehensive summary
            const contextText = searchResults.map((result, index) => {
                return `Source ${index + 1}:\n${result.content}`;
            }).join('\n\n');

            // Build comprehensive summary query (same as Python)
            const summaryQuery = `
Context from web search:
${contextText}

Analysis results for ${stockName} with a ${timeHorizon} investment horizon:

${analysisResults.analysis}

Recommendation:
${recommendation}

Please synthesize this information into a comprehensive, well-structured investment report that includes:

1. Executive Summary (brief overview with clear recommendation)
2. Company Background
3. Financial Analysis (key metrics and trends)
4. Technical Analysis (current price action and indicators)
5. Sector Context (industry position and outlook)
6. Risk Assessment
7. Growth Catalysts
8. Valuation Analysis
9. Investment Recommendation (detailed with supporting evidence)
10. Conclusion

The report should be detailed yet accessible, with clear section headings and bullet points where appropriate.
Ensure all claims are supported by data from the search results.
End with a clear, actionable recommendation that specifies:
- Buy/Hold/Sell recommendation
- Target price or range (if available)
- Suitable investment horizon
- Investor suitability
            `.trim();

            // Generate and stream the final response
            const result = await this.model.generateContentStream(summaryQuery);

            for await (const chunk of result.stream) {
                const chunkText = chunk.text();
                if (chunkText) {
                    yield chunkText;
                }
            }

        } catch (error) {
            console.error('Stock analysis streaming error:', error);
            yield `Error in stock analysis: ${error.message}`;
        }
    }
    // Add this method to your StockAnalysisService class
async* generateChatResponse(message, stockName, analysisContext) {
    try {
        const chatQuery = `
Previous Stock Analysis for ${stockName}:
${analysisContext}

User Question: ${message}

Based on the stock analysis above, please provide a helpful, specific answer to the user's question about ${stockName}. 

Guidelines:
- Keep your response conversational and helpful
- Reference specific points from the analysis when relevant  
- If the question asks for advice beyond the analysis scope, provide general investment guidance
- Be honest if the analysis doesn't contain enough information to fully answer the question
- Keep responses focused and under 200 words unless more detail is specifically requested

Provide a direct, helpful response:
        `.trim();

        const result = await this.model.generateContentStream(chatQuery);

        for await (const chunk of result.stream) {
            const chunkText = chunk.text();
            if (chunkText) {
                yield chunkText;
            }
        }

    } catch (error) {
        console.error('Chat response generation error:', error);
        yield `I apologize, but I'm having trouble processing your question right now. Please try asking again.`;
    }
}
}

// Export the service
module.exports = StockAnalysisService;