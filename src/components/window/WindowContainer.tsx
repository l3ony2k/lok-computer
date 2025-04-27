import { useWindowManager } from '@/hooks/useWindowManager.ts';
import { DraggableWindow } from './DraggableWindow';

export const WindowContainer = () => {
  const { windows, updateWindowDimensions } = useWindowManager();
  
  return (
    <div className="h-full w-full relative overflow-hidden">
      {windows.map((window) => (
        <DraggableWindow 
          key={window.id} 
          window={window} 
          onResizeStop={updateWindowDimensions}
        />
      ))}
    </div>
  );
};
