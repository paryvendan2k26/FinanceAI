// test.js - Simple test to verify our services work

require('dotenv').config();
const SearchService = require('./services/search');
const LLMService = require('./services/llm');

async function testServices() {
    console.log('🧪 Testing Backend Services...\n');

    try {
        // Test Search Service
        console.log('1️⃣  Testing Search Service...');
        const searchService = new SearchService();
        const searchResults = await searchService.webSearch('Tesla stock news');
        console.log(`✅ Search Service: Found ${searchResults.length} results`);
        console.log(`   First result: ${searchResults[0]?.title || 'No title'}\n`);

        // Test LLM Service  
        console.log('2️⃣  Testing LLM Service...');
        const llmService = new LLMService();
        const response = await llmService.generateResponseComplete(
            'What is Tesla?', 
            searchResults.slice(0, 2)
        );
        console.log(`✅ LLM Service: Generated response (${response.length} characters)`);
        console.log(`   Preview: ${response.substring(0, 100)}...\n`);

        console.log('🎉 All services working correctly!');
        console.log('🚀 Ready to start the server with: npm start');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.log('📋 Check your .env file has the correct API keys:');
        console.log('   - TAVILY_API_KEY');
        console.log('   - GEMINI_API_KEY');
    }
}

// Run the test
testServices();