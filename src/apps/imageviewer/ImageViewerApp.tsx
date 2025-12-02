import React from 'react';
import { WindowLayout } from '@/components/window/WindowLayout';

interface ImageViewerAppProps {
  imageUrl?: string;
}

export const ImageViewerApp: React.FC<ImageViewerAppProps> = ({
  imageUrl = "https://placehold.co/600x400?text=No+Image"
}) => {
  return (
    <WindowLayout hasPadding={false} isScrollable={false}>
      <div className="h-full w-full flex items-center justify-center overflow-hidden">
        <img
          src={imageUrl}
          alt="Viewed content"
          className="max-w-full max-h-full object-contain"
        />
      </div>
    </WindowLayout>
  );
};

export default ImageViewerApp;