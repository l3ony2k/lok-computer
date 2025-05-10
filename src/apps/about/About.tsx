export const About = () => {
  return (
    <div className="text-sm p-4 max-w-md mx-auto">
      <img className="mb-6" src="https://d2w9rnfcy7mm78.cloudfront.net/36349997/original_9ae0772fcf1074962bb42fc2b6a21dfd.jpg" alt="a computer within a computer, that's basically what lok.computer is" />
      <div className="border-l-4 border-neutral-400 pl-4 italic mb-4">
        "A small OS in your browser, for curiosity and creation."
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

      <p className="mt-4 text-xs opacity-50">
        Version 1.0.0
      </p>
    </div>
  );
};