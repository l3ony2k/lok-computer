#!/usr/bin/env node
/**
 * Pixel-art icon generator for lok.computer.
 *
 * Every app icon is hand-placed pixel art: an ASCII grid (one character per
 * pixel) drawn with one shared palette, centered on a 32×32 canvas and
 * upscaled 8× with nearest-neighbour sampling. Each source pixel becomes an
 * 8×8 block, so smooth browser scaling is exact at 32 CSS px and keeps detail
 * at 16 px; CustomIcon's `pixelated` prop keeps larger renders crisp.
 *
 * Style: flat fills, a 1px near-black outline, rounded corners from 1–2px
 * insets, and one darker tone on the inner right and bottom edges.
 *
 * Brand marks keep their official colours (sampled from the source artwork).
 * Detail finer than the grid, like the L3 logo on the About screen, goes in a
 * `vector` layer: SVG path data rasterised at the output resolution.
 *
 * Usage:
 *   node scripts/pixel-icons.mjs                 # write every icon to src/assets/icons
 *   node scripts/pixel-icons.mjs --only media,folder
 *   node scripts/pixel-icons.mjs --sheet sheet.png   # also write a contact sheet
 *   node scripts/pixel-icons.mjs --out some/dir --scale 8
 *
 * No dependencies: paths are rasterised here and PNGs encoded with node:zlib.
 * Run it with node so the committed files stay byte-identical; bun draws the
 * same pixels but its deflate output differs, which would churn every PNG.
 */
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CANVAS = 32;

/** One palette for every icon. `.` is transparent. */
const PALETTE = {
  '.': null,
  '#': '#111111', // outline
  h: '#FAFAFA', // highlight
  w: '#ECEAE0', // off-white body
  s: '#C8C6B8', // off-white shadow
  g: '#96968C', // warm gray
  d: '#5A5A5A', // dark gray
  k: '#3C3C3C', // darker gray
  l: '#A8C8E8', // light blue
  b: '#3C6EB4', // blue
  B: '#26487A', // navy, blue shadow
  N: '#283A63', // screen navy
  n: '#6E503C', // brown
  m: '#4A3426', // dark brown
  Z: '#FBE7A2', // light yellow
  y: '#F5CD52', // yellow
  Y: '#D9A62E', // ochre, yellow shadow
  o: '#E8873A', // orange
  O: '#B8612A', // dark orange
  r: '#D24B3C', // red
  R: '#9A3028', // dark red
  e: '#6DB04F', // green
  E: '#3F7F37', // dark green
  t: '#D8B47E', // tan
  T: '#AE8650', // dark tan
  c: '#F4E6CC', // cream
  // Brand colours, sampled from each mark's official artwork.
  v: '#E1D7BD', // lok.computer cream (favicon)
  V: '#C5BA9B', // lok.computer cream shadow
  U: '#ABA38A', // lok.computer bezel corners and neck (favicon)
  q: '#1185FE', // Bluesky blue
  Q: '#0A62C4', // Bluesky blue shadow
  F: '#C76C33', // GoToSocial fur
  f: '#DF8958', // GoToSocial light fur
  W: '#E8E7E5', // GoToSocial face
  S: '#D3D0D6', // GoToSocial face shadow
  M: '#77889B', // GoToSocial eye mask
  A: '#5E6F7E', // GoToSocial eye mask shadow
  x: '#333A42', // GoToSocial eyes, nose and mouth
};

/**
 * Vector layers carry detail a 32px grid cannot: SVG path data painted at the
 * output resolution over a rectangle of grid cells. `rect` is [x, y, width,
 * height] in canvas cells; `viewBox` is the SVG region fitted into it (scaled
 * uniformly, centred) after `background` fills the rectangle. Paths fill with
 * the nonzero rule and 8×8 supersampled coverage.
 */
// The About screen is the real L3 logo from the favicon artwork
// (src/assets/icons/lok-computer.svg): a cream parallelogram with "L3" cut out.
const LOK_SCREEN = {
  rect: [6, 4, 20, 14],
  viewBox: [65.2, 61, 210.8, 155.2],
  background: '#293351',
  paths: [{
    fill: '#E1D7BD',
    d: 'M118.893 74.6667C159.32 74.6667 199.76 74.6667 240.2 74.6667C235.067 117.24 226.507 159.333 220.333 201.76C180.133 201.8 139.947 201.84 99.76 201.733C104.76 159.187 113.76 117.2 118.893 74.6667ZM129.8 88.1068C125.907 122.027 119.027 155.533 114.267 189.333C146.027 189.333 177.8 189.333 209.573 189.333C214.387 155.48 219.987 121.747 225.493 88.0001C205.493 88.0001 185.493 88.0001 165.493 88.0001C164.16 96.8667 163.093 105.787 161.853 114.667C176.24 114.667 190.627 114.667 205.013 114.667C204.147 119.067 203.387 123.48 202.533 127.88C188.293 127.867 174.04 127.907 159.8 127.933C158.08 137.36 156.92 146.907 154.653 156.24C169.107 156.56 183.573 155.987 198.027 156.52C197.36 160.8 196.68 165.08 195.867 169.333C177.107 169.347 158.333 169.333 139.56 169.333C143.507 142.12 148.867 115.107 153.56 88.0001C145.64 88.0134 137.72 87.9468 129.8 88.1068Z',
  }],
};

