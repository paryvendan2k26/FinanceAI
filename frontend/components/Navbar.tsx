import React, { useState, useEffect } from 'react';
import { MessageCircle, TrendingUp, Home, Sparkles } from 'lucide-react';

// The Navbar component is now a single self-contained file.
// It tracks scroll position to change its appearance dynamically.
export default function Navbar({ activeTab, setActiveTab }) {
  const [scrolled, setScrolled] = useState(false);

  // Function to handle the scroll event
  const handleScroll = () => {
    // Check if the user has scrolled down more than 50 pixels
    const offset = window.scrollY;
    if (offset > 50) {
      setScrolled(true);
    } else {
      setScrolled(false);
    }
  };

  // Add the scroll event listener when the component mounts
  useEffect(() => {
    window.addEventListener('scroll', handleScroll);
    // Clean up the event listener when the component unmounts
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []); // The empty dependency array ensures this effect runs only once

  return (
    <nav 
      className={`
        mx-4 mt-4 p-4 z-50 rounded-xl transition-all duration-300 backdrop-blur-md
        ${scrolled 
          ? 'bg-zinc-950/80 neon-border-solid' 
          : 'bg-white/5 border border-white/10'
        }
      `}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Sparkles className="w-8 h-8 text-neon-blue animate-pulse" />
          <h1 className="text-2xl font-bold gradient-text">
            FinanceAI
          </h1>
        </div>
        
        <div className="flex space-x-4">
          <button
            onClick={() => setActiveTab('home')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition-all duration-300 ${
              activeTab === 'home'
                ? 'bg-neon-blue/20 text-neon-blue neon-border'
                : 'hover:bg-white/10'
            }`}
          >
            <Home className="w-5 h-5" />
            <span>Home</span>
          </button>

          <button
            onClick={() => setActiveTab('stock')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition-all duration-300 ${
              activeTab === 'stock'
                ? 'bg-neon-blue/20 text-neon-blue neon-border'
                : 'hover:bg-white/10'
            }`}
          >
            <TrendingUp className="w-5 h-5" />
            <span>Stock Analysis</span>
          </button>
        </div>
      </div>
    </nav>
  )
}
