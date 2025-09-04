// server.js - Main server file (replaces your Python main.py)

require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Import our services (converted from your Python services)
const SearchService = require('./services/search');
const SortSourceService = require('./services/sorting');
const LLMService = require('./services/llm');
const StockAnalysisService = require('./services/stock');
const { basicRateLimit, aiApiRateLimit, uploadRateLimit } = require('./services/rateLimiter');
const cacheService = require('./services/cache');
const usageTracker = require('./services/usageTracker');
const aiProviders = require('./services/aiProviders');

// File processing libraries
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Initialize Socket.IO with CORS
const io = socketIo(server, {
    cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        methods: ["GET", "POST"]
    }
});

// Initialize services (same as your Python main.py)
const searchService = new SearchService();
const sortSourceService = new SortSourceService();
const llmService = new LLMService();
const stockAnalysisService = new StockAnalysisService();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Add rate limiting and tracking middleware
app.use(usageTracker.trackRequest.bind(usageTracker));
app.use('/api', basicRateLimit);

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage, limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB limit

// Create uploads directory if it doesn't exist
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

// ==================== REST API ENDPOINTS ====================

// Health check (replaces your Python hello_world)
app.get('/', (req, res) => {
    res.json({ message: 'Hello world', status: 'Server running' });
});

// Regular chat endpoint with caching
app.post('/chat', aiApiRateLimit, async (req, res) => {
    try {
        const { query } = req.body;
        
        if (!query) {
            return res.status(400).json({ error: 'Query is required' });
        }

        // Check cache first
        const cacheKey = cacheService.generateKey(query);
        const cached = await cacheService.get(cacheKey);
        
        if (cached) {
            console.log('Cache hit for query:', query);
            usageTracker.trackCacheHit();
            return res.json({
                ...cached.data,
                cached: true,
                cache_age: Math.floor((Date.now() - cached.timestamp) / 1000)
            });
        }

        usageTracker.trackCacheMiss();
        console.log('Searching web for:', query);
        const searchResults = await searchService.webSearch(query);
        
        console.log('Sorting sources...');
        const sortedResults = await sortSourceService.sortSources(query, searchResults);
        
        console.log('Generating LLM response...');
        const response = await aiProviders.makeRequest(
            `Context: ${sortedResults.map(r => r.content).join('\n\n')}\n\nQuery: ${query}\n\nProvide a comprehensive response.`
        );

        const result = {
            status: 'success',
            query: query,
            sources: sortedResults.slice(0, 5),
            response: response.text,
            provider: response.provider
        };

        // Cache the result
        await cacheService.set(cacheKey, result, 1800); // 30 minutes

        res.json(result);

    } catch (error) {
        console.error('Chat endpoint error:', error);
        usageTracker.trackError();
        res.status(500).json({ error: 'Internal server error', message: error.message });
    }
});

// Stock analysis endpoint with caching
app.post('/stock-analysis', aiApiRateLimit, async (req, res) => {
    try {
        const { stock_name, time_horizon = "medium-term", detailed = false } = req.body;
        
        if (!stock_name) {
            return res.status(400).json({ error: 'Stock name is required' });
        }

        // Check cache first
        const cacheKey = cacheService.generateKey(`stock-${stock_name}-${time_horizon}`);
        const cached = await cacheService.get(cacheKey);
        
        if (cached) {
            console.log('Cache hit for stock:', stock_name);
            usageTracker.trackCacheHit();
            return res.json({
                ...cached.data,
                cached: true,
                cache_age: Math.floor((Date.now() - cached.timestamp) / 1000)
            });
        }

        usageTracker.trackCacheMiss();
        const searchQuery = `${stock_name} stock financial analysis investor information`;
        console.log('Searching for stock:', searchQuery);
        
        const searchResults = await searchService.webSearch(searchQuery);
        const sortedResults = await sortSourceService.sortSources(searchQuery, searchResults);

        // Use AI provider manager instead of direct service
        const responseChunks = [];
        for await (const chunk of stockAnalysisService.analyzeStockGenerateResponse(
            stock_name, sortedResults, time_horizon
        )) {
            responseChunks.push(chunk);
        }
        const completeResponse = responseChunks.join('');

        const metrics = await stockAnalysisService.extractKeyMetrics(sortedResults, stock_name);

        let recommendation = 'Neutral';
        const responseText = completeResponse.toLowerCase();
        if (responseText.includes('buy') && !responseText.includes('don\'t buy')) {
            recommendation = 'Buy';
        } else if (responseText.includes('hold')) {
            recommendation = 'Hold';
        } else if (responseText.includes('sell') && !responseText.includes('don\'t sell')) {
            recommendation = 'Sell';
        }

        const result = {
            status: 'success',
            stock_name: stock_name,
            time_horizon: time_horizon,
            sources: sortedResults.slice(0, 5),
            metrics: metrics,
            recommendation: recommendation,
            analysis: completeResponse,
            analysis_date: new Date().toISOString().split('T')[0]
        };

        // Cache for 1 hour (stock data changes frequently)
        await cacheService.set(cacheKey, result, 3600);

        res.json(result);

    } catch (error) {
        console.error('Stock analysis endpoint error:', error);
        usageTracker.trackError();
        res.status(500).json({ error: 'Stock analysis failed', message: error.message });
    }
});