// <art>
const ART = {
  media: { art: `
    ..############################..
    .#wwwwwwwwwwwwwwwwwwwwwwwwwwww#.
    #wwgwwwwwwwwwwwwwwwwwwwwwwwwgws#
    #wwbbbbbbbbbbbbbbbbbbbbbbbbbbws#
    #wwllllllllllllllllllllllllllws#
    #wwllbbbbbbbbbbbbbbllllllllllws#
    #wwllllllllllllllllllllllllllws#
    #wwllbbbbbbbbblllllllllllllllws#
    #wwllllllllllllllllllllllllllws#
    #wwllll##################llllws#
    #wwllll#dkkkkdddddkkkkdd#llllws#
    #wwllll#dkhhkdddddkhhkdd#llllws#
    #wwllll#dkhhkdnnnnkhhkdd#llllws#
    #wwllll#dkkkkdnnnnkkkkdd#llllws#
    #wwllll##################llllws#
    #wwwwwwwwwwwwwwwwwwwwwwwwwwwwws#
    #wwwwwwwwwwwwwwwwwwwwwwwwwwwwws#
    #wwwwww##################wwwwws#
    #wwwww#gggggggggggggggggg#wwwws#
    #wwgww#gggg##ggggggg##ggg#wwgws#
    #wwwww#gggg##ggggggg##ggg#wwwws#
    #wwwww#gggggggggggggggggg#wwwws#
    .#ssss#gggggggggggggggggg#ssss#.
    ..############################..
  ` },
  folder: { art: `
    ..#########.....................
    .#YYYYYYYYY#....................
    #YYYYYYYYYYY###################.
    #YYYYYYYYYYYYYYYYYYYYYYYYYYYYYY#
    #YYYYYYYYYYYYYYYYYYYYYYYYYYYYYY#
    #YYYYYYYYYYYYYYYYYYYYYYYYYYYYYY#
    ################################
    #ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ#
    #yyyyyyyyyyyyyyyyyyyyyyyyyyyyyY#
    #yyyyyyyyyyyyyyyyyyyyyyyyyyyyyY#
    #yyyyyyyyyyyyyyyyyyyyyyyyyyyyyY#
    #yyyyyyyyyyyyyyyyyyyyyyyyyyyyyY#
    #yyyyyyyyyyyyyyyyyyyyyyyyyyyyyY#
    #yyyyyyyyyyyyyyyyyyyyyyyyyyyyyY#
    #yyyyyyyyyyyyyyyyyyyyyyyyyyyyyY#
    #yyyyyyyyyyyyyyyyyyyyyyyyyyyyyY#
    #yyyyyyyyyyyyyyyyyyyyyyyyyyyyyY#
    #yyyyyyyyyyyyyyyyyyyyyyyyyyyyyY#
    #yyyyyyyyyyyyyyyyyyyyyyyyyyyyyY#
    #yyyyyyyyyyyyyyyyyyyyyyyyyyyyyY#
    #yyyyyyyyyyyyyyyyyyyyyyyyyyyyyY#
    #yyyyyyyyyyyyyyyyyyyyyyyyyyyyyY#
    #yyyyyyyyyyyyyyyyyyyyyyyyyyyyyY#
    #yyyyyyyyyyyyyyyyyyyyyyyyyyyyyY#
    #YYYYYYYYYYYYYYYYYYYYYYYYYYYYYY#
    .##############################.
  ` },
  'other-channel': [
    { art: `
      ..#########.....................
      .#YYYYYYYYY#....................
      #YYYYYYYYYYY###################.
      #YYYYYYYYYYYYYYYYYYYYYYYYYYYYYY#
      #YYYYYYYYYYYYYYYYYYYYYYYYYYYYYY#
      #YYYYYYYYYYYYYYYYYYYYYYYYYYYYYY#
      ################################
      #ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ#
      #yyyyyyyyyyyyyyyyyyyyyyyyyyyyyY#
      #yyyyyyyyyyyyyyyyyyyyyyyyyyyyyY#
      #yyyyyyyyyyyyyyyyyyyyyyyyyyyyyY#
      #yyyyyyyyyyyyyyyyyyyyyyyyyyyyyY#
      #yyyyyyyyyyyyyyyyyyyyyyyyyyyyyY#
      #yyyyyyyyyyyyyyyyyyyyyyyyyyyyyY#
      #yyyyyyyyyyyyyyyyyyyyyyyyyyyyyY#
      #yyyyyyyyyyyyyyyyyyyyyyyyyyyyyY#
      #yyyyyyyyyyyyyyyyyyyyyyyyyyyyyY#
      #yyyyyyyyyyyyyyyyyyyyyyyyyyyyyY#
      #yyyyyyyyyyyyyyyyyyyyyyyyyyyyyY#
      #yyyyyyyyyyyyyyyyyyyyyyyyyyyyyY#
      #yyyyyyyyyyyyyyyyyyyyyyyyyyyyyY#
      #yyyyyyyyyyyyyyyyyyyyyyyyyyyyyY#
      #yyyyyyyyyyyyyyyyyyyyyyyyyyyyyY#
      #yyyyyyyyyyyyyyyyyyyyyyyyyyyyyY#
      #YYYYYYYYYYYYYYYYYYYYYYYYYYYYYY#
      .##############################.
    ` },
    { x: 9, y: 16, art: `
      ...########...........
      ..#llllllll#..........
      .#lbbbbbbbbl#.........
      #bbb######bbb#........
      #bb#......#bb#........
      #bb#......#bb######...
      #bbb######bbb#lllll#..
      .#Bbbbbbb#bB#bbbbbbl#.
      ..#BBBBB#bB#######bbb#
      ...######b##......#bb#
      ........#bb#......#bb#
      ........#bbb######bbb#
      .........#BbbbbbbbbB#.
      ..........#BBBBBBBB#..
      ...........########...
    ` },
  ],
  link: { art: `
    ....############...............
    ...#llllllllllll#..............
    ..#lbbbbbbbbbbbbl#.............
    .#lbbbbbbbbbbbbbbl#............
    #bbbb##########bbbb#...........
    #bbb#..........#bbb#...........
    #bbb#..........#bbb#...........
    #bbb#..........#bbb#...........
    #bbb#..........#bbb########....
    #bbbb##########bbbb#lllllll#...
    .#Bbbbbbbbbbb#lbbB#bbbbbbbbl#..
    ..#Bbbbbbbbb#lbbB#bbbbbbbbbbl#.
    ...#BBBBBBB#bbbB##########bbbb#
    ....########bbb#..........#bbb#
    ...........#bbb#..........#bbb#
    ...........#bbb#..........#bbb#
    ...........#bbb#..........#bbb#
    ...........#bbbb##########bbbb#
    ............#BbbbbbbbbbbbbbbB#.
    .............#BbbbbbbbbbbbbB#..
    ..............#BBBBBBBBBBBB#...
    ...............############....
  ` },
  image: [
    { art: `
      ###################.....
      #wwwwwwwwwwwwwwwww##....
      #wwwwwwwwwwwwwwwww#s#...
      #wwwwwwwwwwwwwwwww#ss#..
      #wwwwwwwwwwwwwwwww#sss#.
      #wwwwwwwwwwwwwwwww#ssss#
      #wwwwwwwwwwwwwwwww######
      #wwwwwwwwwwwwwwwwwwwwws#
      #wwwwwwwwwwwwwwwwwwwwws#
      #wwwwwwwwwwwwwwwwwwwwws#
      #wwwwwwwwwwwwwwwwwwwwws#
      #wwwwwwwwwwwwwwwwwwwwws#
      #wwwwwwwwwwwwwwwwwwwwws#
      #wwwwwwwwwwwwwwwwwwwwws#
      #wwwwwwwwwwwwwwwwwwwwws#
      #wwwwwwwwwwwwwwwwwwwwws#
      #wwwwwwwwwwwwwwwwwwwwws#
      #wwwwwwwwwwwwwwwwwwwwws#
      #wwwwwwwwwwwwwwwwwwwwws#
      #wwwwwwwwwwwwwwwwwwwwws#
      #wwwwwwwwwwwwwwwwwwwwws#
      #wwwwwwwwwwwwwwwwwwwwws#
      #wwwwwwwwwwwwwwwwwwwwws#
      #wwwwwwwwwwwwwwwwwwwwws#
      #wwwwwwwwwwwwwwwwwwwwws#
      #wwwwwwwwwwwwwwwwwwwwws#
      #wwwwwwwwwwwwwwwwwwwwws#
      #wwwwwwwwwwwwwwwwwwwwws#
      #ssssssssssssssssssssss#
      ########################
    ` },
    { x: 7, y: 10, art: `
      ##################
      #llllllllllyyylll#
      #lllllllllyyyyyll#
      #lllllllllyyyyyll#
      #lllllllllyyyyyll#
      #llllelllllyyylll#
      #llleeellllllllll#
      #lleeeeelllllllll#
      #leeeeeeellllelll#
      #eeeeeeeeelleeell#
      #EEEEEEEEEEEEEEEl#
      #EEEEEEEEEEEEEEEE#
      ##################
    ` },
  ],
  text: [
    { art: `
      ###################.....
      #wwwwwwwwwwwwwwwww##....
      #wwwwwwwwwwwwwwwww#s#...
      #wwwwwwwwwwwwwwwww#ss#..
      #wwwwwwwwwwwwwwwww#sss#.
      #wwwwwwwwwwwwwwwww#ssss#
      #wwwwwwwwwwwwwwwww######
      #wwwwwwwwwwwwwwwwwwwwws#
      #wwwwwwwwwwwwwwwwwwwwws#
      #wwwwwwwwwwwwwwwwwwwwws#
      #wwwwwwwwwwwwwwwwwwwwws#
      #wwwwwwwwwwwwwwwwwwwwws#
      #wwwwwwwwwwwwwwwwwwwwws#
      #wwwwwwwwwwwwwwwwwwwwws#
      #wwwwwwwwwwwwwwwwwwwwws#
      #wwwwwwwwwwwwwwwwwwwwws#
      #wwwwwwwwwwwwwwwwwwwwws#
      #wwwwwwwwwwwwwwwwwwwwws#
      #wwwwwwwwwwwwwwwwwwwwws#
      #wwwwwwwwwwwwwwwwwwwwws#
      #wwwwwwwwwwwwwwwwwwwwws#
      #wwwwwwwwwwwwwwwwwwwwws#
      #wwwwwwwwwwwwwwwwwwwwws#
      #wwwwwwwwwwwwwwwwwwwwws#
      #wwwwwwwwwwwwwwwwwwwwws#
      #wwwwwwwwwwwwwwwwwwwwws#
      #wwwwwwwwwwwwwwwwwwwwws#
      #wwwwwwwwwwwwwwwwwwwwws#
      #ssssssssssssssssssssss#
      ########################
    ` },
    { x: 7, y: 10, art: `
      dddddddddddd......
      ..................
      gggggggggggggggggg
      ..................
      gggggggggggggggg..
      ..................
      gggggggggggggggggg
      ..................
      ggggggggggggg.....
      ..................
      gggggggggggggggggg
      ..................
      gggggggggggggggg..
      ..................
      gggggggggg........
      ..................
      ..................
    ` },
  ],
  video: [
    { art: `
      ###################.....
      #wwwwwwwwwwwwwwwww##....
      #wwwwwwwwwwwwwwwww#s#...
      #wwwwwwwwwwwwwwwww#ss#..
      #wwwwwwwwwwwwwwwww#sss#.
      #wwwwwwwwwwwwwwwww#ssss#
      #wwwwwwwwwwwwwwwww######
      #wwwwwwwwwwwwwwwwwwwwws#
      #wwwwwwwwwwwwwwwwwwwwws#
      #wwwwwwwwwwwwwwwwwwwwws#
      #wwwwwwwwwwwwwwwwwwwwws#
      #wwwwwwwwwwwwwwwwwwwwws#
      #wwwwwwwwwwwwwwwwwwwwws#
      #wwwwwwwwwwwwwwwwwwwwws#
      #wwwwwwwwwwwwwwwwwwwwws#
      #wwwwwwwwwwwwwwwwwwwwws#
      #wwwwwwwwwwwwwwwwwwwwws#
      #wwwwwwwwwwwwwwwwwwwwws#
      #wwwwwwwwwwwwwwwwwwwwws#
      #wwwwwwwwwwwwwwwwwwwwws#
      #wwwwwwwwwwwwwwwwwwwwws#
      #wwwwwwwwwwwwwwwwwwwwws#
      #wwwwwwwwwwwwwwwwwwwwws#
      #wwwwwwwwwwwwwwwwwwwwws#
      #wwwwwwwwwwwwwwwwwwwwws#
      #wwwwwwwwwwwwwwwwwwwwws#
      #wwwwwwwwwwwwwwwwwwwwws#
      #wwwwwwwwwwwwwwwwwwwwws#
      #ssssssssssssssssssssss#
      ########################
    ` },
    { x: 7, y: 11, art: `
      ##################
      #llllllllllllllll#
      #llllll#lllllllll#
      #llllll##llllllll#
      #llllll###lllllll#
      #llllll####llllll#
      #llllll#####lllll#
      #llllll####llllll#
      #llllll###lllllll#
      #llllll##llllllll#
      #llllll#lllllllll#
      #llllllllllllllll#
      ##################
    ` },
  ],
  console: { art: `
    .##############################.
    #llllllllllllllllllllllllllllll#
    #bbbbbbbbbbbbbbbbbbbbhhbhhbhhbb#
    #bbbbbbbbbbbbbbbbbbbbhhbhhbhhbb#
    ################################
    #wwwwwwwwwwwwwwwwwwwwwwwwwwwwws#
    #w############################s#
    #w#kkkkkkkkkkkkkkkkkkkkkkkkkk#s#
    #w#kkkkkkkkkkkkkkkkkkkkkkkkkk#s#
    #w#kkkkkkkkkkkkkkkkkkkkkkkkkk#s#
    #w#kkeekkkkkkkkkkkkkkkkkkkkkk#s#
    #w#kkkeekkkkkkkkkkkkkkkkkkkkk#s#
    #w#kkkkeekkkkkkkkkkkkkkkkkkkk#s#
    #w#kkkeekkkkkkkkkkkkkkkkkkkkk#s#
    #w#kkeekkkeeeeeekkkkkkkkkkkkk#s#
    #w#kkkkkkkkkkkkkkkkkkkkkkkkkk#s#
    #w#kkkkkkkkkkkkkkkkkkkkkkkkkk#s#
    #w#kkkkkkkkkkkkkkkkkkkkkkkkkk#s#
    #w#kkkkkkkkkkkkkkkkkkkkkkkkkk#s#
    #w#kkkkkkkkkkkkkkkkkkkkkkkkkk#s#
    #w#kkkkkkkkkkkkkkkkkkkkkkkkkk#s#
    #w#kkkkkkkkkkkkkkkkkkkkkkkkkk#s#
    #w#kkkkkkkkkkkkkkkkkkkkkkkkkk#s#
    #w############################s#
    #ssssssssssssssssssssssssssssss#
    .##############################.
  ` },
  cog: { art: `
    ..........####.................
    .........#gggd#................
    .........#gggd#........####....
    ....###..#gggd#..###..#wwws#...
    ...#ggd###gggd###ggd##wwws#....
    ...#ggd#gggggggd#ggd#wwws#...#.
    ...#ddggggggggggggdd#wwws#..#s#
    ....##gggggggggggd###wwwws##ws#
    ....#gggggddddggggd##wwwwwwwws#
    .####ggggd####dgggd##wwwwwwwws#
    #gggggggd#....#gggg#wwwwwwwws#.
    #gggggggd#....#ggg#wwwwsssss#..
    #gggggggd#....#gg#wwwws#####...
    #ddddgggd#....#g#wwwws##.......
    .####ggggd####g#wwwws##........
    ....#dgggggggg#wwwws#..........
    ....##ggggggg#wwwws#...........
    ...#gggdgggg#wwwws#d#..........
    ...#ggd#ddg#wwwws#gd#..........
    ...#ddd####wwwws#ddd#..........
    ....###..#wwwws#.###...........
    ........#wwwws#................
    .......#wwwws##................
    .....##wwwws##.................
    ....#wwwwws#...................
    ...#wwwwws#....................
    ...#wwwws#.....................
    ...#swwws#.....................
    ....#sss#......................
    .....###.......................
  ` },
  arena: { art: `
    ###########.........############
    ccccccccccc#########cccccccccccc
    cttttttttttcnnnnnnnctttttttttttt
    ctttttttttttnnnnnnntttttttttttt#
    cttttttttttttnnnnnttttttttttttt#
    #cttttttttttttnnnttttttttttttt#.
    #cttttttttttttnnnttttttttttttt#.
    .#############################..
    .##############################.
    .#cccccccccccccccccccccccccccT#.
    .#cttttttttttttttttttttttttttT#.
    .#cttttttttttttttttttttttttttT#.
    .#cttttttttttttttttttttttttttT#.
    .#ctttt#tt#tt#tttt#tt#tt#ttttT#.
    .#cttttt#t#t#tttttt#t#t#tttttT#.
    .#ctttttt###tttttttt###ttttttT#.
    .#ctttt#######tttt#######ttttT#.
    .#ctttttt###tttttttt###ttttttT#.
    .#cttttt#t#t#tttttt#t#t#tttttT#.
    .#ctttt#tt#tt#tttt#tt#tt#ttttT#.
    .#cttttttttttttttttttttttttttT#.
    .#cttttttttttttttttttttttttttT#.
    .#cttttttttttttttttttttttttttT#.
    .#cttttttttttttttttttttttttttT#.
    .#TTTTTTTTTTTTTTTTTTTTTTTTTTTT#.
    ..############################..
  ` },
  'lok-computer': { art: `
    ..##########################..
    .#vvvvvvvvvvvvvvvvvvvvvvvvvV#.
    .#vvvvvvvvvvvvvvvvvvvvvvvvvV#.
    .#vvU####################UvV#.
    .#vv#NNNNNNNNNNNNNNNNNNNN#vV#.
    .#vv#NNNNNNNNNNNNNNNNNNNN#vV#.
    .#vv#NNNNNNNNNNNNNNNNNNNN#vV#.
    .#vv#NNNNNNNNNNNNNNNNNNNN#vV#.
    .#vv#NNNNNNNNNNNNNNNNNNNN#vV#.
    .#vv#NNNNNNNNNNNNNNNNNNNN#vV#.
    .#vv#NNNNNNNNNNNNNNNNNNNN#vV#.
    .#vv#NNNNNNNNNNNNNNNNNNNN#vV#.
    .#vv#NNNNNNNNNNNNNNNNNNNN#vV#.
    .#vv#NNNNNNNNNNNNNNNNNNNN#vV#.
    .#vv#NNNNNNNNNNNNNNNNNNNN#vV#.
    .#vv#NNNNNNNNNNNNNNNNNNNN#vV#.
    .#vv#NNNNNNNNNNNNNNNNNNNN#vV#.
    .#vv#NNNNNNNNNNNNNNNNNNNN#vV#.
    .#vvU####################UvV#.
    .#vvvvvvvvvvvvvvvvvvvvvvvvvV#.
    .#VVVVVVVVVVVVVVVVVVVVVVVVVV#.
    ..##########################..
    ....#UUUUUUUUUUUUUUUUUUUU#....
    ##############################
    #vvvvvvvvvvvvvvvvvvvvvvvvvvvV#
    #vvvvvvvvvvvvvvvvvvvvvvvvvvvV#
    #vvvvvvvvvvvvvvvvvv########vV#
    #vvvvvvvvvvvvvvvvvvvvvvvvvvvV#
    #vvvvvvvvvvvvvvvvvvvvvvvvvvvV#
    #vvvvvvvvvvvvvvvvvvvvvvvvvvvV#
    #VVVVVVVVVVVVVVVVVVVVVVVVVVVV#
    ##############################
  `, vector: LOK_SCREEN },
  weather2: { art: `
    ..........o....................
    ..........o....................
    ..........o....................
    ...o......##......o............
    ....o..###ZZ###..o.............
    ......#ZZZyyZZZ#...............
    .....#ZyyyyyyyyZ#..............
    ....#ZyyyyyyyyyyZ#.............
    ....#ZyyyyyyyyyyY#.............
    ....#ZyyyyyyyyyyY#.............
    ...#ZyyyyyyyyyyyyZ#............
    ooo#Zyyyyyyyyyyy#####o.........
    ....#Zyyyyyyyy##hhhhs##........
    ....#Zyyyyyyy#hhhhhhhhs#.......
    ....#Zyyyyyy#hhhhhhhhhhs#......
    .....#Zyyyyy#hhhhhhhhhhs#......
    ......#ZYYy#hhhhhhhhhhhhs#.....
    ....o..####hhhhhhhhhhhhhs###...
    ...o....#hhhhhhhhhhhhhhhhhhs#..
    .......#hhhhhhhhhhhhhhhhhhhhs#.
    ......#hhhhhhhhhhhhhhhhhhhhhhs#
    ......#hhhhhhhhhhhhhhhhhhhhhhs#
    ......#hhhhhhhhhhhhhhhhhhhhhhs#
    ......#shhhhhhhhhhhhhhhhhhhhhs#
    .......#shhhhhhhhhhhhhhhhhhhs#.
    ........#hhhhhhhhhhhhhhhhhhhs#.
    ........#ssssssssssssssssssss#.
    .........####################..
  ` },
  bsky: { art: `
    ..###......................###..
    .#qqQ##..................##qqQ#.
    #qqqqqQ#................#qqqqqQ#
    #qqqqqqQ#..............#qqqqqqQ#
    #qqqqqqqQ#............#qqqqqqqQ#
    #qqqqqqqqQ#..........#qqqqqqqqQ#
    #qqqqqqqqqQ#........#qqqqqqqqqQ#
    #qqqqqqqqqqQ#......#qqqqqqqqqqQ#
    #qqqqqqqqqqqQ#....#qqqqqqqqqqqQ#
    #QqqqqqqqqqqqQ#..#qqqqqqqqqqqqQ#
    .#qqqqqqqqqqqQ#..#qqqqqqqqqqqQ#.
    .#qqqqqqqqqqqqQ##qqqqqqqqqqqqQ#.
    .#qqqqqqqqqqqqqqqqqqqqqqqqqqqQ#.
    .#QqqqqqqqqqqqqqqqqqqqqqqqqqqQ#.
    ..#QqqqqqqqqqqqqqqqqqqqqqqqqQ#..
    ...#QQqqqqqqqqqqqqqqqqqqqqQQ#...
    ....##QQqqqqqqqqqqqqqqqqQQ##....
    ......##qqqqqqqqqqqqqqqQ##......
    .....#qqqqqqqqqqqqqqqqqqqQ#.....
    ....#qqqqqqqqqqqqqqqqqqqqqQ#....
    ...#qqqqqqqqqqqqqqqqqqqqqqqQ#...
    ...#QqqqqqqqqqqQQqqqqqqqqqqQ#...
    ....#qqqqqqqqqQ##qqqqqqqqqQ#....
    ....#QqqqqqqqqQ##QqqqqqqqqQ#....
    .....#QqqqqqqQ#..#QqqqqqqQ#.....
    ......#QQqqqQ#....#QqqqQQ#......
    .......##QQQ#......#QQQ##.......
    .........###........###.........
  ` },
  globe: { art: `
    .............####.............
    ..........###llll###..........
    ........##lllbbbblll##........
    ......##llbbbbbbbbbbll##......
    .....#eeeeeeebbbbbbbebll#.....
    ....#eeeeeeeeebbbbbeeebbE#....
    ...#eeeeeeeeeeebbbeeeeeeeE#...
    ...#eeeeeeeeeeebbbbeeeeeeE#...
    ..#eeeeeeeeeeebbbbbbebbeeel#..
    ..#eeeeeeeeeebbbbbbbbbbbebB#..
    .#leeeeeeeeebbbbbbbbbeeebbbl#.
    .#lbeeeeeeebbbbbbbbeeeeeeebB#.
    .#lbbeeeeeebbbbbbbbeeeeeeebB#.
    #lbbbbbeeeebebbbbbbeeeeeeebbl#
    #lbbbbbbeebeeebbbbbeeeeeeebbB#
    #lbbbbbbbbbbebbbbbbeeeeeeeebB#
    #lbbbbbbbbeeeeebbbbeeeeeeeebB#
    .#lbbbbbbbeeeeebbbbbeeeeeeeB#.
    .#lbbbbbbeeeeeeebbbeeeeeeeeB#.
    .#lbbbbbbbeeeeebbbbeeeeeebbB#.
    ..#lbbbbbbeeeeebbbbeeeeebbB#..
    ..#lbbbbbbbeeeebbbbbeeebbbB#..
    ...#lbbbbbbeeeebbbbbeebbbB#...
    ...#lbbbbbbeeeebbbbbeebbbB#...
    ....#lbbbbbbeebbbbbbbbbbB#....
    .....#lBbbbbeeebbbbbbbBB#.....
    ......##lBbbbbbbbbbbBB##......
    ........##lBBbbbbBBB##........
    ..........###lBBB###..........
    .............####.............
  ` },
  webpage: { art: `
    .##############################.
    #wwwwwwwwwwwwwwwwwwwwwwwwwwwwww#
    #ssrrsyyseessssssssssssssssssss#
    #ssrrsyyseessssssssssssssssssss#
    ################################
    #hhhhhhhhhhhhhhhhhhhhhhhhhhhhhs#
    #hh##########################hs#
    #hh#wggggggggwwwwwwwwwwwwwww#hs#
    #hh#wwwwwwwwwwwwwwwwwwwwwwww#hs#
    #hh##########################hs#
    #hhhhhhhhhhhhhhhhhhhhhhhhhhhhhs#
    #hh###########hhhhhhhhhhhhhhhhs#
    #hh#lllllllll#hhbbbbbbbbbbbbhhs#
    #hh#lllllllll#hhhhhhhhhhhhhhhhs#
    #hh#lllllllll#hhgggggggggghhhhs#
    #hh#lllllllll#hhhhhhhhhhhhhhhhs#
    #hh#lllllllll#hhgggggggggggghhs#
    #hh#lllllllll#hhhhhhhhhhhhhhhhs#
    #hh#bbbbbbbbb#hhgggggggghhhhhhs#
    #hh#bbbbbbbbb#hhhhhhhhhhhhhhhhs#
    #hh#bbbbbbbbb#hhggggggggggghhhs#
    #hh###########hhhhhhhhhhhhhhhhs#
    #hhhhhhhhhhhhhhhhhhhhhhhhhhhhhs#
    #hhhhhhhhhhhhhhhhhhhhhhhhhhhhhs#
    #ssssssssssssssssssssssssssssss#
    .##############################.
  ` },
  robot: { art: `
    ..............##..............
    .............#ll#.............
    ............#lbbl#............
    ...........#lbbbbl#...........
    ...........#lbbbbB#...........
    ............#lbbB#............
    .............#dd#.............
    .............#dd#.............
    ......########dd########......
    .....#wwwwwwwwsswwwwwwww#.....
    ....#wssssssssssssssssssw#....
    ...#wssssssssssssssssssssw#...
    ...#wssssssssssssssssssssg#...
    .###wsss#####ssss#####sssg###.
    #lllssss#lll#ssss#lll#sssslll#
    #lbbssss#bbb#ssss#bbb#ssssbbB#
    #lbbssss#bbb#ssss#bbb#ssssbbB#
    #lbbssss#bbb#ssss#bbb#ssssbbB#
    #lbbssss#bbb#ssss#bbb#ssssbbB#
    #lbbssss#####ssss#####ssssbbB#
    #lbbssssssssssssssssssssssbbB#
    #lBBssssssssssssssssssssssBBB#
    .###wssssssssssssssssssssg###.
    ...#wsssss##########sssssg#...
    ...#wssssssssssssssssssssg#...
    ...#wssssssssssssssssssssg#...
    ....#wssssssssssssssssssg#....
    .....#wggggggggggggggggg#.....
    ......##################......
  ` },
  mail: { art: `
    .....................#########.
    ....................#RRrrrrrrr#
    ....................#RRrrrrrrr#
    ....................#RRrrrrrrr#
    ....................#RRrrrrrrr#
    ....................#RRRRRRRRR#
    .....################RR#######.
    ....#lllllllllllllll#RR##......
    ...#lbb#bbbbbbbbbbbb#RR#l#.....
    ..BBBBB#bbbbbbbbbbbb#RR#bl#....
    .#BBBBB#bbbbbbbbbbbb#RR#bbl#...
    #lBBBBB#bbbbbbbbbbbb#RR#bbbl#..
    #lBkkBB#bbbbbbbbbbbb#RR#bbbB#..
    #lBkkBB#bbbbbbbbbbbbb##bbbbB#..
    #lBBBBB#bbbbbbbbbbbbbbbbbbbB#..
    #lBBBBB#bbbbbbbbbbbbbbbbbbbB#..
    #lBBBBB#bbbbbbbbbbbbbbbbbbbB#..
    #lBBBBB#bbbbbbbbbbbbbbbbbbbB#..
    #lBBBBB#bbbbbbbbbbbbbbbbbbbB#..
    #lBBBBB#bbbbbbbbbbbbbbbbbbbB#..
    #lBBBBB#BBBBBBBBBBBBBBBBBBBB#..
    .###########################...
    ............#nnnm#.............
    ............#nnnm#.............
    ............#nnnm#.............
    ............#nnnm#.............
    ............#nnnm#.............
    ............#nnnm#.............
    ............#nnnm#.............
    ............#nnnm#.............
    .............####..............
  ` },
  fedi: { art: `
    .............##.................
    .........####ff##...............
    ........#fff#ffff####...........
    ........#Ffffffffffff##.........
    .......#FFFffffffffffff##.......
    .....##FFFFffffffffffffff##.....
    ....#FFFFFfffffffffffffffff##...
    ...#FFFFFFfffffffffffffffffff#..
    ...#FFFFFFffffffffffffffffffff#.
    ..#FFFFFWWWWWffffffWWWWWffffff#.
    ..#FFFWWWWWWWWWWWWWWWWWWWWffff#.
    .#FFFWWWWWWWWWWWWWWWWWWWWWWfff#.
    .#FFWWMMMMMMWWWWWWWWMMMMMMWWff#.
    .#FFWMMMMMMMMWWWWWWMMMMMMMMWff#.
    .#FFAAMMMxxxMMWWWWMMxxxMMMMMff#.
    .#FFAAMMxMMMxMWWWWMxMMMxMMMMff#.
    .#FFAAMMMMMMMMWWWWMMMMMMMMMMff#.
    .#FFWAAMMMMMMWxxxxWMMMMMMMMWfff#
    #FFFSSWWWWWWWWWxxWWWWWWWWWWWfff#
    #FFFSSSWWWWWWWWWWWWWWWWWWWWWfff#
    #FFFFSSSWWWWWxWxxWxWWWWWWWWffff#
    #FFFFSSSSSWWWWxWWxWWWWWWWSSfffF#
    .#FFFFSSSSSSSWWWWWWWWSSSSSffFFF#
    .#FFFFFFSSSSSSWWWWWSSSSSFFFFFF#.
    ..#FFFFFFFFSSSSSSSSSSFFFFFFFF#..
    ...###FFFFFFFFFFFFFFFFFFFF###...
    ......###FFFFFFFFFFFFFF###......
    .........###FFFFFFFF###.........
    ............########............
  ` },
  shelf: { art: `
    ..############################..
    .#nnnnnnnnnnnnnnnnnnnnnnnnnnnn#.
    #n############################n#
    #n#mmmmmmmm####mmmmmmmmmmmmmm#n#
    #n#mmm####m#eee#mmmmmmmmmmmmm#n#
    #n#mmm#bbb##eee#####mmmmmmmmm#n#
    #n#####bbb##hh###lll#mmmmmmmm#n#
    #n##rr#hh###ee#o#ll###mmmm##m#n#
    #n##rr#bb#y#ee#o#ww#rrmmmm#m##n#
    #n##hh#bb#y#ee#h#ll#rrmmmm#bm#n#
    #n##rr#bb#w#ee#o#ll#hhmmm#bbm#n#
    #n##rr#bb#y#ee#o#ll#rrmmm#bbm#n#
    #n##rr#bb#y#ee#o#ll#rrmmm#bb##n#
    #n##rr#bb#y#ee#o#ll#rrmmm#bb##n#
    #n##rr#bb#y#ee#o#ll#rrmm#bbm##n#
    #n##rr#bb#y#ee#o#ll#rrmm#bbm##n#
    #n##rr#bb#y#ee#o#ll#rrmm#bbm##n#
    #n##rr#bb#y#ee#o#ll#rrmm#bb#m#n#
    #n##rr#bb#y#ee#o#ll#rrm#bbb#m#n#
    #n##rr#bb#y#ee#o#ll#rrm#bbm#m#n#
    #n##rr#bb#y#ee#o#ll#rrm#bbm#m#n#
    #n##hh#hh#w#hh#h#ww#hhm#bbm#m#n#
    #n##rr#bb#y#ee#o#ll#rr#bbb#mm#n#
    #n##rr#bb#y#ee#o#ll#rr#bbb#mm#n#
    #n##rr#bb#y#ee#o#ll#rr#mmm#mm#n#
    #n############################n#
    #nTTTTTTTTTTTTTTTTTTTTTTTTTTTnn#
    .##############################.
    ..############################..
  ` },
  note: { art: `
    ....###################......
    ...#wwwwwwwwwwwwwwwwwws#.....
    .######wwwwwwwwwwwwwwws#.....
    #ggggg#wwwwwwwwwwwwwwws##....
    .######wwwwwwwwwwwwwwws#k#...
    ...#wwwwwwwwwwwwwwwwwws#kk##.
    .######llllllllllllllw#kkkkk#
    #ggggg#wwwwwwwwwwwwww#lkkkkk#
    .######wwwwwwwwwwwwww#lbbkk#.
    ...#wwwlllllllllllll#llbbB#..
    .######wwwwwwwwwwww#llbbBB#..
    #ggggg#wwwwwwwwwww#llbbBB#...
    .######lllllllllll#lbbbB#....
    ...#wwwwwwwwwwwww#llbbBB#....
    .######wwwwwwwww#llbbBB#.....
    #ggggg#lllllllll#lbbBB##.....
    .######wwwwwwww#llbbB#s#.....
    ...#wwwwwwwwww#llbbBB#s#.....
    .######llllll#llbbBB#ws#.....
    #ggggg#wwwwww#lbbbB#wws#.....
    .######wwwww#llbbBB#wws#.....
    ...#wwwllll#clbbBB#llws#.....
    .######wwww#cccBB#wwwws#.....
    #ggggg#wwww#cccc#wwwwws#.....
    .######llll#ccc#lllllws#.....
    ...#wwwwwww####wwwwwwws#.....
    ...#wwwwww###wwwwwwwwws#.....
    ...#wwwwwww#wwwwwwwwwws#.....
    ...#sssssssssssssssssss#.....
    ....###################......
  ` },
  clock: { art: `
    ............####............
    .........##########.........
    .......##hhhhhkhhhh##.......
    .....##hhhwwwwkwwwwww##.....
    ....##hhkwwwwwwwwwwkww##....
    ...##hhwwwwwwwwwwwwwwww##...
    ...#hhwwwwwwwwwwwwwwwwww#...
    ..#hhwwwwwwwwwwwwwwwwwwss#..
    ..#hkwwwwwwwwwwwwwwwwwwks#..
    .#hhwwwwwwwwwwwwwwwww#wwss#.
    .#hwwwww##wwwwwwwww###wwws#.
    .#hwwwwww##wwwwwww###wwwws#.
    ##hwwwwwww###www###wwwwwws##
    ##hwwwwwwwww#rr###wwwwwwws##
    ##kkwwwwwwwwwrr#wwwwwwwwkk##
    ##hwwwwwwwwwwrwwwwwwwwwwws##
    .#hwwwwwwwwwrwwwwwwwwwwwws#.
    .#hwwwwwwwwwrwwwwwwwwwwwws#.
    .#hwwwwwwwwrwwwwwwwwwwwwss#.
    ..#wkwwwwwwrwwwwwwwwwwwks#..
    ..#wwwwwwwrwwwwwwwwwwwwss#..
    ...#wwwwwrwwwwwwwwwwwwss#...
    ...##wwwwrwwwwwwwwwwwss##...
    ....##wskwwwwwwwwwwkss##....
    .....##ssswwwwkwwwsss##.....
    .......##ssssskssss##.......
    .........##########.........
    ............####............
  ` },
  calculator: { art: `
    .######################.
    #gggggggggggggggggggggd#
    #gggggggggggggggggggggd#
    #gg##################gd#
    #gg#ccccccckkkckkkcc#gd#
    #gg#ccccccckckckckcc#gd#
    #gg#ccccccckckckckcc#gd#
    #gg#ccccccckkkckkkcc#gd#
    #gg##################gd#
    #gggggggggggggggggggggd#
    #gggggggggggggggggggggd#
    #ggwwwsgwwwsgwwwsglllbd#
    #ggwwwsgwwwsgwwwsglllbd#
    #ggsss#gsss#gsss#gbbb#d#
    #gggggggggggggggggggggd#
    #gggggggggggggggggggggd#
    #ggwwwsgwwwsgwwwsglllbd#
    #ggwwwsgwwwsgwwwsglllbd#
    #ggsss#gsss#gsss#gbbb#d#
    #gggggggggggggggggggggd#
    #gggggggggggggggggggggd#
    #ggwwwsgwwwsgwwwsglllbd#
    #ggwwwsgwwwsgwwwsglllbd#
    #ggsss#gsss#gsss#gbbb#d#
    #gggggggggggggggggggggd#
    #gggggggggggggggggggggd#
    #ggwwwsgwwwsgwwwsgoooOd#
    #ggwwwsgwwwsgwwwsgoooOd#
    #ddsss#dsss#dsss#dOOO#d#
    .######################.
  ` },
  dice: { art: `
    .............##############.
    ............#rrrrrrrrrrrrrr#
    ............#rrrrrrrrrrrrrR#
    ............#rr##rrrrrrrrrR#
    ............#rr##rrrrrrrrrR#
    ............#rrrrrrrrrrrrrR#
    ............#rrrrrrrrrrrrrR#
    ............#rrrrrr##rrrrrR#
    ............#rrrrrr##rrrrrR#
    ............#rrrrrrrrrrrrrR#
    .################.rrrrrrrrR#
    #wwwwwwwwwwwwwwww#rrrrr##rR#
    #wwwwwwwwwwwwwwws#rrrrr##rR#
    #ww##wwwwww##wwws#rrrrrrrrR#
    #ww##wwwwww##wwws#RRRRRRRRR#
    #wwwwwwwwwwwwwwws##########.
    #wwwwwwwwwwwwwwws#..........
    #wwwwww##wwwwwwws#..........
    #wwwwww##wwwwwwws#..........
    #wwwwwwwwwwwwwwws#..........
    #wwwwwwwwwwwwwwws#..........
    #ww##wwwwww##wwws#..........
    #ww##wwwwww##wwws#..........
    #wwwwwwwwwwwwwwws#..........
    #wwwwwwwwwwwwwwws#..........
    #wwwwwwwwwwwwwwws#..........
    #wsssssssssssssss#..........
    .################...........
  ` },
};
// </art>

