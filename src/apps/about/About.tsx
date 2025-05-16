import { useState } from 'react';

export const About = () => {
  const [activeTab, setActiveTab] = useState('about-this');

  return (
    <div className="text-sm p-0">
      <div className="flex border-b border-accent sticky top-0 bg-background">
        <button 
          className={`ml-2 mt-2 px-2 py-1 border-l border-t border-r border-accent mr-1 ${activeTab === 'about-this' ? 'bg-accent/50' : 'opacity-50'}`}
          onClick={() => setActiveTab('about-this')}
        >
          About this
        </button>
        <button 
          className={`mt-2 px-2 py-1 border-l border-t border-r border-accent ${activeTab === 'about-me' ? 'bg-accent/50' : 'opacity-50'}`}
          onClick={() => setActiveTab('about-me')}
        >
          About me
        </button>
      </div>

      {activeTab === 'about-this' && (
        <div className="max-w-lg mx-auto p-4">
          <img className="mb-6 select-none" src="https://d2w9rnfcy7mm78.cloudfront.net/36349997/original_9ae0772fcf1074962bb42fc2b6a21dfd.jpg" alt="a computer within a computer, that's basically what lok.computer is" />
          <div className="select-text">
            <div className="border-l-4 border-accent pl-4 italic mb-4">
              A small OS in your browser, for curiosity and creation.
            </div>
            
            <p className="mb-4">
              <strong>lok.computer</strong> is yet another useless side project of <a href="https://leonw.ong/" className="underline text-blue-700 dark:text-blue-300">Leon</a>'s. It's a retro-inspired web desktop brings together modular mini apps like an are.na browser (yeh so orginal), weather (maybe?), and more (i don't know yet) — within a playful, windowed environment.
            </p>
            
            <p className="mb-4">
              Under the hood: React, TypeScript, Vite, and Tailwind CSS. Oh try <a href="https://bun.sh" className="underline text-blue-700 dark:text-blue-300">bun.sh</a>, it's amazing.
            </p>

            <p>
              Made by Claude 3.7 Sonnet, Gemini 2.5 Pro Preview, Cline, and Windsurf.
            </p>
          </div>

          <p className="mt-4 text-xs opacity-50 select-none">
            Version 1.3.2
          </p>
        </div>
      )}

      {activeTab === 'about-me' && (
        <div className="select-text p-4 max-w-lg mx-auto">
          <div className="border-l-4 border-accent pl-4 italic mb-4">
            Live to the point of tears. - Albert Camus
          </div>
          
          <p className="mb-4">
            visit <a href="https://leonw.ong/" className="underline text-blue-700 dark:text-blue-300">leonw.ong</a> for now.
          </p>
        </div>
      )}
    </div>
  );
};