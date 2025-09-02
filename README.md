# AI-Powered Financial Analysis Platform

## 📌 Problem Statement
Investors often struggle with analyzing scattered financial data, delayed insights, and lack of real-time intelligent assistance. Manual methods are highly error-prone — with studies showing up to **88% of spreadsheets** used in financial analysis containing material mistakes.

## 💡 Solution & Uniqueness
We built a **real-time AI-powered system** that:
- Extracts, filters, and analyzes financial content from multiple sources using **semantic relevance scoring ($>$30%)**
- Streams responses from **Google Gemini** in real time with **progressive updates**
- Enables an **interactive chat feature after analysis** for deeper insights
- Ensures a smooth user experience with **progressive loading** and **graceful error handling**

This makes it faster, context-rich, and more reliable than traditional financial websites.

## ⚙️ Tech Stack
- **Backend:** Node.js, Express.js  
- **Frontend:** Next.js 14, React, Tailwind CSS  
- **Real-time:** WebSockets (Socket.IO)  
- **AI Models:** Google Gemini (Pro & Flash), TensorFlow.js for embeddings  
- **Search:** Tavily API for multi-source content retrieval  
- **File Handling:** pdf-parse, mammoth, cheerio (with secure 10MB limit and auto-cleanup)  

## 📊 Key Metrics
- **5K+ characters** processed per source in parallel  
- **Fast response delivery** with WebSockets streaming  
- **$>$30% relevance threshold** for source filtering  
- **Secure file handling** with strict validation and cleanup  

## 🔐 Security Considerations
- File type validation (PDF, DOCX, TXT only)  
- Environment variable protection for API keys  
- Input sanitization and CORS configuration  
- Rate limiting on external API calls  
- No persistent storage of user queries or sensitive data  

## 🚀 Features
- Real-time stock and financial data analysis  
- Progressive UI updates with source citations  
- Post-analysis **interactive chat with AI**  
- Robust error handling and fallback models  

## 🛠️ Installation

```bash
# Clone the repository
git clone https://github.com/paryvendan2k26/Financial-Analysis.git

# Navigate to the project folder
cd Financial-Analysis

# Install dependencies for backend
cd backend
npm install

# Install dependencies for frontend
cd ../frontend
npm install
▶️ Running the Project
bash
Copy code
# Start backend server
cd backend
npm run dev

# Start frontend app
cd ../frontend
npm run dev
⚡ Environment Variables
Create a .env file in the backend folder with the following keys:

env
Copy code
GEMINI_API_KEY=your_api_key_here
TAVILY_API_KEY=your_api_key_here
PORT=5000