const hexToRgba = (hex) => (hex === null
  ? [0, 0, 0, 0]
  : [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16), 255]);

/** Parses a template block into rows, ignoring blank lines and indentation. */
const rows = (block) => block.split('\n').map((line) => line.trim()).filter(Boolean);

const vectorOf = (icon) => (Array.isArray(icon) ? undefined : icon.vector);

/** Composes an icon's layers into a CANVAS×CANVAS grid of palette keys. */
const compose = (name, icon) => {
  const grid = Array.from({ length: CANVAS }, () => Array(CANVAS).fill('.'));
  const layers = Array.isArray(icon) ? icon : [icon];
  for (const [index, layer] of layers.entries()) {
    const art = rows(layer.art);
    const width = art[0].length;
    for (const [y, row] of art.entries()) {
      if (row.length !== width) throw new Error(`${name}[${index}] row ${y} is ${row.length} wide, expected ${width}`);
      for (const char of row) {
        if (!(char in PALETTE)) throw new Error(`${name}[${index}] row ${y} uses unknown color "${char}"`);
      }
    }
    // Layers without x/y are centered; x/y are canvas coordinates.
    const x0 = layer.x ?? Math.floor((CANVAS - width) / 2);
    const y0 = layer.y ?? Math.floor((CANVAS - art.length) / 2);
    if (x0 < 0 || y0 < 0 || x0 + width > CANVAS || y0 + art.length > CANVAS) {
      throw new Error(`${name}[${index}] does not fit the ${CANVAS}px canvas`);
    }
    for (const [y, row] of art.entries()) {
      for (const [x, char] of [...row].entries()) {
        if (char !== '.') grid[y0 + y][x0 + x] = char;
      }
    }
  }
  return grid;
};

