import React from 'react';

// 1. Import the icons directly
import folderIcon from '../../assets/icons/folder.png';
import imageIcon from '../../assets/icons/image.png';
import textIcon from '../../assets/icons/text.png';
import videoIcon from '../../assets/icons/video.png';
import linkIcon from '../../assets/icons/link.png';
import otherChannelIcon from '../../assets/icons/other-channel.png';
import cogIcon from '../../assets/icons/cog.png';
import consoleIcon from '../../assets/icons/console.png';
import arenaIcon from '../../assets/icons/arena.png'; // Add arena icon
import lokComputerIcon from '../../assets/icons/lok-computer.png'; // Add lok-computer icon
import weather2Icon from '../../assets/icons/weather2.png'; // Add weather icon
import bskyIcon from '../../assets/icons/bsky.png'; // Add bsky icon
import globeIcon from '../../assets/icons/globe.png'; // Add globe icon
import webpageIcon from '../../assets/icons/webpage.png'; // Add webpage icon
import robotIcon from '../../assets/icons/robot.png'; // Add mail icon
import mailIcon from '../../assets/icons/mail.png'; // Add mail icon for guestbook
import fediIcon from '../../assets/icons/fedi.png'; // Add fedi icon for fedi
import shelfIcon from '../../assets/icons/shelf.png'; // Add shelf icon
import noteIcon from '../../assets/icons/note.png'; // Add note icon for buttons app
import mediaIcon from '../../assets/icons/media.png';
// Add imports for any other icons you have...

interface CustomIconProps {
  iconType?: string; // e.g., 'folder', 'image', 'text'
  className?: string;
  /**
   * Icons are 32px pixel art stored at 8× (scripts/pixel-icons.mjs). Smooth
   * scaling is exact at 32px and keeps detail at 16px; set this only when the
   * icon is drawn larger than 32px, so the upscale stays crisp.
   */
  pixelated?: boolean;
}

// 2. Map icon types to the imported icon variables
const iconMap: { [key: string]: string } = { // The value is now the imported URL string
  folder: folderIcon,
  image: imageIcon,
  text: textIcon,
  video: videoIcon,
  link: linkIcon,
  'other-channel': otherChannelIcon,
  config: cogIcon,
  console: consoleIcon,
  arena: arenaIcon, // Map 'arena' type
  about: lokComputerIcon, // Map 'about' type to lok-computer icon
  weather: weather2Icon, // Map 'weather' type
  bsky: bskyIcon, // Add bsky mapping
  globe: globeIcon, // Add globe mapping
  webpage: webpageIcon, // Add webpage mapping
  mailbox: robotIcon, // Add mailbox icon mapping
  mail: mailIcon, // Add mail icon mapping for guestbook
  fedi: fediIcon, // Add fedi icon mapping
  shelf: shelfIcon, // Add shelf icon mapping
  note: noteIcon, // Add note icon mapping for buttons app
  media: mediaIcon,
  // Add other mappings corresponding to your imports
};

export const CustomIcon: React.FC<CustomIconProps> = ({ iconType, className, pixelated = false }) => {
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
      style={pixelated ? { imageRendering: 'pixelated' } : undefined}
      // Prevent dragging the icon itself, which can interfere with window dragging
      draggable="false"
      // Improve rendering performance for small, static images
      loading="eager"
      decoding="sync"
    />
  );
};
