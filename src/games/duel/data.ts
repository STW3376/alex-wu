import type { Rect } from "./geometry";

export const WORLD_W = 980;
export const WORLD_H = 640;

export type WeaponKind = "gun" | "melee";

export type Weapon = {
  key: string;
  name: string;
  kind: WeaponKind;
  damage: number;
  cooldown: number;
  range: number;
  bulletSpeed: number;
  pelletCount: number;
  spreadDeg: number;
  aoeRadius: number;
  aoeDamage: number;
};

export type ShopItem = {
  key: string;
  name: string;
  desc: string;
  cost: number;
};

export type LevelDef = {
  name: string;
  playerSpawn: readonly [number, number];
  enemySpawns: readonly (readonly [number, number])[];
  walls: readonly Rect[];
  enemyHp: number;
  enemySpeed: number;
  enemyShield: number;
  enemyWeaponPool: readonly string[];
};

const gun = (
  key: string,
  name: string,
  damage: number,
  cooldown: number,
  bulletSpeed: number,
  extra?: Partial<Weapon>,
): Weapon => ({
  key,
  name,
  kind: "gun",
  damage,
  cooldown,
  range: 0,
  bulletSpeed,
  pelletCount: 1,
  spreadDeg: 0,
  aoeRadius: 0,
  aoeDamage: 0,
  ...extra,
});

const melee = (
  key: string,
  name: string,
  damage: number,
  cooldown: number,
  range: number,
): Weapon => ({
  key,
  name,
  kind: "melee",
  damage,
  cooldown,
  range,
  bulletSpeed: 0,
  pelletCount: 1,
  spreadDeg: 0,
  aoeRadius: 0,
  aoeDamage: 0,
});

/**
 * Keyed by Weapon.key. The Tkinter file inserts the rocket under
 * "rocket launcher" (with a space) while the purchase handler and every
 * lookup use "rocket_launcher", which raises KeyError after you buy it.
 */
export const WEAPONS: Record<string, Weapon> = {
  pistol: gun("pistol", "Pistol", 12, 0.18, 560),
  rifle: gun("rifle", "Rifle", 9, 0.5, 710),
  shotgun: gun("shotgun", "Shotgun", 20, 0.42, 510, {
    pelletCount: 5,
    spreadDeg: 18,
  }),
  sword: melee("sword", "Sword", 18, 0.28, 72),
  claws: melee("claws", "Claws", 23, 0.33, 58),
  rocket_launcher: gun("rocket_launcher", "RocketLauncher", 50, 0.55, 480.6, {
    aoeRadius: 90,
    aoeDamage: 25,
  }),
  blaster: gun("blaster", "Blaster", 10, 0.16, 600, {
    aoeRadius: 85,
    aoeDamage: 8,
  }),
};

export const SHOP_ITEMS: readonly ShopItem[] = [
  { key: "buy_pistol", name: "Equip: Pistol", desc: "Balanced shots.", cost: 0 },
  {
    key: "buy_rifle",
    name: "Equip: Rifle",
    desc: "Fast fire, lower damage.",
    cost: 250,
  },
  {
    key: "buy_shotgun",
    name: "Equip: Shotgun",
    desc: "Burst pellets with spread.",
    cost: 450,
  },
  {
    key: "buy_sword",
    name: "Equip: Sword",
    desc: "High melee damage, no bullets.",
    cost: 300,
  },
  {
    key: "buy_blaster",
    name: "Equip: Blaster",
    desc: "Explodes on impact for splash damage.",
    cost: 600,
  },
  {
    key: "buy_rocket_launcher",
    name: "equip: Rocket Launcher",
    desc: "big damage!!!!!!111 yay!!11 has splash dmg",
    cost: 1000,
  },
  { key: "hp_up", name: "Max HP +20", desc: "More health capacity.", cost: 220 },
  {
    key: "shield_up",
    name: "Max Shield +15",
    desc: "Shield absorbs hits first.",
    cost: 260,
  },
  {
    key: "speed_up",
    name: "Move Speed +25",
    desc: "Dodge more easily.",
    cost: 280,
  },
  { key: "claws", name: "equip: claws", desc: "a stronger melee", cost: 500 },
  {
    key: "heal",
    name: "Heal to Full",
    desc: "Restore HP and shield.",
    cost: 160,
  },
];