const BEZIER_STEPS = 16;
const SUPERSAMPLE = 8;

/** Parses SVG path data (M, L, H, V, C, Z; absolute or relative) into polygons. */
const parsePath = (d) => {
  const tokens = d.match(/[MLHVCZ]|-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi);
  const polygons = [];
  let polygon = null;
  let command = null;
  let x = 0;
  let y = 0;
  let index = 0;
  const number = () => Number(tokens[index++]);
  while (index < tokens.length) {
    if (/[a-z]/i.test(tokens[index])) command = tokens[index++];
    else if (!command || /z/i.test(command)) throw new Error(`Unexpected number in path: ${tokens[index]}`);
    const relative = command === command.toLowerCase();
    const ox = relative ? x : 0;
    const oy = relative ? y : 0;
    switch (command.toUpperCase()) {
      case 'M':
        x = ox + number();
        y = oy + number();
        polygon = [[x, y]];
        polygons.push(polygon);
        command = relative ? 'l' : 'L'; // further pairs are line-tos
        break;
      case 'L':
        x = ox + number();
        y = oy + number();
        polygon.push([x, y]);
        break;
      case 'H':
        x = ox + number();
        polygon.push([x, y]);
        break;
      case 'V':
        y = oy + number();
        polygon.push([x, y]);
        break;
      case 'C': {
        const [x0, y0] = [x, y];
        const [x1, y1, x2, y2] = [ox + number(), oy + number(), ox + number(), oy + number()];
        x = ox + number();
        y = oy + number();
        for (let step = 1; step <= BEZIER_STEPS; step += 1) {
          const t = step / BEZIER_STEPS;
          const u = 1 - t;
          polygon.push([
            u * u * u * x0 + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x,
            u * u * u * y0 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y,
          ]);
        }
        break;
      }
      case 'Z': // polygons close implicitly
        [x, y] = polygon[0];
        break;
      default:
        throw new Error(`Unsupported path command "${command}"`);
    }
  }
  return polygons;
};

