import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">404</h1>
        <p className="text-base mb-8 opacity-50">You can't use an old map to explore a new world.</p>
        <a href="/">
          <button className="retro-button py-1 px-2">Return to Home</button>
        </a>
      </div>
    </div>
  );
};

export default NotFound;
