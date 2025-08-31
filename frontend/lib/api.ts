// lib/api.ts
import axios from 'axios'

const API_BASE_URL = process.env.BACKEND_URL || 'http://localhost:5000'

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

export interface ChatResponse {
  status: string
  query: string
  sources: Array<{
    title: string
    url: string
    content: string
    relevance_score: number
  }>
  response: string
}

export interface StockAnalysisResponse {
  status: string
  stock_name: string
  time_horizon: string
  sources: Array<{
    title: string
    url: string
    content: string
    relevance_score: number
  }>
  metrics: Record<string, string>
  recommendation: string
  analysis: string
  analysis_date: string
}

export const chatAPI = {
  sendMessage: async (query: string): Promise<ChatResponse> => {
    const response = await api.post('/chat', { query })
    return response.data
  },
}

export const stockAPI = {
  analyzeStock: async (
    stock_name: string,
    time_horizon: string = 'medium-term',
    detailed: boolean = false
  ): Promise<StockAnalysisResponse> => {
    const response = await api.post('/stock-analysis', {
      stock_name,
      time_horizon,
      detailed,
    })
    return response.data
  },

  analyzeStockWithDocument: async (
    stock_name: string,
    time_horizon: string = 'medium-term',
    document?: File
  ): Promise<StockAnalysisResponse> => {
    const formData = new FormData()
    formData.append('stock_name', stock_name)
    formData.append('time_horizon', time_horizon)
    
    if (document) {
      formData.append('document', document)
    }

    const response = await api.post('/stock-analysis/document', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },
}