/** Paints a vector layer into rasterized pixels (see LOK_SCREEN). */
const paintVector = (pixels, size, scale, vector) => {
  const [left, top, width, height] = vector.rect.map((cells) => cells * scale);
  const [vx, vy, vw, vh] = vector.viewBox;
  const k = Math.min(width / vw, height / vh);
  const offsetX = left + (width - vw * k) / 2;
  const offsetY = top + (height - vh * k) / 2;
  const background = hexToRgba(vector.background);
  for (let y = top; y < top + height; y += 1) {
    for (let x = left; x < left + width; x += 1) pixels[y * size + x] = background;
  }

  for (const path of vector.paths) {
    const edges = parsePath(path.d).flatMap((polygon) => polygon.map((point, i) => {
      const next = polygon[(i + 1) % polygon.length];
      return [point, next].flatMap(([px, py]) => [offsetX + (px - vx) * k, offsetY + (py - vy) * k]);
    }));
    const hits = new Uint16Array(width * height);
    for (let row = 0; row < height * SUPERSAMPLE; row += 1) {
      const sy = top + (row + 0.5) / SUPERSAMPLE;
      const crossings = [];
      for (const [x1, y1, x2, y2] of edges) {
        if ((sy >= y1 && sy < y2) || (sy >= y2 && sy < y1)) {
          crossings.push([x1 + ((sy - y1) * (x2 - x1)) / (y2 - y1), y2 > y1 ? 1 : -1]);
        }
      }
      crossings.sort((a, b) => a[0] - b[0]);
      let winding = 0;
      for (let c = 0; c < crossings.length - 1; c += 1) {
        winding += crossings[c][1];
        if (winding === 0) continue;
        // Sample columns whose centres fall inside [start, end).
        const from = Math.max(0, Math.ceil((crossings[c][0] - left) * SUPERSAMPLE - 0.5));
        const to = Math.min(width * SUPERSAMPLE, Math.ceil((crossings[c + 1][0] - left) * SUPERSAMPLE - 0.5));
        const base = Math.floor(row / SUPERSAMPLE) * width;
        for (let column = from; column < to; column += 1) hits[base + Math.floor(column / SUPERSAMPLE)] += 1;
      }
    }
    const color = hexToRgba(path.fill);
    hits.forEach((count, i) => {
      if (count === 0) return;
      const alpha = count / (SUPERSAMPLE * SUPERSAMPLE);
      const index = (top + Math.floor(i / width)) * size + left + (i % width);
      const under = pixels[index];
      pixels[index] = [0, 1, 2].map((channel) => Math.round(under[channel] * (1 - alpha) + color[channel] * alpha)).concat(255);
    });
  }
};

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

