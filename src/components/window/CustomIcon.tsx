import React from 'react';

// 1. Import the icons directly
import folderIcon from '../../assets/icons/folder.png';
import imageIcon from '../../assets/icons/image.png';
import textIcon from '../../assets/icons/text.png';
import videoIcon from '../../assets/icons/video.png';
import linkIcon from '../../assets/icons/link.png';
import otherChannelIcon from '../../assets/icons/other-channel.png';
import configIcon from '../../assets/icons/config.png';
import consoleIcon from '../../assets/icons/console.png';
import arenaIcon from '../../assets/icons/arena.png'; // Add arena icon
import lokComputerIcon from '../../assets/icons/lok-computer.png'; // Add lok-computer icon
import weatherIcon from '../../assets/icons/weather.png'; // Add weather icon
import bskyIcon from '../../assets/icons/bsky.png'; // Add bsky icon
// Add imports for any other icons you have...

interface CustomIconProps {
  iconType?: string; // e.g., 'folder', 'image', 'text'
  className?: string;
}

// 2. Map icon types to the imported icon variables
const iconMap: { [key: string]: string } = { // The value is now the imported URL string
  folder: folderIcon,
  image: imageIcon,
  text: textIcon,
  video: videoIcon,
  link: linkIcon,
  'other-channel': otherChannelIcon,
  config: configIcon,
  console: consoleIcon,
  arena: arenaIcon, // Map 'arena' type
  about: lokComputerIcon, // Map 'about' type to lok-computer icon
  weather: weatherIcon, // Map 'weather' type
  bsky: bskyIcon, // Add bsky mapping
  // Add other mappings corresponding to your imports
};

export const CustomIcon: React.FC<CustomIconProps> = ({ iconType, className }) => {
  // 3. Get the correct imported URL from the map
  const iconSrc = iconType ? iconMap[iconType] : null; 

  if (!iconSrc) {
    // Optionally return a default icon or null if type is missing/invalid
    return null; 
  }

  // Use the imported URL directly
  return (
    <img 
      src={iconSrc} 
      alt={`${iconType || 'icon'}`} 
      className={`inline-block object-contain ${className || ''}`} 
      // Prevent dragging the icon itself, which can interfere with window dragging
      draggable="false" 
      // Improve rendering performance for small, static images
      loading="eager" 
      decoding="sync"
    />
  );
};
