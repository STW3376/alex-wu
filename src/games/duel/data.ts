import type { Rect } from "./geometry";

export const WORLD_W = 980;
export const WORLD_H = 640;

/** Top-left HUD rows and the boss bar beneath them, in stage pixels. */
export const HUD_INSET_X = 12;
export const HUD_INSET_TOP = 12;
/** Keeps every HUD line clear of the top-right Shop button. */
export const HUD_RIGHT_RESERVE = 112;
export const HUD_STATUS_LINE = 20;
export const HUD_LEVEL_LINE = 16;
export const HUD_TIP_LINE = 16;
export const HUD_ROW_GAP = 6;
export const HUD_BLOCK_BOTTOM =
  HUD_INSET_TOP + HUD_STATUS_LINE + HUD_ROW_GAP + HUD_LEVEL_LINE + HUD_ROW_GAP + HUD_TIP_LINE;
export const BOSS_BAR_GAP = 18;
export const BOSS_BAR_TOP = HUD_BLOCK_BOTTOM + BOSS_BAR_GAP;
export const BOSS_NAME_LINE = 16;
export const BOSS_NAME_GAP = 4;
export const BOSS_BAR_HEIGHT = 18;
export const BOSS_BAR_WIDTH = 520;
export const BOSS_BLOCK_BOTTOM = BOSS_BAR_TOP + BOSS_NAME_LINE + BOSS_NAME_GAP + BOSS_BAR_HEIGHT;
/** Extra pixels so 12px combat text does not sit on the HUD or boss bar. */
export const COMBAT_TEXT_PAD = 12;

/**
 * Optional files. Python reads these from `assets/` next to duel.py.
 * The browser reads the same names from `public/games/duel/assets/`.
 * If a file is missing, drawing falls back the way Tkinter does.
 *
 *   boss15.png
 *   pistol.png
 *   rifle.png
 *   blaster.png
 *   rocket_launcher.png
 *   sword.png
 *   claws.png
 *   music.mp3
 */
export const ASSET_BASE = "/games/duel/assets";

export const WEAPON_SPRITE_FILES: Record<string, string> = {
  pistol: "pistol.png",
  rifle: "rifle.png",
  blaster: "blaster.png",
  rocket_launcher: "rocket_launcher.png",
  sword: "sword.png",
  claws: "claws.png",
};

export const BOSS_SPRITE_FILE = "boss15.png";
export const MUSIC_FILE = "music.mp3";

export const WEAPON_SCALE = 0.12;
export const WEAPON_SCALE_BY_KEY: Record<string, number> = {
  pistol: 1,
  rifle: 0.95,
  blaster: 0.95,
  rocket_launcher: 0.85,
  sword: 0.95,
  claws: 0.95,
};
export const WEAPON_ANGLE_STEP = 6;
export const BOSS_SPRITE_ZOOM = 4;

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
  bossSpawn: readonly [number, number] | null;
  bossHp: number;
  bossSpeed: number;
  bossShield: number;
  bossWeapon: string;
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

export const WEAPONS: Record<string, Weapon> = {
  pistol: gun("pistol", "Pistol", 12, 0.18, 560),
  rifle: gun("rifle", "Rifle", 9, 0.09, 710),
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
  minigun: gun("minigun", "Minigun", 15, 0.03, 1000),
  railcannon: gun("railcannon", "Railcannon", 100, 0.55, 0, {
    aoeRadius: 150,
    aoeDamage: 50,
  }),
  blaster: gun("blaster", "Blaster", 10, 0.16, 600, {
    aoeRadius: 85,
    aoeDamage: 8,
  }),
  chunkier_gun: gun("chunkier_gun", "ChunkierGun", 99, 0.77, 450, {
    aoeRadius: 100,
    aoeDamage: 49,
  }),
  pukeko: gun("pukeko", "Pukeko", 200, 0.66, 490.2),
  landmine: gun("landmine", "Landmine", 500, 0.15, 0),
};

