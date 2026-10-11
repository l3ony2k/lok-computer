import React from 'react';
import folderIcon from '../../assets/icons/folder.png';
import imageIcon from '../../assets/icons/image.png';
import textIcon from '../../assets/icons/text.png';
import videoIcon from '../../assets/icons/video.png';
import linkIcon from '../../assets/icons/link.png';
import otherChannelIcon from '../../assets/icons/other-channel.png';
import cogIcon from '../../assets/icons/cog.png';
import consoleIcon from '../../assets/icons/console.png';
import arenaIcon from '../../assets/icons/arena.png';
import lokComputerIcon from '../../assets/icons/lok-computer.png';
import weatherIcon from '../../assets/icons/weather2.png';
import bskyIcon from '../../assets/icons/bsky.png';
import globeIcon from '../../assets/icons/globe.png';
import webpageIcon from '../../assets/icons/webpage.png';
import robotIcon from '../../assets/icons/robot.png';
import mailIcon from '../../assets/icons/mail.png';
import fediIcon from '../../assets/icons/fedi.png';
import shelfIcon from '../../assets/icons/shelf.png';
import noteIcon from '../../assets/icons/note.png';
import mediaIcon from '../../assets/icons/media.png';
import clockIcon from '../../assets/icons/clock.png';
import calculatorIcon from '../../assets/icons/calculator.png';
import diceIcon from '../../assets/icons/dice.png';

interface CustomIconProps {
  iconType?: string;
  className?: string;
  /**
   * Icons are 32px pixel art stored at 8× (scripts/pixel-icons.mjs). Smooth
   * scaling is exact at 32px and keeps detail at 16px; set this only when the
   * icon is drawn larger than 32px, so the upscale stays crisp.
   */
  pixelated?: boolean;
}

/** Icon type (as used by the Application catalog and window chrome) to its generated PNG. */
const ICONS: Record<string, string> = {
  folder: folderIcon,
  image: imageIcon,
  text: textIcon,
  video: videoIcon,
  link: linkIcon,
  'other-channel': otherChannelIcon,
  config: cogIcon,
  console: consoleIcon,
  arena: arenaIcon,
  about: lokComputerIcon,
  weather: weatherIcon,
  bsky: bskyIcon,
  globe: globeIcon,
  webpage: webpageIcon,
  mailbox: robotIcon,
  mail: mailIcon,
  fedi: fediIcon,
  shelf: shelfIcon,
  note: noteIcon,
  media: mediaIcon,
  clock: clockIcon,
  calculator: calculatorIcon,
  dice: diceIcon,
};

export const CustomIcon: React.FC<CustomIconProps> = ({ iconType, className, pixelated = false }) => {
  const iconSrc = iconType ? ICONS[iconType] : undefined;
  if (!iconSrc) return null;

  return (
    <img
      src={iconSrc}
      // Icons always sit beside a visible or aria label, so they are decorative.
      alt=""
      className={`inline-block object-contain ${className || ''}`}
      style={pixelated ? { imageRendering: 'pixelated' } : undefined}
      // Prevent dragging the icon itself, which can interfere with window dragging
      draggable="false"
      loading="eager"
      decoding="sync"
    />
  );
};