export const LEVELS: readonly LevelDef[] = [
  {
    name: "Level 1: Yard",
    playerSpawn: [160, 320],
    enemySpawns: [[820, 320]],
    walls: [
      { x: 320, y: 90, w: 40, h: 460 },
      { x: 600, y: 90, w: 40, h: 460 },
      { x: 420, y: 260, w: 140, h: 40 },
    ],
    enemyHp: 110,
    enemySpeed: 110,
    enemyShield: 0,
    enemyWeaponPool: ["pistol", "claws"],
  },
  {
    name: "Level 2: Crossfire",
    playerSpawn: [150, 120],
    enemySpawns: [
      [830, 520],
      [820, 120],
    ],
    walls: [
      { x: 220, y: 140, w: 540, h: 36 },
      { x: 220, y: 460, w: 540, h: 36 },
      { x: 460, y: 220, w: 36, h: 200 },
      { x: 140, y: 300, w: 120, h: 36 },
      { x: 720, y: 300, w: 120, h: 36 },
    ],
    enemyHp: 140,
    enemySpeed: 125,
    enemyShield: 10,
    enemyWeaponPool: ["pistol", "blaster", "claws"],
  },
  {
    name: "Level 3: The Box",
    playerSpawn: [140, 320],
    enemySpawns: [
      [840, 320],
      [760, 220],
      [760, 420],
    ],
    walls: [
      { x: 260, y: 140, w: 460, h: 36 },
      { x: 260, y: 460, w: 460, h: 36 },
      { x: 260, y: 140, w: 36, h: 356 },
      { x: 684, y: 140, w: 36, h: 356 },
      { x: 430, y: 300, w: 120, h: 36 },
    ],
    enemyHp: 180,
    enemySpeed: 145,
    enemyShield: 18,
    enemyWeaponPool: ["rifle", "shotgun", "claws", "blaster"],
  },
];

export const BORDER: readonly Rect[] = [
  { x: 0, y: 0, w: WORLD_W, h: 18 },
  { x: 0, y: 0, w: 18, h: WORLD_H },
  { x: 0, y: WORLD_H - 18, w: WORLD_W, h: 18 },
  { x: WORLD_W - 18, y: 0, w: 18, h: WORLD_H },
];

/** Points from Python random.seed(4) in build_map, so the starfield matches. */
export const STARFIELD: readonly (readonly [number, number, number])[] = [
  [241, 310, 1], [738, 405, 1], [158, 92, 1], [20, 411, 2], [939, 296, 1], [227, 532, 2],
  [368, 283, 1], [846, 108, 1], [219, 26, 2], [826, 266, 1], [198, 168, 1], [296, 381, 1],
  [865, 620, 1], [687, 397, 2], [254, 182, 1], [484, 286, 1], [967, 560, 1], [7, 298, 2],
  [721, 319, 2], [199, 423, 1], [613, 295, 1], [462, 165, 1], [312, 265, 1], [83, 47, 1],
  [641, 287, 2], [547, 482, 2], [351, 148, 2], [200, 68, 1], [935, 207, 2], [647, 451, 1],
  [188, 364, 1], [764, 602, 1], [649, 571, 1], [926, 331, 1], [859, 63, 2], [234, 284, 2],
  [630, 243, 1], [339, 181, 1], [470, 26, 1], [365, 84, 1], [752, 334, 1], [330, 295, 1],
  [156, 420, 2], [696, 79, 1], [632, 196, 1], [299, 139, 1], [390, 613, 1], [339, 586, 1],
  [372, 45, 1], [173, 373, 1], [297, 585, 1], [449, 212, 1], [938, 212, 1], [60, 63, 1],
  [754, 172, 2], [693, 153, 2], [41, 559, 1], [596, 255, 1], [36, 125, 2], [299, 419, 2],
  [205, 489, 1], [247, 449, 1], [503, 37, 1], [431, 454, 1], [662, 438, 1], [510, 192, 1],
  [37, 260, 1], [248, 538, 1], [790, 237, 1], [890, 267, 1], [332, 52, 1], [578, 119, 2],
  [412, 41, 1], [396, 95, 1], [215, 586, 1], [344, 303, 2], [482, 322, 1], [540, 220, 2],
  [820, 274, 1], [944, 401, 1], [76, 286, 2], [684, 195, 1], [404, 634, 1], [785, 275, 2],
  [876, 61, 1], [704, 475, 2], [483, 413, 1], [223, 3, 1], [944, 160, 1], [624, 263, 1],
  [405, 390, 1], [563, 54, 1], [165, 622, 1], [838, 575, 1], [937, 539, 1], [27, 80, 1],
  [712, 608, 1], [500, 574, 1], [622, 142, 1], [371, 81, 2], [926, 10, 1], [857, 355, 1],
  [87, 556, 1], [390, 210, 1], [397, 239, 1], [876, 409, 1], [79, 117, 2], [817, 374, 2],
  [444, 425, 2], [795, 454, 1], [643, 200, 2], [309, 490, 1], [121, 571, 1], [380, 166, 1],
  [723, 152, 1], [506, 346, 1], [554, 4, 2], [172, 5, 2], [319, 123, 2], [113, 498, 2],
];