const crc32 = (buffer) => {
  let c = 0xffffffff;
  for (const byte of buffer) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

const chunk = (type, data) => {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
};

/** Packs rows (one Uint8Array each), using the Up filter for repeated rows. */
const packRows = (rows) => {
  const stride = rows[0].length + 1;
  const raw = Buffer.alloc(rows.length * stride);
  rows.forEach((row, y) => {
    // Upscaled rows repeat; the Up filter turns a repeat into zeros.
    const repeats = y > 0 && row.every((value, x) => value === rows[y - 1][x]);
    raw[y * stride] = repeats ? 2 : 0;
    if (!repeats) Buffer.from(row).copy(raw, y * stride + 1);
  });
  return deflateSync(raw, { level: 9 });
};

/** Encodes RGBA pixels (array of [r,g,b,a]) as an indexed PNG, or RGBA past 256 colors. */
const encodePng = (width, height, pixels) => {
  const colors = new Map();
  const indices = new Uint8Array(width * height);
  pixels.forEach((rgba, i) => {
    const key = rgba.join(',');
    if (!colors.has(key)) colors.set(key, colors.size);
    indices[i] = colors.get(key) & 0xff;
  });
  const indexed = colors.size <= 256;
  const palette = [...colors.keys()].map((key) => key.split(',').map(Number));
  const rows = Array.from({ length: height }, (_, y) => (indexed
    ? indices.subarray(y * width, (y + 1) * width)
    : Uint8Array.from(pixels.slice(y * width, (y + 1) * width).flat())));

  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // bit depth
  header[9] = indexed ? 3 : 6; // indexed or RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    ...(indexed ? [
      chunk('PLTE', Buffer.from(palette.flatMap(([r, g, b]) => [r, g, b]))),
      chunk('tRNS', Buffer.from(palette.map(([, , , a]) => a))),
    ] : []),
    chunk('IDAT', packRows(rows)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
};

