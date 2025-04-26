import React from 'react';

interface CustomIconProps {
  iconType?: string; // e.g., 'folder', 'image', 'text'
  className?: string;
}

const iconBasePath = '/src/assets/icons/';

// Map icon types to their corresponding file names
const iconMap: { [key: string]: string } = {
  folder: 'folder.png',
  image: 'image.png',
  text: 'text.png',
  video: 'video.png',
  link: 'link.png',
  'other-channel': 'other-channel.png',
  config: 'config.png',
  console: 'console.png',
  // Add other mappings as needed
};

export const CustomIcon: React.FC<CustomIconProps> = ({ iconType, className }) => {
  if (!iconType || !iconMap[iconType]) {
    // Optionally return a default icon or null if type is missing/invalid
    return null; 
  }

  const iconSrc = `${iconBasePath}${iconMap[iconType]}`;

  return (
    <img 
      src={iconSrc} 
      alt={`${iconType} icon`} 
      className={`inline-block object-contain ${className || ''}`} 
      // Prevent dragging the icon itself, which can interfere with window dragging
      draggable="false" 
      // Improve rendering performance for small, static images
      loading="eager" 
      decoding="sync"
    />
  );
};
