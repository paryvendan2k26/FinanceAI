const axios = require('axios');

class AIProviderManager {
  constructor() {
    this.providers = {
      gemini: {
        name: 'gemini',
        endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent',
        key: process.env.GEMINI_API_KEY,
        dailyLimit: 50,
        cost: 0,
        priority: 1,
        currentUsage: 0
      },
      openai: {
        name: 'openai',
        endpoint: 'https://api.openai.com/v1/chat/completions',
        key: process.env.OPENAI_API_KEY,
        dailyLimit: 100, // Adjust based on your plan
        cost: 0.002, // per 1K tokens
        priority: 2,
        currentUsage: 0
      }
    };
  }

  async makeRequest(prompt, options = {}) {
    const provider = this.selectProvider(options.complexity || 0.5);
    
    try {
      let response;
      
      if (provider.name === 'gemini') {
        response = await this.callGemini(prompt, provider);
      } else if (provider.name === 'openai') {
        response = await this.callOpenAI(prompt, provider);
      }
      
      this.providers[provider.name].currentUsage++;
      return response;
      
    } catch (error) {
      console.error(`${provider.name} API error:`, error);
      
      // Try fallback provider
      const fallback = this.getFallbackProvider(provider.name);
      if (fallback) {
        return this.makeRequest(prompt, { ...options, excludeProvider: provider.name });
      }
      
      throw error;
    }
  }

  selectProvider(complexity = 0.5) {
    // Simple complexity-based selection
    if (complexity < 0.3 && this.canUseProvider('gemini')) {
      return this.providers.gemini;
    }
    
    if (this.canUseProvider('gemini')) {
      return this.providers.gemini;
    }
    
    if (this.canUseProvider('openai')) {
      return this.providers.openai;
    }
    
    throw new Error('No AI providers available');
  }

  canUseProvider(providerName) {
    const provider = this.providers[providerName];
    return provider && provider.key && provider.currentUsage < provider.dailyLimit;
  }

  getFallbackProvider(excludeProvider) {
    return Object.values(this.providers)
      .filter(p => p.name !== excludeProvider && this.canUseProvider(p.name))
      .sort((a, b) => a.priority - b.priority)[0];
  }

  async callGemini(prompt, provider) {
    const response = await axios.post(
      `${provider.endpoint}?key=${provider.key}`,
      {
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048
        }
      }
    );
    
    return {
      text: response.data.candidates[0].content.parts[0].text,
      provider: 'gemini',
      usage: response.data.usageMetadata
    };
  }

  async callOpenAI(prompt, provider) {
    const response = await axios.post(
      provider.endpoint,
      {
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 2048,
        temperature: 0.7
      },
      {
        headers: {
          'Authorization': `Bearer ${provider.key}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    return {
      text: response.data.choices[0].message.content,
      provider: 'openai',
      usage: response.data.usage
    };
  }

  getUsageStats() {
    return Object.entries(this.providers).map(([name, provider]) => ({
      name,
      usage: provider.currentUsage,
      limit: provider.dailyLimit,
      percentage: (provider.currentUsage / provider.dailyLimit) * 100
    }));
  }

  resetDailyUsage() {
    Object.values(this.providers).forEach(provider => {
      provider.currentUsage = 0;
    });
  }
}

module.exports = new AIProviderManager();