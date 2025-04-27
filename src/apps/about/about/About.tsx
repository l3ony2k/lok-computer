
export const About = () => {
  return (
    <div className="p-4 max-w-md mx-auto">
      <div className="border-l-4 border-gray-400 pl-4 italic mb-6">
        "Men must live and create. Live to the point of tears."
        <div className="mt-1 text-right">— Albert Camus</div>
      </div>
      
      <p className="mb-4">
        This is a retro OS-inspired interface for browsing Are.na channels and blocks. 
        It mimics a desktop environment where channels are folders and blocks are files.
      </p>
      
      <p className="mb-4">
        You can navigate through @lok's Are.na content, open multiple windows, and interact
        with different types of blocks - images, links, text, and more.
      </p>
      
      <p>
        Built with React, TypeScript, and the Are.na API.
      </p>
    </div>
  );
};
