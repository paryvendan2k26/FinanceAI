// services/search.js - Converted from your Python search_service.py

const cheerio = require('cheerio');

class SearchService {
    constructor() {
        // Initialize Tavily client with proper error handling
        try {
            // Try different import patterns for Tavily
            let TavilyClient;
            try {
                // Pattern 1: Default export
                TavilyClient = require('tavily').TavilySearchClient;
            } catch (e1) {
                try {
                    // Pattern 2: Named export
                    const tavily = require('tavily');
                    TavilyClient = tavily.TavilySearchClient || tavily.default || tavily;
                } catch (e2) {
                    // Pattern 3: Direct require
                    TavilyClient = require('tavily');
                }
            }
            
            this.tavilyClient = new TavilyClient(process.env.TAVILY_API_KEY);
        } catch (error) {
            console.error('Failed to initialize Tavily client:', error.message);
            console.log('💡 Trying alternative Tavily initialization...');
            
            // Fallback: try direct API calls if package doesn't work
            this.tavilyClient = null;
        }
    }

    // Convert your Python web_search method to JavaScript
    async webSearch(query) {
        try {
            const results = [];
            
            // Try to use Tavily client
            if (this.tavilyClient) {
                // Call Tavily API (same as your Python version)
                const response = await this.tavilyClient.search(query, { max_results: 10 });
                const searchResults = response.results || [];

                // Process each result (same logic as Python)
                for (const result of searchResults) {
                    try {
                        // Fetch the webpage content
                        const content = await this.extractContent(result.url);
                        
                        results.push({
                            title: result.title || '',
                            url: result.url || '',
                            content: content || result.content || '' // Fallback to Tavily's content if extraction fails
                        });
                    } catch (error) {
                        // If content extraction fails, use Tavily's provided content
                        console.log(`Failed to extract content from ${result.url}:`, error.message);
                        results.push({
                            title: result.title || '',
                            url: result.url || '',
                            content: result.content || ''
                        });
                    }
                }
            } else {
                // Fallback: Use direct HTTP API call to Tavily
                console.log('Using Tavily HTTP API fallback...');
                const response = await fetch('https://api.tavily.com/search', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        api_key: process.env.TAVILY_API_KEY,
                        query: query,
                        max_results: 10
                    })
                });
                
                const data = await response.json();
                const searchResults = data.results || [];
                
                for (const result of searchResults) {
                    try {
                        const content = await this.extractContent(result.url);
                        results.push({
                            title: result.title || '',
                            url: result.url || '',
                            content: content || result.content || ''
                        });
                    } catch (error) {
                        results.push({
                            title: result.title || '',
                            url: result.url || '',
                            content: result.content || ''
                        });
                    }
                }
            }

            return results;

        } catch (error) {
            console.error('Search service error:', error);
            throw new Error(`Search failed: ${error.message}`);
        }
    }

    // Extract content from URL (replaces your Python trafilatura)
    async extractContent(url) {
        try {
            // Fetch the webpage
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                },
                timeout: 10000 // 10 second timeout
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const html = await response.text();
            
            // Use Cheerio to extract clean text (similar to trafilatura)
            const $ = cheerio.load(html);
            
            // Remove unwanted elements
            $('script, style, nav, header, footer, aside, .advertisement, .ads').remove();
            
            // Get main content (try different selectors)
            let content = '';
            const contentSelectors = [
                'article', 
                '.content', 
                '.post-content', 
                '.entry-content',
                'main',
                '.main-content',
                'body'
            ];

            for (const selector of contentSelectors) {
                const element = $(selector);
                if (element.length && element.text().trim().length > content.length) {
                    content = element.text().trim();
                }
            }

            // If no specific content found, get body text
            if (!content) {
                content = $('body').text().trim();
            }

            // Clean up the text
            content = content
                .replace(/\s+/g, ' ')  // Replace multiple spaces with single space
                .replace(/\n+/g, '\n') // Replace multiple newlines with single newline
                .trim();

            // Limit content length (similar to your Python approach)
            if (content.length > 5000) {
                content = content.substring(0, 5000) + '...';
            }

            return content;

        } catch (error) {
            console.log(`Content extraction failed for ${url}:`, error.message);
            return null;
        }
    }
}

// Export the service (Node.js way)
module.exports = SearchService;