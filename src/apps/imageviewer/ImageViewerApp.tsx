import React from 'react';
import { WindowLayout } from '@/components/window/WindowLayout';

interface ImageViewerAppProps {
  imageUrl?: string;
}

export const ImageViewerApp: React.FC<ImageViewerAppProps> = ({
  imageUrl = "https://placehold.co/600x400?text=No+Image"
}) => {
  return (
    <WindowLayout hasPadding={false} className="bg-black flex items-center justify-center">
      <img
        src={imageUrl}
        alt="Viewed content"
        className="max-w-full max-h-full object-contain"
      />
    </WindowLayout>
  );
};

export default ImageViewerApp;