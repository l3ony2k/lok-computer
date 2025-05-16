import React from 'react';

interface ImageViewerAppProps {
  imageUrl: string;
  altText?: string;
  aspectRatio?: number;
}

const ImageViewerApp: React.FC<ImageViewerAppProps> = ({ imageUrl, altText, aspectRatio }) => {
  // aspectRatio is available here if needed for any logic, but not directly used for img styling due to object-contain
  // console.log('ImageViewerApp aspectRatio:', aspectRatio); // For debugging if needed
  return (
    <div className="flex items-center justify-center h-full w-full p-0 window-content-area select-none">
      <img 
        src={imageUrl} 
        alt={altText || 'Image view'} 
        className="max-w-full max-h-full object-contain" 
      />
    </div>
  );
};

export default ImageViewerApp; 