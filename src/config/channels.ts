/**
 * A snapshot of lok's Are.na channels. The live list comes from the API
 * (`getUserChannels`, cached at boot); this one stands in when Are.na cannot be
 * reached, and seeds the Images app's suggestions until the live list arrives.
 */
export const FEATURED_CHANNELS = [
  { slug: 'journaling-and-healing', title: 'journaling and healing' },
  { slug: 'things-i-created', title: 'things i created' },
  { slug: 'ephemeral-visions', title: '🜳 ephemeral visions' },
  { slug: 'physical-digital-surrealism', title: '🜳 physical / digital - surrealism' },
  { slug: 'it-s-really-cute', title: '🜳 it\'s really cute' },
  { slug: 'imaginary-tech-interface', title: 'imaginary tech / interface' },
  { slug: 'cool-stuff-on-web', title: 'cool stuff on web' },
  { slug: 'tech-nostalgia-ue2i-s0rbl0', title: 'tech nostalgia' },
  { slug: 'terminal-tools', title: 'terminal tools' },
  { slug: 'my-digital-toolbox', title: 'my digital toolbox' },
  { slug: 'almost-lost-memories', title: 'almost lost memories' },
  { slug: 'device-gadget', title: 'device / gadget' },
  { slug: 'random-ai', title: 'random AI' },
  { slug: 'vibe-coding-3vwdm1u1iye', title: 'vibe coding' },
  { slug: 'alternative-mini-web', title: 'alternative / mini web' },
  { slug: 'info-ddy8zqnskta', title: 'info' },
  { slug: 'frutiger-aero-fmtmkflqhq8', title: 'frutiger aero' },
];

/** lok marks image-heavy channels with this symbol in the title; the Images app suggests those. */
export const IMAGE_CHANNEL_MARK = '🜳';

export const isImageChannel = (channel: { title: string }) => channel.title.includes(IMAGE_CHANNEL_MARK);

/** The channel title without the mark, for a button label. */
export const imageChannelLabel = (channel: { title: string }) => channel.title.replace(IMAGE_CHANNEL_MARK, '').trim();

