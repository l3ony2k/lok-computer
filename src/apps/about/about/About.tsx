export const About = () => {
  return (
    <div className="p-4 max-w-md mx-auto">
      <div className="border-l-4 border-gray-400 pl-4 italic mb-6">
        "A small OS in your browser, for curiosity and creation."
      </div>
      
      <p className="mb-4">
        <strong>lok.computer</strong> is a retro-inspired web desktop. It brings together modular mini-apps—like an Are.na browser, weather, and more—within a playful, windowed environment.
      </p>
      
      <p className="mb-4">
        You can open, move, and manage multiple windows, switch themes, and explore new apps as they're added. The design is inspired by classic operating systems, but built for the modern web.
      </p>
      
      <p className="mb-4">
        Under the hood: React, TypeScript, Vite, shadcn/ui, and Tailwind CSS.
      </p>

      <p>
        Made by <a href="https://leonw.ong/" className="underline text-blue-700 dark:text-blue-300">Leon</a>.
      </p>
    </div>
  );
};