const rasterize = (grid, scale, vector) => {
  const size = CANVAS * scale;
  const pixels = new Array(size * size);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      pixels[y * size + x] = hexToRgba(PALETTE[grid[Math.floor(y / scale)][Math.floor(x / scale)]]);
    }
  }
  if (vector) paintVector(pixels, size, scale, vector);
  return { size, pixels };
};

/** Contact sheet: each icon at 4×, 2× and 1× on light and dark grounds. */
const renderSheet = (grids) => {
  const scales = [4, 2, 1];
  const grounds = [[232, 232, 228, 255], [38, 38, 38, 255]];
  const cellWidth = CANVAS * scales.reduce((sum, s) => sum + s, 0) + 8 * (scales.length + 1);
  const cellHeight = CANVAS * scales[0] + 16;
  const columns = 4;
  const count = grids.length;
  const width = columns * cellWidth;
  const height = Math.ceil(count / columns) * cellHeight * grounds.length;
  const pixels = Array.from({ length: width * height }, () => [255, 255, 255, 255]);

  grids.forEach(([name, grid], index) => {
    grounds.forEach((ground, groundIndex) => {
      const left = (index % columns) * cellWidth;
      const top = (Math.floor(index / columns) * grounds.length + groundIndex) * cellHeight;
      for (let y = top; y < top + cellHeight; y += 1) {
        for (let x = left; x < left + cellWidth; x += 1) pixels[y * width + x] = ground;
      }
      let cursor = left + 8;
      for (const scale of scales) {
        const offsetY = top + 8 + (CANVAS * scales[0] - CANVAS * scale);
        const icon = rasterize(grid, scale, vectorOf(ART[name]));
        icon.pixels.forEach((color, i) => {
          if (color[3]) pixels[(offsetY + Math.floor(i / icon.size)) * width + cursor + (i % icon.size)] = color;
        });
        cursor += CANVAS * scale + 8;
      }
    });
  });
  return encodePng(width, height, pixels);
};

