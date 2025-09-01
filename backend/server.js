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

// Regular chat endpoint (replaces your Python /chat)
app.post('/chat', async (req, res) => {
    try {
        const { query } = req.body;
        
        if (!query) {
            return res.status(400).json({ error: 'Query is required' });
        }

        // Search the web and find appropriate sources (same logic as Python)
        console.log('Searching web for:', query);
        const searchResults = await searchService.webSearch(query);
        
        // Sort the sources (same logic as Python)  
        console.log('Sorting sources...');
        const sortedResults = await sortSourceService.sortSources(query, searchResults);
        
        // Generate response using LLM (same logic as Python)
        console.log('Generating LLM response...');
        const response = await llmService.generateResponseComplete(query, sortedResults);

        res.json({
            status: 'success',
            query: query,
            sources: sortedResults.slice(0, 5), // Top 5 sources
            response: response
        });

    } catch (error) {
        console.error('Chat endpoint error:', error);
        res.status(500).json({ error: 'Internal server error', message: error.message });
    }
});

// Stock analysis endpoint (replaces your Python /stock-analysis)
app.post('/stock-analysis', async (req, res) => {
    try {
        const { stock_name, time_horizon = "medium-term", detailed = false } = req.body;
        
        if (!stock_name) {
            return res.status(400).json({ error: 'Stock name is required' });
        }

        // Search for stock information (same as Python logic)
        const searchQuery = `${stock_name} stock financial analysis investor information`;
        console.log('Searching for stock:', searchQuery);
        
        const searchResults = await searchService.webSearch(searchQuery);
        const sortedResults = await sortSourceService.sortSources(searchQuery, searchResults);

        // Collect complete response for REST API
        const responseChunks = [];
        for await (const chunk of stockAnalysisService.analyzeStockGenerateResponse(
            stock_name, sortedResults, time_horizon
        )) {
            responseChunks.push(chunk);
        }
        const completeResponse = responseChunks.join('');

        // Extract metrics
        const metrics = await stockAnalysisService.extractKeyMetrics(sortedResults, stock_name);

        // Determine recommendation from response
        let recommendation = 'Neutral';
        const responseText = completeResponse.toLowerCase();
        if (responseText.includes('buy') && !responseText.includes('don\'t buy')) {
            recommendation = 'Buy';
        } else if (responseText.includes('hold')) {
            recommendation = 'Hold';
        } else if (responseText.includes('sell') && !responseText.includes('don\'t sell')) {
            recommendation = 'Sell';
        }

        res.json({
            status: 'success',
            stock_name: stock_name,
            time_horizon: time_horizon,
            sources: sortedResults.slice(0, 5),
            metrics: metrics,
            recommendation: recommendation,
            analysis: completeResponse,
            analysis_date: new Date().toISOString().split('T')[0]
        });

    } catch (error) {
        console.error('Stock analysis endpoint error:', error);
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
    socket.on('chat', async (data) => {
        try {
            const { query } = data;
            
            if (!query) {
                socket.emit('error', { message: 'Query is required' });
                return;
            }

            console.log(`Chat query from ${socket.id}:`, query);

            // Search and sort (same as Python logic)
            const searchResults = await searchService.webSearch(query);
            const sortedResults = await sortSourceService.sortSources(query, searchResults);
            
            // Send search results
            socket.emit('search_result', sortedResults.slice(0, 5));

            // Generate and stream response
            for await (const chunk of llmService.generateResponse(query, sortedResults)) {
                socket.emit('content', chunk);
                await new Promise(resolve => setTimeout(resolve, 50)); // Small delay
            }
            
            socket.emit('done');

        } catch (error) {
            console.error('Chat WebSocket error:', error);
            socket.emit('error', { message: error.message });
        }
    });

    // Handle stock analysis (replaces your Python /ws/stock-analysis)
    socket.on('stock-analysis', async (data) => {
        try {
            const { stock_name, time_horizon = "medium-term", detailed = false } = data;
            
            if (!stock_name) {
                socket.emit('error', { message: 'Stock name is required' });
                return;
            }

            console.log(`Stock analysis from ${socket.id}:`, stock_name);

            // Search for stock information
            const searchQuery = `${stock_name} stock financial analysis investor information`;
            const searchResults = await searchService.webSearch(searchQuery);
            const sortedResults = await sortSourceService.sortSources(searchQuery, searchResults);

            // Send search results
            socket.emit('search_result', sortedResults.slice(0, 5));
            socket.emit('processing', 'Analyzing stock data...');

            // Start metrics extraction in parallel
            const metricsPromise = stockAnalysisService.extractKeyMetrics(sortedResults, stock_name);

            // Stream analysis content
            for await (const chunk of stockAnalysisService.analyzeStockGenerateResponse(
                stock_name, sortedResults, time_horizon
            )) {
                socket.emit('content', chunk);
                await new Promise(resolve => setTimeout(resolve, 50)); // Small delay
            }

            // Send metrics (with timeout)
            try {
                const metrics = await Promise.race([
                    metricsPromise,
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 20000))
                ]);
                socket.emit('metrics', metrics);
            } catch (error) {
                socket.emit('metrics', {
                    "PE Ratio": "N/A",
                    "EPS": "N/A", 
                    "Revenue": "N/A",
                    "Market Cap": "N/A",
                    "_note": "Metrics extraction timed out"
                });
            }

            socket.emit('done');

        } catch (error) {
            console.error('Stock analysis WebSocket error:', error);
            socket.emit('error', { message: error.message });
        }
        // ADD THIS NEW HANDLER RIGHT HERE
socket.on('chat_about_analysis', async (data) => {
    try {
        const { message, stock_name, analysis_context } = data;
        
        if (!message || !stock_name || !analysis_context) {
            socket.emit('error', { message: 'Missing required chat data' });
            return;
        }

        // Use the same way you initialize StockAnalysisService in your existing handler
        const stockService = new StockAnalysisService();
        
        let fullResponse = '';
        
        // Stream the chat response
        for await (const chunk of stockService.generateChatResponse(message, stock_name, analysis_context)) {
            fullResponse += chunk;
        }
        
        // Send the complete response
        socket.emit('chat_response', fullResponse);
        
    } catch (error) {
        console.error('Chat handler error:', error);
        socket.emit('error', { message: 'Failed to process chat message' });
    }
});
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
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