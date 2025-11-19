import { useState, useEffect } from 'react';
import { WindowLayout } from '@/components/window/WindowLayout';
import { RetroButton } from '@/components/ui/RetroButton';

export const About = () => {
  const [activeTab, setActiveTab] = useState('about-this');

  useEffect(() => {
    console.info('[About] App initialized');
    return () => {
      console.info('[About] App cleanup');
    };
  }, []);

  const handleTabChange = (tab: string) => {
    console.log('[About] Tab changed to:', tab);
    setActiveTab(tab);
  };

  return (
    <WindowLayout
      toolbar={
        <div className="flex border-b border-accent sticky top-0 bg-background p-1 space-x-1">
          <RetroButton
            active={activeTab === 'about-this'}
            onClick={() => handleTabChange('about-this')}
          >
            About this
          </RetroButton>
          <RetroButton
            active={activeTab === 'about-me'}
            onClick={() => handleTabChange('about-me')}
          >
            About me
          </RetroButton>
          <RetroButton
            active={activeTab === 'projects'}
            onClick={() => handleTabChange('projects')}
          >
            Projects
          </RetroButton>
        </div>
      }
      hasPadding={false}
    >
      <div className="text-sm">
        {activeTab === 'about-this' && (
          <div className="max-w-lg mx-auto p-4">
            <img
              className="mb-6 select-none"
              src="https://d2w9rnfcy7mm78.cloudfront.net/36349997/original_9ae0772fcf1074962bb42fc2b6a21dfd.jpg"
              alt="a computer within a computer, that's basically what lok.computer is"
              onLoad={() => console.log('[About] Hero image loaded')}
              onError={() => console.error('[About] Failed to load hero image')}
            />
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

        {activeTab === 'projects' && (
          <div className="select-text p-4 max-w-lg mx-auto">
            <div className="border-l-4 border-accent pl-4 italic mb-4">
              Live to the point of tears. - Albert Camus
            </div>
          </div>
        )}
      </div>
    </WindowLayout>
  );
};