export const SHOP_ITEMS: readonly ShopItem[] = [
  { key: "buy_pistol", name: "Equip: Pistol", desc: "Balanced shots.", cost: 0 },
  { key: "buy_rifle", name: "Equip: Rifle", desc: "Fast fire, lower damage.", cost: 250 },
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
    name: "Equip: Rocket Launcher",
    desc: "Big damage, splash hits.",
    cost: 1000,
  },
  { key: "buy_minigun", name: "Equip: Minigun", desc: "Very fast fire.", cost: 1200 },
  {
    key: "buy_railcannon",
    name: "Equip: Railcannon",
    desc: "IS THAT AN ULTRAKILL REFERENCE",
    cost: 2500,
  },
  { key: "buy_claws", name: "Equip: Claws", desc: "Stronger melee.", cost: 500 },
  {
    key: "buy_landmine",
    name: "Equip: Landmine",
    desc: "Place up to 3 mines. 500 dmg. 15s recharge after explosion.",
    cost: 900,
  },
  { key: "hp_up", name: "Max HP +20", desc: "More health capacity.", cost: 220 },
  {
    key: "shield_up",
    name: "Max Shield +15",
    desc: "Shield absorbs hits first.",
    cost: 260,
  },
  { key: "speed_up", name: "Move Speed +25", desc: "Dodge more easily.", cost: 280 },
  { key: "heal", name: "Heal to Full", desc: "Restore HP and shield.", cost: 160 },
];

export const BOSS_SHOP_ITEMS: readonly ShopItem[] = [
  {
    key: "equip_chunkier_gun",
    name: "Equip: ChunkierGun",
    desc: "Unlocked by beating Level 10 boss.",
    cost: 0,
  },
  {
    key: "equip_pukeko",
    name: "Equip: Pukeko",
    desc: "Unlocked by beating Level 15 boss.",
    cost: 0,
  },
];

export const SANDBOX_WEAPON_CHOICES = [
  "sandbox_custom",
  "pistol",
  "rifle",
  "shotgun",
  "sword",
  "claws",
  "rocket_launcher",
  "minigun",
  "railcannon",
  "blaster",
  "chunkier_gun",
  "pukeko",
  "landmine",
] as const;

const arena = (
  partial: Omit<LevelDef, "bossSpawn" | "bossHp" | "bossSpeed" | "bossShield" | "bossWeapon"> &
    Partial<Pick<LevelDef, "bossSpawn" | "bossHp" | "bossSpeed" | "bossShield" | "bossWeapon">>,
): LevelDef => ({
  bossSpawn: null,
  bossHp: 0,
  bossSpeed: 0,
  bossShield: 0,
  bossWeapon: "rocket_launcher",
  ...partial,
});

