
import { useWindowManager } from '@/hooks/useWindowManager';
import { DraggableWindow } from './DraggableWindow';

export const WindowContainer = () => {
  const { windows } = useWindowManager();
  
  return (
    <div className="h-full w-full relative overflow-hidden">
      {windows.map((window) => (
        <DraggableWindow key={window.id} window={window} />
      ))}
    </div>
  );
};
