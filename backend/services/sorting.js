// services/sorting.js - Converted from your Python sort_source_service.py

const tf = require('@tensorflow/tfjs-node');

class SortSourceService {
    constructor() {
        this.model = null;
        this.modelLoaded = false;
    }

    // Load the Universal Sentence Encoder model (replaces your SentenceTransformers)
    async loadModel() {
        if (!this.modelLoaded) {
            try {
                console.log('Loading Universal Sentence Encoder...');
                // Using TensorFlow.js Universal Sentence Encoder instead of SentenceTransformers
                this.model = await tf.loadLayersModel('https://tfhub.dev/google/universal-sentence-encoder/4', {
                    fromTFHub: true
                });
                this.modelLoaded = true;
                console.log('Model loaded successfully!');
            } catch (error) {
                console.error('Failed to load embedding model:', error);
                // Fallback: we'll use a simple keyword-based similarity
                this.modelLoaded = false;
            }
        }
    }

    // Convert your Python sort_sources method to JavaScript
    async sortSources(query, searchResults) {
        try {
            // Ensure model is loaded
            await this.loadModel();

            const relevantDocs = [];

            if (this.modelLoaded && this.model) {
                // Use TensorFlow.js embeddings (similar to your SentenceTransformers approach)
                const queryEmbedding = await this.getEmbedding(query);

                for (const result of searchResults) {
                    const content = result.content;
                    
                    if (!content || content.trim().length === 0) {
                        console.log('Skipping result due to missing or empty content');
                        continue;
                    }

                    try {
                        // Get embedding for the content
                        const resultEmbedding = await this.getEmbedding(content);
                        
                        // Calculate cosine similarity (same formula as your Python version)
                        const similarity = this.calculateCosineSimilarity(queryEmbedding, resultEmbedding);
                        
                        result.relevance_score = similarity;

                        // Same threshold as your Python version
                        if (similarity > 0.3) {
                            relevantDocs.push(result);
                        }
                    } catch (error) {
                        console.log('Failed to process result:', error.message);
                        // Skip this result if embedding fails
                        continue;
                    }
                }
            } else {
                // Fallback: Simple keyword-based similarity if TensorFlow model fails
                console.log('Using fallback keyword-based similarity');
                return this.fallbackSorting(query, searchResults);
            }

            // Sort by relevance score (highest first) - same as your Python version
            return relevantDocs.sort((a, b) => b.relevance_score - a.relevance_score);

        } catch (error) {
            console.error('Sorting service error:', error);
            // Return original results if sorting fails
            return searchResults.map(result => ({ ...result, relevance_score: 0.5 }));
        }
    }

    // Get embeddings using TensorFlow.js (replaces your SentenceTransformers encode)
    async getEmbedding(text) {
        try {
            // Truncate text if too long (model has limits)
            const truncatedText = text.length > 1000 ? text.substring(0, 1000) : text;
            
            // Convert text to tensor and get embeddings
            const embeddings = await this.model.predict(tf.tensor([truncatedText]));
            const embeddingArray = await embeddings.data();
            
            // Clean up tensors to prevent memory leaks
            embeddings.dispose();
            
            return Array.from(embeddingArray);
        } catch (error) {
            console.error('Embedding generation failed:', error);
            throw error;
        }
    }

    // Calculate cosine similarity (exact same formula as your Python version)
    calculateCosineSimilarity(embedding1, embedding2) {
        // Calculate dot product
        let dotProduct = 0;
        for (let i = 0; i < embedding1.length; i++) {
            dotProduct += embedding1[i] * embedding2[i];
        }

        // Calculate magnitudes
        let magnitude1 = 0;
        let magnitude2 = 0;
        for (let i = 0; i < embedding1.length; i++) {
            magnitude1 += embedding1[i] * embedding1[i];
            magnitude2 += embedding2[i] * embedding2[i];
        }
        magnitude1 = Math.sqrt(magnitude1);
        magnitude2 = Math.sqrt(magnitude2);

        // Calculate cosine similarity: (q·r)/(|q||r|) - same as your Python formula
        if (magnitude1 === 0 || magnitude2 === 0) {
            return 0;
        }
        
        return dotProduct / (magnitude1 * magnitude2);
    }

    // Fallback sorting method if TensorFlow model fails to load
    fallbackSorting(query, searchResults) {
        const queryWords = query.toLowerCase().split(' ');
        
        const scoredResults = searchResults.map(result => {
            const content = (result.content || '').toLowerCase();
            const title = (result.title || '').toLowerCase();
            
            let score = 0;
            queryWords.forEach(word => {
                // Count occurrences in content and title
                const contentMatches = (content.match(new RegExp(word, 'g')) || []).length;
                const titleMatches = (title.match(new RegExp(word, 'g')) || []).length;
                
                // Title matches are weighted higher
                score += contentMatches * 0.1 + titleMatches * 0.3;
            });

            // Normalize score
            score = Math.min(score / queryWords.length, 1.0);
            
            result.relevance_score = score;
            return result;
        });

        // Filter and sort (same logic as main method)
        return scoredResults
            .filter(result => result.relevance_score > 0.1)
            .sort((a, b) => b.relevance_score - a.relevance_score);
    }
}

// Export the service
module.exports = SortSourceService;