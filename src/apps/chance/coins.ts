/**
 * The coins Chance can flip: real coins, photographed. Each type's two faces
 * are WebP files at src/assets/coin/<type id>/heads.webp and tails.webp (made
 * by scripts/coin-images.mjs), square and transparent outside the rim; their
 * URLs come from coinImages.ts. Credits for every photo live in NOTICE.md and
 * About › Thank you. coins.test.ts checks that every type has both faces.
 */

export interface CoinType {
  id: string;
  /** A short name, shown in the coin's dropdown and in About. */
  label: string;
  /** What the coin is, for alt text. */
  name: string;
  /** The photograph's page on Wikimedia Commons, linked from About. */
  source: string;
  /** Who photographed it, when not Jaclyn Nash for the Smithsonian (About credits it). */
  credit?: string;
}

/**
 * Photos by Jaclyn Nash for the Smithsonian's National Numismatic Collection
 * (2015) unless a type names its `credit`; all public domain. The order is
 * the dropdown's.
 */
export const COIN_TYPES: readonly CoinType[] = [
  {
    id: 'lincoln-cent-1909',
    label: 'Lincoln cent',
    name: "1909 Lincoln cent (United States)",
    source: 'https://commons.wikimedia.org/wiki/File:NNC-US-1909-1C-Lincoln_Cent_(wheat).jpg',
  },
  {
    id: 'indian-head-cent-1859',
    label: 'Indian Head cent',
    name: "1859 Indian Head cent (United States)",
    source: 'https://commons.wikimedia.org/wiki/File:NNC-US-1859-1C-Indian_Head_Cent_(wreath).jpg',
  },
  {
    id: 'buffalo-nickel-1913',
    label: 'Buffalo nickel',
    name: "1913 Buffalo nickel (United States)",
    source: 'https://commons.wikimedia.org/wiki/File:NNC-US-1913-5C-Buffalo_Nickel_(TyI-mound).jpg',
  },
  {
    id: 'barber-dime-1892',
    label: 'Barber dime',
    name: "1892 Barber dime (United States)",
    source: 'https://commons.wikimedia.org/wiki/File:NNC-US-1892-10C-Barber_Dime.jpg',
  },
  {
    id: 'seated-quarter-1873',
    label: 'Seated quarter',
    name: "1873 Seated Liberty quarter (United States)",
    source: 'https://commons.wikimedia.org/wiki/File:NNC-US-1873-25C-Seated_Liberty_(no_arrows).jpg',
  },
  {
    id: 'morgan-dollar-1878',
    label: 'Morgan dollar',
    name: "1878-CC Morgan dollar (United States)",
    source: 'https://commons.wikimedia.org/wiki/File:NNC-US-1878-CC-1$-Morgan_dollar.jpg',
  },
  {
    id: 'peace-dollar-1921',
    label: 'Peace dollar',
    name: "1921 Peace dollar (United States)",
    source: 'https://commons.wikimedia.org/wiki/File:NNC-US-1921-1$-Peace_dollar.jpg',
  },
  {
    id: 'double-eagle-1907',
    label: 'Double eagle',
    name: "1907 Saint-Gaudens double eagle, $20 gold (United States)",
    source: 'https://commons.wikimedia.org/wiki/File:NNC-US-1907-G$20-Saint_Gaudens_(Arabic).jpg',
  },
  {
    id: 'una-and-the-lion-1839',
    label: 'Una and the Lion',
    name: "1839 £5 “Una and the Lion”, Queen Victoria (United Kingdom)",
    source: 'https://commons.wikimedia.org/wiki/File:England_(UK)_1839_5_Pounds_(Una_and_the_Lion).jpg',
  },
  {
    id: 'india-mohurs-1835',
    label: 'Two mohurs',
    name: "1835 two mohurs, William IV (British India)",
    source: 'https://commons.wikimedia.org/wiki/File:India_1835_2_Mohurs.jpg',
  },
  {
    id: 'kangxi-tongbao',
    label: 'Kangxi Tongbao',
    name: 'Kangxi Tongbao 康熙通寶, a Qing cash coin, 1662–1722 (China)',
    source: 'https://commons.wikimedia.org/wiki/File:Coin._Qing_Dynasty._Kangxi_Tongbao._Bao_Quan._obv.jpg',
    credit: 'Murberget, Länsmuseet Västernorrland',
  },
];

export const DEFAULT_COIN = COIN_TYPES[0].id;
export const MAX_COINS = 10;
export const COIN_IMAGE_SIZE = 480;

export const isCoinType = (value: unknown): value is string => COIN_TYPES.some((type) => type.id === value);

export const coinType = (id: string): CoinType => COIN_TYPES.find((type) => type.id === id) ?? COIN_TYPES[0];
