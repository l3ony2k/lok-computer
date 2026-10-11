/** Wallpaper presets offered by Config and the BIOS setup screen. */
export interface WallpaperPreset {
  name: string;
  url: string;
}

export const WALLPAPER_PRESETS: WallpaperPreset[] = [
  {
    name: "by @1000bytes.bsky.social",
    url: "https://d2w9rnfcy7mm78.cloudfront.net/36335972/original_8a4c77ea7ed077282b4653fad9183d57.jpg",
  },
  {
    name: "Ocean Waves",
    url: "https://images.unsplash.com/photo-1484387436194-cf7cb70800ce?w=1280&auto=format&fit=crop",
  },
  {
    name: "Abstract Geometric",
    url: "https://images.unsplash.com/photo-1605106702734-205df224ecce?w=1280&auto=format&fit=crop",
  },
  {
    name: "Retro Computer",
    url: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=1280&auto=format&fit=crop",
  },
];