// Stock analysis with document endpoint (replaces your Python /stock-analysis/with-document)
app.post('/stock-analysis/document', upload.single('document'), async (req, res) => {
    try {
        const { stock_name, time_horizon = "medium-term" } = req.body;
        const uploadedFile = req.file;

        if (!stock_name) {
            return res.status(400).json({ error: 'Stock name is required' });
        }

        let documentContent = null;
        
        // Process uploaded document if provided
        if (uploadedFile) {
            try {
                const filePath = uploadedFile.path;
                const fileExtension = path.extname(uploadedFile.originalname).toLowerCase();

                if (fileExtension === '.pdf') {
                    const pdfBuffer = fs.readFileSync(filePath);
                    const pdfData = await pdfParse(pdfBuffer);
                    documentContent = pdfData.text;
                } else if (fileExtension === '.docx') {
                    const docxBuffer = fs.readFileSync(filePath);
                    const result = await mammoth.extractRawText({ buffer: docxBuffer });
                    documentContent = result.value;
                } else {
                    // Treat as text file
                    documentContent = fs.readFileSync(filePath, 'utf8');
                }

                // Clean up uploaded file
                fs.unlinkSync(filePath);
            } catch (fileError) {
                console.error('File processing error:', fileError);
                return res.status(400).json({ error: 'File processing failed', message: fileError.message });
            }
        }

        // Perform stock analysis with document content
        const searchQuery = `${stock_name} stock analysis`;
        const searchResults = await searchService.webSearch(searchQuery);
        const sortedResults = await sortSourceService.sortSources(searchQuery, searchResults);

        // Collect complete response
        const responseChunks = [];
        for await (const chunk of stockAnalysisService.analyzeStockGenerateResponse(
            stock_name, sortedResults, time_horizon, documentContent
        )) {
            responseChunks.push(chunk);
        }

        res.json({
            status: 'success',
            stock_name: stock_name,
            time_horizon: time_horizon,
            document_included: uploadedFile ? true : false,
            sources: sortedResults.slice(0, 5),
            analysis: responseChunks.join('')
        });

    } catch (error) {
        console.error('Stock analysis with document error:', error);
        res.status(500).json({ error: 'Analysis failed', message: error.message });
    }
});

// ==================== WEBSOCKET HANDLERS ====================

