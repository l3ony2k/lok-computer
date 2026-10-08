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
 * Usage:
 *   node scripts/pixel-icons.mjs                 # write every icon to src/assets/icons
 *   node scripts/pixel-icons.mjs --only media,folder
 *   node scripts/pixel-icons.mjs --sheet sheet.png   # also write a contact sheet
 *   node scripts/pixel-icons.mjs --out some/dir --scale 8
 *
 * No dependencies: PNGs are encoded with node:zlib. Run it with node so the
 * committed files stay byte-identical; bun draws the same pixels but its
 * deflate output differs, which would churn every PNG in the diff.
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
    ....######################....
    ...#wwwwwwwwwwwwwwwwwwwwww#...
    ..#wwwwwwwwwwwwwwwwwwwwwwws#..
    ..#wwwwwwwwwwwwwwwwwwwwwwws#..
    ..#www##################wws#..
    ..#www#NNNNNNNNNNNNNNNN#wws#..
    ..#www#NNNccccccccccNNN#wws#..
    ..#www#NNNcNNNNNNNNcNNN#wws#..
    ..#www#NNNcNcNNNcNNcNNN#wws#..
    ..#www#NNNcNcNNNcNNcNNN#wws#..
    ..#www#NNNcNcNNNccccNNN#wws#..
    ..#www#NNNcNcNNNNNNcNNN#wws#..
    ..#www#NNNcNccccNNNcNNN#wws#..
    ..#www#NNNcNNNNNNNNcNNN#wws#..
    ..#www#NNNccccccccccNNN#wws#..
    ..#www#NNNNNNNNNNNNNNNN#wws#..
    ..#www##################wws#..
    ..#wwwwwwwwwwwwwwwwwwwwwwws#..
    ..#wwwwwwwwwwwwwwwwwwwwwwws#..
    ..#wwwwwwwwwwwwwwwwwwwwwwws#..
    ...#sssssssssssssssssssssss#..
    ...########################...
    .........#wwwwwwwwws#.........
    .........#wwwwwwwwws#.........
    .############################.
    .#wwwwwwwwwwwwwwwwwwwwwwwwww#.
    #wwwwwwwwwwwwwwwwwwwwwwwwwwws#
    #wwwwwwwwwwwwwwwwwwwwwwwwwwws#
    #wwwwwwwwwwwwwwwww########wws#
    #wwwwwwwwwwwwwwwwwwwwwwwwwwws#
    .#sssssssssssssssssssssssssss#
    ..###########################.
  ` },
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
    .#####....................#####.
    #lllll#..................#lllll#
    #lbbbbl##..............##lbbbbB#
    #lbbbbbll#............#llbbbbbB#
    lbbbbbbbbl#..........#lbbbbbbbbl
    #lbbbbbbbbl#........#lbbbbbbbbB#
    #lbbbbbbbbbl#......#lbbbbbbbbbB#
    #lbbbbbbbbbbl#....#lbbbbbbbbbbB#
    #lbbbbbbbbbbbl#..#lbbbbbbbbbbbB#
    #lbbbbbbbbbbbB#..#lbbbbbbbbbbbB#
    .#lbbbbbbbbbbbl##lbbbbbbbbbbbB#.
    ..#lbbbbbbbbbbB##lbbbbbbbbbbB#..
    ...#lbbbbbbbbbbllbbbbbbbbbbB#...
    ...#lBBbbbbbbbbbbbbbbbbbbBBB#...
    ....###lBbbbbbbbbbbbbbbBB###....
    .......##lbbbbbbbbbbbbB##.......
    ........##lbbbbbbbbbbB##........
    ......##llbbbbbbbbbbbbll##......
    .....#llbbbbbbbbbbbbbbbbll#.....
    ....#lbbbbbbbbbBBbbbbbbbbbl#....
    ....#lbbbbbbbbB##lbbbbbbbbB#....
    ....#lbbbbbbbbB##lbbbbbbbbB#....
    ...#lbbbbbbbbB#..#lbbbbbbbbl#...
    ....#lbbbbbbB#....#lbbbbbbB#....
    .....#lBBBBB#......#lBBBBB#.....
    ......######........######......
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
    ............######............
    .........###ZZZZZZ###.........
    .......##ZZZooooooZZZ##.......
    .....##ZZooooooooooooZZ##.....
    ....#ZZooooooooooooooooZZ#....
    ...#ZooooooooooooooooooooZ#...
    ..#ZooooooooooooooooooooooZ#..
    ..#ZooooooooooooooooooooooO#..
    .#ZoooooooooccccccoooooooooZ#.
    .#ZooooooccccccccccccooooooO#.
    #ZoooooccccccccccccccccoooooZ#
    #ZooooccccccccccccccccccooooO#
    #ZoooccccccccccccccccccccoooO#
    #ZoooccccnnnnccccnnnnccccoooO#
    #Zoonnn###nnnccccnnnn###ncooO#
    #Zoocn#nnn#nnccccnnn#nnn#cooO#
    #ZoocnnnnnnncccccnnnnnnnncooO#
    #ZoocnncccccccccccccccnnncooO#
    #Zoocccccccccc##ccccccccccooO#
    .#Zooccccccccc##cccccccccooO#.
    .#ZooccccccccccccccccccccooO#.
    ..#ZoocccccccnccncccccccooO#..
    ..#ZooocccccccnncccccccoooO#..
    ...#ZooooccccccccccccooooO#...
    ....#ZOoooooccccccoooooOO#....
    .....##ZOooooooooooooOO##.....
    .......##ZOOooooooOOO##.......
    .........###ZOOOOO###.........
    ............######............
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
};
// </art>

const hexToRgba = (hex) => (hex === null
  ? [0, 0, 0, 0]
  : [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16), 255]);

/** Parses a template block into rows, ignoring blank lines and indentation. */
const rows = (block) => block.split('\n').map((line) => line.trim()).filter(Boolean);

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

/** Encodes RGBA pixels (array of [r,g,b,a]) as an indexed PNG. */
const encodePng = (width, height, pixels) => {
  const colors = new Map();
  const indices = new Uint8Array(width * height);
  pixels.forEach((rgba, i) => {
    const key = rgba.join(',');
    if (!colors.has(key)) {
      if (colors.size === 256) throw new Error('More than 256 colors');
      colors.set(key, colors.size);
    }
    indices[i] = colors.get(key);
  });
  const palette = [...colors.keys()].map((key) => key.split(',').map(Number));

  const raw = Buffer.alloc(height * (width + 1));
  for (let y = 0; y < height; y += 1) {
    const row = indices.subarray(y * width, (y + 1) * width);
    const previous = y > 0 ? indices.subarray((y - 1) * width, y * width) : null;
    // Upscaled rows repeat; the Up filter turns a repeat into zeros.
    const repeats = previous && row.every((value, x) => value === previous[x]);
    raw[y * (width + 1)] = repeats ? 2 : 0;
    if (!repeats) Buffer.from(row).copy(raw, y * (width + 1) + 1);
  }

  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // bit depth
  header[9] = 3; // indexed color
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('PLTE', Buffer.from(palette.flatMap(([r, g, b]) => [r, g, b]))),
    chunk('tRNS', Buffer.from(palette.map(([, , , a]) => a))),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
};

const rasterize = (grid, scale) => {
  const size = CANVAS * scale;
  const pixels = new Array(size * size);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      pixels[y * size + x] = hexToRgba(PALETTE[grid[Math.floor(y / scale)][Math.floor(x / scale)]]);
    }
  }
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

  grids.forEach(([, grid], index) => {
    grounds.forEach((ground, groundIndex) => {
      const left = (index % columns) * cellWidth;
      const top = (Math.floor(index / columns) * grounds.length + groundIndex) * cellHeight;
      for (let y = top; y < top + cellHeight; y += 1) {
        for (let x = left; x < left + cellWidth; x += 1) pixels[y * width + x] = ground;
      }
      let cursor = left + 8;
      for (const scale of scales) {
        const offsetY = top + 8 + (CANVAS * scales[0] - CANVAS * scale);
        for (let y = 0; y < CANVAS * scale; y += 1) {
          for (let x = 0; x < CANVAS * scale; x += 1) {
            const color = PALETTE[grid[Math.floor(y / scale)][Math.floor(x / scale)]];
            if (color) pixels[(offsetY + y) * width + cursor + x] = hexToRgba(color);
          }
        }
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
    const { size, pixels } = rasterize(grid, options.scale);
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
