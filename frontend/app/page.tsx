// app/page.tsx
'use client'

import { useState } from 'react'
import Navbar from '@/components/Navbar'
import ChatInterface from '@/components/ChatInterface'
import StockAnalysis from '@/components/StockAnalysis'
import Hero from '@/components/Hero'

export default function Home() {
  const [activeTab, setActiveTab] = useState<'chat' | 'stock' | 'home'>('home')

  return (
    <div className="min-h-screen">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main className="container mx-auto px-4 py-8">
        {activeTab === 'home' && <Hero setActiveTab={setActiveTab} />}
        {activeTab === 'chat' && <ChatInterface />}
        {activeTab === 'stock' && <StockAnalysis />}
      </main>
    </div>
  )
}