// Chat WebSocket (replaces your Python /ws/chat)
io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Handle chat messages
    // Replace the existing 'chat' handler with this cached version
    socket.on('chat', async (data) => {
    try {
        const { query } = data;
        
        if (!query) {
            socket.emit('error', { message: 'Query is required' });
            return;
        }

        console.log(`Chat query from ${socket.id}:`, query);

        // Check cache first
        const cacheKey = cacheService.generateKey(query);
        const cached = await cacheService.get(cacheKey);
        
        if (cached) {
            console.log('WebSocket cache hit for:', query);
            usageTracker.trackCacheHit();
            
            // Send cached results
            socket.emit('search_result', cached.data.sources);
            
            // Stream cached response with slight delay to simulate real-time
            const words = cached.data.response.split(' ');
            for (let i = 0; i < words.length; i += 3) {
                const chunk = words.slice(i, i + 3).join(' ') + ' ';
                socket.emit('content', chunk);
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            
            socket.emit('done', { cached: true });
            return;
        }

        usageTracker.trackCacheMiss();

        // Original search and response logic
        const searchResults = await searchService.webSearch(query);
        const sortedResults = await sortSourceService.sortSources(query, searchResults);
        
        socket.emit('search_result', sortedResults.slice(0, 5));

        let fullResponse = '';
        for await (const chunk of llmService.generateResponse(query, sortedResults)) {
            fullResponse += chunk;
            socket.emit('content', chunk);
            await new Promise(resolve => setTimeout(resolve, 50));
        }
        
        // Cache the complete result
        await cacheService.set(cacheKey, {
            sources: sortedResults.slice(0, 5),
            response: fullResponse,
            query: query
        }, 1800);
        
        socket.emit('done');

    } catch (error) {
        console.error('Chat WebSocket error:', error);
        usageTracker.trackError();
        socket.emit('error', { message: error.message });
    }
});

    // Handle stock analysis (replaces your Python /ws/stock-analysis)
// In your WebSocket section, replace the existing 'stock-analysis' handler
// Replace your entire WebSocket section with this corrected version:

socket.on('stock-analysis', async (data) => {
    try {
        const { stock_name, time_horizon = "medium-term", detailed = false } = data;
        
        if (!stock_name) {
            socket.emit('error', { message: 'Stock name is required' });
            return;
        }

        // CHECK CACHE FIRST
        const cacheKey = cacheService.generateKey(`stock-${stock_name}-${time_horizon}`);
        const cached = await cacheService.get(cacheKey);
        
        if (cached) {
            console.log(`Cache HIT for ${stock_name} - delivering instant results`);
            
            // Send cached results instantly
            socket.emit('search_result', cached.data.sources);
            socket.emit('processing', 'Loading cached analysis...');
            
            // Stream cached analysis with small delays to feel natural
            const analysis = cached.data.analysis;
            const chunks = analysis.match(/.{1,50}/g) || [analysis];
            
            for (const chunk of chunks) {
                socket.emit('content', chunk);
                await new Promise(resolve => setTimeout(resolve, 30));
            }
            
            socket.emit('metrics', cached.data.metrics);
            socket.emit('done', { cached: true, cache_age: Math.floor((Date.now() - cached.timestamp) / 1000) });
            return;
        }

        console.log(`Cache MISS for ${stock_name} - generating new analysis`);

        // Original logic (only runs on cache miss)
        const searchQuery = `${stock_name} stock financial analysis investor information`;
        const searchResults = await searchService.webSearch(searchQuery);
        const sortedResults = await sortSourceService.sortSources(searchQuery, searchResults);

        socket.emit('search_result', sortedResults.slice(0, 5));
        socket.emit('processing', 'Analyzing stock data...');

        const metricsPromise = stockAnalysisService.extractKeyMetrics(sortedResults, stock_name);

        let fullAnalysis = '';
        for await (const chunk of stockAnalysisService.analyzeStockGenerateResponse(
            stock_name, sortedResults, time_horizon
        )) {
            fullAnalysis += chunk;
            socket.emit('content', chunk);
            await new Promise(resolve => setTimeout(resolve, 50));
        }

        try {
            const metrics = await Promise.race([
                metricsPromise,
                new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 20000))
            ]);
            socket.emit('metrics', metrics);
            
            // CACHE THE RESULTS
            await cacheService.set(cacheKey, {
                sources: sortedResults.slice(0, 5),
                analysis: fullAnalysis,
                metrics: metrics,
                stock_name: stock_name,
                time_horizon: time_horizon
            }, 3600);
            
        } catch (error) {
            const fallbackMetrics = {
                "PE Ratio": "N/A",
                "EPS": "N/A", 
                "Revenue": "N/A",
                "Market Cap": "N/A",
                "_note": "Metrics extraction timed out"
            };
            socket.emit('metrics', fallbackMetrics);
        }

        socket.emit('done');

    } catch (error) {
        console.error('Stock analysis WebSocket error:', error);
        socket.emit('error', { message: error.message });
    }
}); // <- This closes the stock-analysis handler

// SEPARATE handler for chat (NOT nested inside)
socket.on('chat_about_analysis', async (data) => {
    try {
        const { message, stock_name, analysis_context } = data;
        
        if (!message || !stock_name || !analysis_context) {
            socket.emit('error', { message: 'Missing required chat data' });
            return;
        }

        const stockService = new StockAnalysisService();
        
        let fullResponse = '';
        
        for await (const chunk of stockService.generateChatResponse(message, stock_name, analysis_context)) {
            fullResponse += chunk;
        }
        
        socket.emit('chat_response', fullResponse);
        
    } catch (error) {
        console.error('Chat handler error:', error);
        socket.emit('error', { message: 'Failed to process chat message' });
    }
});
});

// ==================== SERVER STARTUP ====================

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📱 WebSocket available at ws://localhost:${PORT}`);
    console.log(`🌐 REST API available at http://localhost:${PORT}`);
    console.log('📊 Services initialized:');
    console.log('  ✅ Search Service (Tavily)');
    console.log('  ✅ Sort Source Service (TensorFlow.js)');
    console.log('  ✅ LLM Service (Gemini)');
    console.log('  ✅ Stock Analysis Service');
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});