const parseArgs = (argv) => {
  const options = { out: path.join(ROOT, 'src/assets/icons'), scale: 8, only: null, sheet: null };
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i];
    const value = argv[i + 1];
    if (flag === '--out') options.out = path.resolve(value);
    else if (flag === '--scale') options.scale = Number(value);
    else if (flag === '--only') options.only = new Set(value.split(','));
    else if (flag === '--sheet') options.sheet = path.resolve(value);
    else throw new Error(`Unknown option ${flag}`);
    i += 1;
  }
  if (!Number.isInteger(options.scale) || options.scale < 1) throw new Error('--scale must be a positive integer');
  return options;
};

const main = () => {
  const options = parseArgs(process.argv.slice(2));
  const names = Object.keys(ART).filter((name) => !options.only || options.only.has(name));
  if (options.only) {
    for (const name of options.only) if (!(name in ART)) throw new Error(`Unknown icon "${name}"`);
  }

  mkdirSync(options.out, { recursive: true });
  const grids = names.map((name) => [name, compose(name, ART[name])]);
  for (const [name, grid] of grids) {
    const { size, pixels } = rasterize(grid, options.scale, vectorOf(ART[name]));
    const file = path.join(options.out, `${name}.png`);
    writeFileSync(file, encodePng(size, size, pixels));
    console.log(`${path.relative(ROOT, file)}  ${size}×${size}`);
  }
  if (options.sheet) {
    writeFileSync(options.sheet, renderSheet(grids));
    console.log(`sheet → ${options.sheet}`);
  }
};

main();