export const LEVELS: readonly LevelDef[] = [
  arena({
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
  }),
  arena({
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
    enemyWeaponPool: ["rifle", "claws"],
  }),
  arena({
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
  }),
  arena({
    name: "Level 4: Tube",
    playerSpawn: [140, 320],
    enemySpawns: [
      [840, 320],
      [760, 220],
      [760, 420],
      [900, 320],
    ],
    walls: [
      { x: 200, y: 260, w: 290, h: 40 },
      { x: 490, y: 0, w: 200, h: 300 },
      { x: 200, y: 490, w: 200, h: 150 },
      { x: 400, y: 490, w: 290, h: 40 },
    ],
    enemyHp: 180,
    enemySpeed: 145,
    enemyShield: 18,
    enemyWeaponPool: ["rifle", "shotgun", "claws", "blaster", "minigun", "blaster"],
  }),
  arena({
    name: "Level 5: chunky man",
    playerSpawn: [140, 320],
    enemySpawns: [],
    walls: [],
    enemyHp: 0,
    enemySpeed: 0,
    enemyShield: 0,
    enemyWeaponPool: [],
    bossSpawn: [820, 320],
    bossHp: 2500,
    bossSpeed: 125,
    bossShield: 100,
    bossWeapon: "rocket_launcher",
  }),
  arena({
    name: "Level 6: Zigzag Hall",
    playerSpawn: [140, 320],
    enemySpawns: [
      [860, 120],
      [860, 520],
      [740, 320],
    ],
    walls: [
      { x: 260, y: 80, w: 40, h: 480 },
      { x: 420, y: 0, w: 40, h: 360 },
      { x: 420, y: 440, w: 40, h: 200 },
      { x: 580, y: 80, w: 40, h: 480 },
      { x: 740, y: 0, w: 40, h: 360 },
      { x: 740, y: 440, w: 40, h: 200 },
      { x: 320, y: 280, w: 160, h: 40 },
      { x: 520, y: 320, w: 160, h: 40 },
    ],
    enemyHp: 200,
    enemySpeed: 155,
    enemyShield: 22,
    enemyWeaponPool: ["rifle", "rifle", "shotgun", "claws", "blaster"],
  }),
  arena({
    name: "Level 7: Four Rooms",
    playerSpawn: [140, 200],
    enemySpawns: [
      [840, 120],
      [840, 520],
      [520, 120],
      [520, 520],
    ],
    walls: [
      { x: 460, y: 0, w: 40, h: 260 },
      { x: 460, y: 380, w: 40, h: 260 },
      { x: 0, y: 300, w: 440, h: 40 },
      { x: 540, y: 300, w: 440, h: 40 },
      { x: 220, y: 140, w: 80, h: 40 },
      { x: 680, y: 460, w: 80, h: 40 },
      { x: 680, y: 140, w: 80, h: 40 },
      { x: 220, y: 460, w: 80, h: 40 },
    ],
    enemyHp: 215,
    enemySpeed: 160,
    enemyShield: 26,
    enemyWeaponPool: ["shotgun", "shotgun", "rifle", "claws", "blaster"],
  }),
  arena({
    name: "Level 8: Center Pit",
    playerSpawn: [140, 320],
    enemySpawns: [
      [880, 320],
      [760, 160],
      [760, 480],
      [800, 320],
    ],
    walls: [
      { x: 390, y: 170, w: 200, h: 40 },
      { x: 390, y: 430, w: 200, h: 40 },
      { x: 350, y: 210, w: 40, h: 220 },
      { x: 600, y: 210, w: 40, h: 220 },
      { x: 220, y: 120, w: 60, h: 120 },
      { x: 220, y: 400, w: 60, h: 120 },
      { x: 760, y: 260, w: 60, h: 120 },
    ],
    enemyHp: 235,
    enemySpeed: 170,
    enemyShield: 30,
    enemyWeaponPool: ["minigun", "rifle", "shotgun", "blaster", "claws"],
  }),
  arena({
    name: "Level 9: Long Bridge",
    playerSpawn: [120, 320],
    enemySpawns: [
      [900, 320],
      [760, 320],
      [820, 200],
      [820, 440],
    ],
    walls: [
      { x: 220, y: 180, w: 560, h: 40 },
      { x: 220, y: 420, w: 560, h: 40 },
      { x: 480, y: 220, w: 40, h: 200 },
      { x: 620, y: 220, w: 40, h: 200 },
      { x: 140, y: 260, w: 60, h: 120 },
    ],
    enemyHp: 255,
    enemySpeed: 175,
    enemyShield: 34,
    enemyWeaponPool: ["rifle", "rifle", "minigun", "shotgun", "blaster"],
  }),
  arena({
    name: "Level 10: chunkier man",
    playerSpawn: [140, 320],
    enemySpawns: [],
    walls: [],
    enemyHp: 0,
    enemySpeed: 0,
    enemyShield: 0,
    enemyWeaponPool: [],
    bossSpawn: [820, 320],
    bossHp: 5000,
    bossSpeed: 125,
    bossShield: 200,
    bossWeapon: "chunkier_gun",
  }),
  arena({
    name: "Level 11: The Funnel",
    playerSpawn: [140, 320],
    enemySpawns: [
      [900, 120],
      [900, 520],
      [780, 320],
      [620, 320],
    ],
    walls: [
      { x: 260, y: 80, w: 40, h: 480 },
      { x: 420, y: 120, w: 40, h: 400 },
      { x: 580, y: 160, w: 40, h: 320 },
      { x: 740, y: 200, w: 40, h: 240 },
      { x: 320, y: 260, w: 120, h: 40 },
      { x: 500, y: 340, w: 120, h: 40 },
      { x: 660, y: 260, w: 120, h: 40 },
    ],
    enemyHp: 290,
    enemySpeed: 185,
    enemyShield: 45,
    enemyWeaponPool: ["minigun", "minigun", "rifle", "blaster", "shotgun"],
  }),
  arena({
    name: "Level 12: Offset Lanes",
    playerSpawn: [140, 120],
    enemySpawns: [
      [900, 520],
      [780, 520],
      [900, 200],
      [660, 360],
    ],
    walls: [
      { x: 220, y: 160, w: 700, h: 40 },
      { x: 220, y: 440, w: 700, h: 40 },
      { x: 340, y: 200, w: 40, h: 160 },
      { x: 540, y: 280, w: 40, h: 160 },
      { x: 740, y: 200, w: 40, h: 160 },
      { x: 140, y: 200, w: 80, h: 80 },
    ],
    enemyHp: 305,
    enemySpeed: 190,
    enemyShield: 50,
    enemyWeaponPool: ["rifle", "minigun", "shotgun", "blaster", "claws"],
  }),
  arena({
    name: "Level 13: Checkers",
    playerSpawn: [140, 320],
    enemySpawns: [
      [900, 320],
      [780, 160],
      [780, 480],
      [620, 240],
      [620, 400],
    ],
    walls: [
      { x: 280, y: 120, w: 80, h: 80 },
      { x: 420, y: 240, w: 80, h: 80 },
      { x: 560, y: 120, w: 80, h: 80 },
      { x: 700, y: 240, w: 80, h: 80 },
      { x: 280, y: 360, w: 80, h: 80 },
      { x: 560, y: 360, w: 80, h: 80 },
      { x: 700, y: 440, w: 80, h: 80 },
    ],
    enemyHp: 320,
    enemySpeed: 195,
    enemyShield: 55,
    enemyWeaponPool: ["blaster", "blaster", "minigun", "rifle", "shotgun"],
  }),
  arena({
    name: "Level 14: Spiral",
    playerSpawn: [140, 320],
    enemySpawns: [
      [900, 320],
      [820, 160],
      [820, 480],
      [700, 320],
    ],
    walls: [
      { x: 260, y: 80, w: 520, h: 40 },
      { x: 740, y: 120, w: 40, h: 440 },
      { x: 300, y: 520, w: 480, h: 40 },
      { x: 260, y: 160, w: 40, h: 360 },
      { x: 340, y: 160, w: 360, h: 40 },
      { x: 660, y: 240, w: 40, h: 240 },
      { x: 420, y: 400, w: 240, h: 40 },
      { x: 520, y: 280, w: 80, h: 40 },
    ],
    enemyHp: 340,
    enemySpeed: 205,
    enemyShield: 60,
    enemyWeaponPool: ["minigun", "railcannon", "shotgun", "blaster", "rifle"],
  }),
  arena({
    name: "Level 15: pukeko",
    playerSpawn: [140, 320],
    enemySpawns: [],
    walls: [],
    enemyHp: 0,
    enemySpeed: 0,
    enemyShield: 0,
    enemyWeaponPool: [],
    bossSpawn: [820, 320],
    bossHp: 10000,
    bossSpeed: 125,
    bossShield: 400,
    bossWeapon: "pukeko",
  }),
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

export const KEY_ACTIONS = [
  "move_up",
  "move_left",
  "move_down",
  "move_right",
  "attack",
  "restart",
  "next_level",
  "menu",
] as const;

export type KeyAction = (typeof KEY_ACTIONS)[number];

export const KEY_ACTION_LABELS: Record<KeyAction, string> = {
  move_up: "Move Up",
  move_left: "Move Left",
  move_down: "Move Down",
  move_right: "Move Right",
  attack: "Attack",
  restart: "Restart",
  next_level: "Next Level",
  menu: "Menu / Pause",
};

export const DEFAULT_KEYBINDS: Record<KeyAction, string> = {
  move_up: "w",
  move_left: "a",
  move_down: "s",
  move_right: "d",
  attack: "space",
  restart: "r",
  next_level: "n",
  menu: "escape",
};

const KEY_SPECIALS: Record<string, string> = {
  space: "Space",
  escape: "Esc",
  left: "Left",
  right: "Right",
  up: "Up",
  down: "Down",
  return: "Enter",
  backspace: "Backspace",
  tab: "Tab",
};

export function prettyKey(key: string) {
  return KEY_SPECIALS[key] ?? key.toUpperCase();
}

export function tipText(keybinds: Record<KeyAction, string>) {
  const move = `${prettyKey(keybinds.move_up)}/${prettyKey(keybinds.move_left)}/${prettyKey(keybinds.move_down)}/${prettyKey(keybinds.move_right)}`;
  return (
    `Move: ${move} | ` +
    `Attack: Hold ${prettyKey(keybinds.attack)} | ` +
    `Shop: Button | ` +
    `Next level: ${prettyKey(keybinds.next_level)} | ` +
    `Restart: ${prettyKey(keybinds.restart)} | ` +
    `Main Menu: ${prettyKey(keybinds.menu)}`
  );
}
