import {
  BORDER,
  BOSS_SHOP_ITEMS,
  BOSS_SPRITE_ZOOM,
  DEFAULT_KEYBINDS,
  KEY_ACTIONS,
  KEY_ACTION_LABELS,
  LEVELS,
  SHOP_ITEMS,
  STARFIELD,
  WEAPON_ANGLE_STEP,
  WEAPON_SCALE,
  WEAPON_SCALE_BY_KEY,
  WEAPONS,
  WORLD_H,
  WORLD_W,
  prettyKey,
  tipText,
  type KeyAction,
  type LevelDef,
  type ShopItem,
  type Weapon,
} from "./data";
import { intersects, norm, type Rect } from "./geometry";

export type Screen = "menu" | "settings" | "sandbox" | "pause" | "game";
export type ShopTab = "shop" | "boss";

export type Fighter = {
  x: number;
  y: number;
  r: number;
  speed: number;
  hp: number;
  maxHp: number;
  shield: number;
  maxShield: number;
  facingX: number;
  facingY: number;
  weaponKey: string;
  nextAttack: number;
  spriteKey: string;
};

type Bullet = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  damage: number;
  fromEnemy: boolean;
  weaponKey: string;
  color: string;
};

type Floater = {
  x: number;
  y: number;
  text: string;
  color: string;
  born: number;
};

type Explosion = {
  x: number;
  y: number;
  radius: number;
  born: number;
  duration: number;
  color: string;
};

type Laser = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  born: number;
  duration: number;
};

type Landmine = {
  x: number;
  y: number;
  r: number;
  damage: number;
};

export type ShopButtonView = {
  key: string;
  name: string;
  desc: string;
  button: string;
  enabled: boolean;
};

export type GameView = {
  screen: Screen;
  hud: string;
  level: string;
  tip: string;
  shopOpen: boolean;
  shopTab: ShopTab;
  shopSubtitle: string;
  shopMoneyLine: string;
  shopItems: ShopButtonView[];
  bossItems: ShopButtonView[];
  bossLocked: string;
  bossBar: { visible: boolean; name: string; frac: number };
  showShopButton: boolean;
  showHud: boolean;
  aimByMouse: boolean;
  showArrow: boolean;
  showWeaponSprites: boolean;
  musicEnabled: boolean;
  keybinds: { action: KeyAction; label: string; keyLabel: string; listening: boolean }[];
  sandbox: {
    playerHp: string;
    playerShield: string;
    playerSpeed: string;
    enemyCount: string;
    enemyHp: string;
    enemyShield: string;
    enemySpeed: string;
    weaponKind: string;
    weaponDamage: string;
    weaponCooldown: string;
    weaponBulletSpeed: string;
    weaponRange: string;
    weaponPellets: string;
    weaponSpread: string;
    weaponAoeRadius: string;
    weaponAoeDamage: string;
    rectX: string;
    rectY: string;
    rectW: string;
    rectH: string;
    enemyWeapons: string[];
    rects: string[];
    selectedRect: number;
  };
};

type EndScreen = {
  title: string;
  subtitle: string;
  color: string;
  extra: string | null;
};

const SPLASH_KEYS = new Set(["blaster", "rocket_launcher"]);
const BLOCKED_REBIND = new Set([
  "caps_lock",
  "shift_l",
  "shift_r",
  "control_l",
  "control_r",
  "alt_l",
  "alt_r",
  "super_l",
  "super_r",
  "option_l",
  "option_r",
]);

const SANDBOX_SPAWNS: readonly (readonly [number, number])[] = [
  [820, 320],
  [760, 180],
  [760, 460],
  [900, 160],
  [900, 480],
  [660, 320],
  [860, 320],
  [620, 160],
];

function cloneWeapons() {
  const copy: Record<string, Weapon> = {};
  for (const [key, weapon] of Object.entries(WEAPONS)) {
    copy[key] = { ...weapon };
  }
  return copy;
}

function nowSec() {
  return performance.now() / 1000;
}

function clampInt(value: string, lo: number, hi: number) {
  const parsed = Number.parseFloat(value);
  const v = Number.isFinite(parsed) ? Math.trunc(parsed) : lo;
  return Math.max(lo, Math.min(hi, v));
}

function clampFloat(value: string, lo: number, hi: number) {
  const parsed = Number.parseFloat(value);
  const v = Number.isFinite(parsed) ? parsed : lo;
  return Math.max(lo, Math.min(hi, v));
}

export class DuelEngine {
  screen: Screen = "menu";
  settingsReturnTo: "menu" | "pause" = "menu";
  sandboxMode = false;
  sandboxRects: Rect[] = [];
  sandboxEnemyLoadout: string[] = [];
  sandboxEnemyCountLast = 0;

  aimByMouse = false;
  showArrow = true;
  showWeaponSprites = true;
  musicEnabled = true;

  mouseX = 0;
  mouseY = 0;

  keybinds: Record<KeyAction, string> = { ...DEFAULT_KEYBINDS };
  private readonly move = {
    move_up: false,
    move_left: false,
    move_down: false,
    move_right: false,
  };
  rebindingAction: KeyAction | null = null;

  sb = {
    playerHp: "400",
    playerShield: "100",
    playerSpeed: "320",
    enemyCount: "3",
    enemyHp: "180",
    enemySpeed: "145",
    enemyShield: "0",
    weaponKind: "gun",
    weaponDamage: "25",
    weaponCooldown: "0.12",
    weaponBulletSpeed: "720",
    weaponRange: "72",
    weaponPellets: "1",
    weaponSpread: "0",
    weaponAoeRadius: "0",
    weaponAoeDamage: "0",
    rectX: "420",
    rectY: "260",
    rectW: "120",
    rectH: "40",
    enemyWeapons: Array.from({ length: 8 }, () => "pistol"),
  };
  selectedRect = -1;

  attackHeld = false;
  obstacles: Rect[] = [];
  private mapWalls: Rect[] = [];
  private bullets: Bullet[] = [];
  enemies: Fighter[] = [];
  boss: Fighter | null = null;
  private floaters: Floater[] = [];
  private explosions: Explosion[] = [];
  private lasers: Laser[] = [];
  private landmines: Landmine[] = [];
  private readonly landmineMaxCharges = 3;
  private landmineCharges = 3;
  private readonly landmineRechargeSeconds = 15;
  private landmineRechargeQueue: number[] = [];

  money = 937830623970;
  levelIndex = 0;
  private owned = new Set<string>(["pistol"]);
  unlockedChunkier = false;
  unlockedPukeko = false;
  gameOver = false;
  win = false;
  shopOpen = false;
  shopTab: ShopTab = "shop";
  private pendingUnlock: string | null = null;
  private end: EndScreen | null = null;

  weapons: Record<string, Weapon> = cloneWeapons();
  readonly levels: readonly LevelDef[] = LEVELS;
  player: Fighter | null = null;

  private hud = "";
  private levelLine = "";
  private worldReady = false;

  private weaponSprites = new Map<string, HTMLImageElement>();
  private bossSprite: HTMLImageElement | null = null;

  setWeaponSprite(key: string, image: HTMLImageElement) {
    this.weaponSprites.set(key, image);
  }

  setBossSprite(image: HTMLImageElement) {
    this.bossSprite = image;
  }

  setMouse(x: number, y: number) {
    this.mouseX = x;
    this.mouseY = y;
  }

  setAimByMouse(on: boolean) {
    this.aimByMouse = on;
  }

  setShowArrow(on: boolean) {
    this.showArrow = on;
  }

  setShowWeaponSprites(on: boolean) {
    this.showWeaponSprites = on;
  }

  setMusicEnabled(on: boolean) {
    this.musicEnabled = on;
  }

  clearMoveKeys() {
    this.move.move_up = false;
    this.move.move_left = false;
    this.move.move_down = false;
    this.move.move_right = false;
    this.attackHeld = false;
  }

  handleKeyDown(key: string, repeat: boolean) {
    if (this.rebindingAction) {
      if (!repeat) {
        this.setKeybind(this.rebindingAction, key);
      }
      return;
    }

    if (key === this.keybinds.menu) {
      if (repeat) {
        return;
      }
      if (this.screen === "game" || this.screen === "pause") {
        this.togglePauseMenu();
      } else if (this.screen === "settings") {
        this.backFromSettings();
      }
      return;
    }

    if (this.screen !== "game") {
      return;
    }

    if (key === this.keybinds.move_up) {
      this.move.move_up = true;
    } else if (key === this.keybinds.move_left) {
      this.move.move_left = true;
    } else if (key === this.keybinds.move_down) {
      this.move.move_down = true;
    } else if (key === this.keybinds.move_right) {
      this.move.move_right = true;
    } else if (key === this.keybinds.attack) {
      this.onAttackPress();
    } else if (key === this.keybinds.restart) {
      if (!repeat) {
        this.restartLevel();
      }
    } else if (key === this.keybinds.next_level) {
      if (!repeat) {
        this.nextLevel();
      }
    }
  }

  handleKeyUp(key: string) {
    if (this.screen !== "game") {
      return;
    }
    if (key === this.keybinds.move_up) {
      this.move.move_up = false;
    } else if (key === this.keybinds.move_left) {
      this.move.move_left = false;
    } else if (key === this.keybinds.move_down) {
      this.move.move_down = false;
    } else if (key === this.keybinds.move_right) {
      this.move.move_right = false;
    } else if (key === this.keybinds.attack) {
      this.attackHeld = false;
    }
  }

  startRebind(action: KeyAction) {
    this.rebindingAction = action;
  }

  setKeybind(action: KeyAction, newKey: string) {
    const key = newKey.toLowerCase();
    if (!key || BLOCKED_REBIND.has(key)) {
      return;
    }
    const current = this.keybinds[action];
    for (const other of KEY_ACTIONS) {
      if (other !== action && this.keybinds[other] === key) {
        this.keybinds[other] = current;
        break;
      }
    }
    this.keybinds[action] = key;
    this.rebindingAction = null;
  }

  startGame() {
    this.sandboxMode = false;
    this.screen = "game";
    this.shopOpen = false;
    this.loadLevel(0, true);
  }

  showSettings(returnTo: "menu" | "pause") {
    this.screen = "settings";
    this.settingsReturnTo = returnTo;
    this.attackHeld = false;
    this.shopOpen = false;
    this.rebindingAction = null;
  }

  showSandboxBuilder() {
    this.screen = "sandbox";
    this.attackHeld = false;
    this.shopOpen = false;
  }

  backFromSettings() {
    if (this.settingsReturnTo === "pause") {
      this.showPauseMenu();
    } else {
      this.showMenu();
    }
  }

  showMenu() {
    this.screen = "menu";
    this.settingsReturnTo = "menu";
    this.shopOpen = false;
    this.attackHeld = false;
  }

  showPauseMenu() {
    if (!this.player) {
      return;
    }
    this.clearMoveKeys();
    this.screen = "pause";
    this.shopOpen = false;
  }

  resumeGame() {
    if (!this.player) {
      return;
    }
    this.screen = "game";
  }

  gotoMainMenuFromGame() {
    this.clearMoveKeys();
    this.shopOpen = false;
    this.showMenu();
  }

  togglePauseMenu() {
    if (this.screen === "game") {
      if (this.shopOpen) {
        this.shopOpen = false;
        return;
      }
      if (!this.gameOver && !this.win) {
        this.showPauseMenu();
      }
    } else if (this.screen === "pause") {
      this.resumeGame();
    } else if (this.screen === "settings") {
      this.backFromSettings();
    }
  }

  toggleShop() {
    if (this.screen !== "game" || this.gameOver || this.win) {
      return;
    }
    this.shopOpen = !this.shopOpen;
    if (this.shopOpen) {
      this.attackHeld = false;
    }
  }

  setShopTab(tab: ShopTab) {
    this.shopTab = tab;
  }

  setSandboxField(field: keyof DuelEngine["sb"], value: string) {
    if (field === "enemyWeapons") {
      return;
    }
    this.sb[field] = value;
  }

  setEnemyWeapon(index: number, value: string) {
    if (index >= 0 && index < this.sb.enemyWeapons.length) {
      this.sb.enemyWeapons[index] = value;
    }
  }

  addSandboxRectangle() {
    let x = clampInt(this.sb.rectX, 20, 900);
    let y = clampInt(this.sb.rectY, 20, 600);
    const w = clampInt(this.sb.rectW, 20, 700);
    const h = clampInt(this.sb.rectH, 20, 500);
    x = Math.min(x, 980 - 20 - w);
    y = Math.min(y, 640 - 20 - h);
    this.sandboxRects.push({ x, y, w, h });
  }

  selectSandboxRect(index: number) {
    this.selectedRect = index;
  }

  removeSandboxRectangle() {
    if (this.selectedRect < 0 || this.selectedRect >= this.sandboxRects.length) {
      return;
    }
    this.sandboxRects.splice(this.selectedRect, 1);
    this.selectedRect = -1;
  }

  clearSandboxRectangles() {
    this.sandboxRects = [];
    this.selectedRect = -1;
  }

  startSandbox() {
    this.sanitizeSandbox();
    this.installSandboxWeapon();
    this.sandboxMode = true;
    this.screen = "game";
    this.money = 10 ** 9;
    this.owned = new Set(Object.keys(this.weapons));
    this.shopOpen = false;
    this.loadSandbox();
  }

  restartLevel() {
    if (this.screen !== "game") {
      return;
    }
    this.clearMoveKeys();
    if (this.sandboxMode) {
      this.loadSandbox();
    } else {
      this.loadLevel(this.levelIndex, true);
    }
  }

  nextLevel() {
    if (this.screen !== "game" || this.sandboxMode || !this.win) {
      return;
    }
    if (this.levelIndex + 1 < this.levels.length) {
      this.loadLevel(this.levelIndex + 1, false);
    } else {
      this.loadLevel(0, true);
    }
  }

  buyShopItem(key: string) {
    const item = SHOP_ITEMS.find((entry) => entry.key === key);
    const player = this.player;
    if (!item || !player) {
      return;
    }
    const cost = this.sandboxMode ? 0 : this.effectiveCost(item);
    if (!this.sandboxMode && this.money < cost) {
      return;
    }
    if (!this.sandboxMode) {
      this.money -= cost;
    }
    const weaponKey = key.startsWith("buy_") ? key.slice(4) : null;
    if (weaponKey) {
      this.owned.add(weaponKey);
    }

    if (key === "buy_pistol") player.weaponKey = "pistol";
    else if (key === "buy_rifle") player.weaponKey = "rifle";
    else if (key === "buy_shotgun") player.weaponKey = "shotgun";
    else if (key === "buy_sword") player.weaponKey = "sword";
    else if (key === "buy_blaster") player.weaponKey = "blaster";
    else if (key === "buy_rocket_launcher") player.weaponKey = "rocket_launcher";
    else if (key === "buy_minigun") player.weaponKey = "minigun";
    else if (key === "buy_railcannon") player.weaponKey = "railcannon";
    else if (key === "buy_claws") player.weaponKey = "claws";
    else if (key === "buy_landmine") {
      player.weaponKey = "landmine";
      this.landmineCharges = this.landmineMaxCharges;
      this.landmineRechargeQueue = [];
    } else if (key === "hp_up") {
      player.maxHp += 20;
      player.hp += 20;
    } else if (key === "shield_up") {
      player.maxShield += 15;
      player.shield += 15;
    } else if (key === "speed_up") {
      player.speed += 25;
    } else if (key === "heal") {
      player.hp = player.maxHp;
      player.shield = player.maxShield;
    }

    this.floatText(player.x, player.y - 36, "UPGRADED!", "#a7f3d0");
    this.refreshHud();
  }

  buyBossItem(key: string) {
    const player = this.player;
    if (!player) {
      return;
    }
    if (key === "equip_chunkier_gun") {
      if (!this.unlockedChunkier) {
        return;
      }
      player.weaponKey = "chunkier_gun";
      this.floatText(player.x, player.y - 36, "EQUIPPED: CHUNKIERGUN", "#fef3c7");
    } else if (key === "equip_pukeko") {
      if (!this.unlockedPukeko) {
        return;
      }
      player.weaponKey = "pukeko";
      this.floatText(player.x, player.y - 36, "EQUIPPED: PUKEKO", "#fef3c7");
    }
    this.refreshHud();
  }

  update(dt: number) {
    const player = this.player;
    if (this.screen !== "game" || !player) {
      return;
    }
    const step = Math.min(Math.max(dt, 0), 0.05);
    if (this.gameOver || this.win) {
      return;
    }

    this.updatePlayer(player, step);
    if (this.attackHeld) {
      this.tryPlayerAttack(player);
    }
    this.updateEnemies(player, step);
    this.updateBoss(player, step);
    this.updateBullets(player, step);
    this.updateLandmines(player);
    this.updateFloaters(step);
    this.updateExplosions();
    this.updateLasers();
    this.refreshHud();

    if (player.hp <= 0) {
      this.gameOver = true;
      this.attackHeld = false;
      this.end = {
        title: "YOU LOSE",
        subtitle: "Press R to restart",
        color: "#93c5fd",
        extra: null,
      };
      return;
    }

    const bossLeft = this.boss && this.boss.hp > 0 ? 1 : 0;
    if (!this.sandboxMode && this.enemies.length + bossLeft === 0) {
      this.win = true;
      this.attackHeld = false;
      this.handleBossUnlocks();
      if (this.levelIndex + 1 < this.levels.length) {
        this.money += 100;
        this.end = {
          title: "LEVEL CLEAR",
          subtitle: "Press N for next level or R to replay",
          color: "#34d399",
          extra: this.pendingUnlock,
        };
      } else {
        this.money += 200;
        this.end = {
          title: "YOU WIN",
          subtitle: "All levels cleared. Press N to loop or R to replay.",
          color: "#34d399",
          extra: this.pendingUnlock,
        };
      }
    }
  }

  render(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = "#0b1020";
    ctx.fillRect(0, 0, WORLD_W, WORLD_H);
    if (!this.worldReady || !this.player) {
      return;
    }

    ctx.fillStyle = "#e5e7eb";
    for (const [x, y, r] of STARFIELD) {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const wall of this.mapWalls) {
      strokeRect(ctx, wall, "#111827", "#334155", 2);
    }
    for (const edge of BORDER) {
      strokeRect(ctx, edge, "#0f172a", "#0f172a", 1);
    }

    const now = nowSec();
    for (const mine of this.landmines) {
      const pulse = 1.5 + 0.5 * Math.sin(now * 5);
      ctx.beginPath();
      ctx.arc(mine.x, mine.y, 18, 0, Math.PI * 2);
      ctx.strokeStyle = "#f59e0b";
      ctx.lineWidth = Math.max(1, Math.round(pulse));
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(mine.x, mine.y, mine.r, 0, Math.PI * 2);
      ctx.fillStyle = "#f59e0b";
      ctx.fill();
      ctx.strokeStyle = "#7c2d12";
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    for (const bullet of this.bullets) {
      ctx.beginPath();
      ctx.arc(bullet.x, bullet.y, bullet.r, 0, Math.PI * 2);
      ctx.fillStyle = bullet.color;
      ctx.fill();
    }

    for (const boom of this.explosions) {
      ctx.beginPath();
      ctx.arc(boom.x, boom.y, boom.radius, 0, Math.PI * 2);
      ctx.strokeStyle = boom.color;
      ctx.lineWidth = 4;
      ctx.stroke();
    }

    for (const beam of this.lasers) {
      strokeLine(ctx, beam, "#7dd3fc", 10);
      strokeLine(ctx, beam, "#38bdf8", 6);
      strokeLine(ctx, beam, "#e0f2fe", 2);
    }

    this.drawFighter(ctx, this.player, "#34d399", "#052e2b", "#bbf7d0", 3);
    for (const enemy of this.enemies) {
      this.drawFighter(ctx, enemy, "#fb7185", "#450a0a", "#fecdd3", 3);
    }
    if (this.boss) {
      this.drawBoss(ctx, this.boss);
    }

    ctx.font = "bold 12px Helvetica, Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (const floater of this.floaters) {
      ctx.fillStyle = floater.color;
      ctx.fillText(floater.text, floater.x, floater.y);
    }

    if (this.end && this.screen === "game") {
      ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
      ctx.fillRect(0, 0, WORLD_W, WORLD_H);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = this.end.color;
      ctx.font = "bold 44px Helvetica, Arial, sans-serif";
      ctx.fillText(this.end.title, WORLD_W / 2, WORLD_H / 2 - 20);
      ctx.fillStyle = "#e5e7eb";
      ctx.font = "bold 14px Helvetica, Arial, sans-serif";
      ctx.fillText(this.end.subtitle, WORLD_W / 2, WORLD_H / 2 + 30);
      if (this.end.extra) {
        ctx.fillStyle = "#fef3c7";
        ctx.font = "bold 12px Helvetica, Arial, sans-serif";
        ctx.fillText(this.end.extra, WORLD_W / 2, WORLD_H / 2 + 60);
      }
    }
  }

  snapshot() {
    const view = this.buildView();
    return { sig: signature(view), view };
  }

  private buildView(): GameView {
    const weaponName = this.player
      ? (this.weapons[this.player.weaponKey]?.name ?? this.player.weaponKey)
      : "";
    const moneyText = this.sandboxMode ? "INF" : `$${this.money}`;
    const bossAlive = Boolean(this.boss && this.boss.hp > 0);
    const frac = this.boss
      ? Math.max(0, Math.min(1, Math.max(0, this.boss.hp) / Math.max(1, this.boss.maxHp)))
      : 0;
    return {
      screen: this.screen,
      hud: this.hud,
      level: this.levelLine,
      tip: tipText(this.keybinds),
      shopOpen: this.shopOpen && this.screen === "game",
      shopTab: this.shopTab,
      shopSubtitle:
        this.shopTab === "shop"
          ? "Owned weapons become free forever. Buy to equip instantly."
          : "Boss weapons unlock by beating bosses in later levels.",
      shopMoneyLine: `Money: ${moneyText}   Weapon: ${weaponName}`,
      shopItems: SHOP_ITEMS.map((item) => {
        const cost = this.sandboxMode ? 0 : this.effectiveCost(item);
        const costText = this.sandboxMode ? "FREE" : cost === 0 ? "OWNED" : `$${cost}`;
        return {
          key: item.key,
          name: item.name,
          desc: item.desc,
          button: `Buy (${costText})`,
          enabled: this.sandboxMode || this.money >= cost,
        };
      }),
      bossItems: BOSS_SHOP_ITEMS.map((item) => {
        const unlocked =
          item.key === "equip_chunkier_gun"
            ? this.unlockedChunkier
            : item.key === "equip_pukeko"
              ? this.unlockedPukeko
              : false;
        return {
          key: item.key,
          name: item.name,
          desc: item.desc,
          button: unlocked ? "Equip (FREE)" : "Locked",
          enabled: unlocked,
        };
      }),
      bossLocked:
        !this.unlockedChunkier && !this.unlockedPukeko
          ? "Boss weapons locked.\nBeat the Level 10 boss to unlock."
          : "",
      bossBar: {
        visible: bossAlive && this.screen === "game" && !this.shopOpen,
        name: (this.levels[this.levelIndex]?.name ?? "").toUpperCase(),
        frac,
      },
      showShopButton: this.screen === "game",
      showHud: this.screen === "game" && !this.shopOpen && this.player !== null,
      aimByMouse: this.aimByMouse,
      showArrow: this.showArrow,
      showWeaponSprites: this.showWeaponSprites,
      musicEnabled: this.musicEnabled,
      keybinds: KEY_ACTIONS.map((action) => ({
        action,
        label: KEY_ACTION_LABELS[action],
        keyLabel:
          this.rebindingAction === action ? "Press key..." : prettyKey(this.keybinds[action]),
        listening: this.rebindingAction === action,
      })),
      sandbox: {
        ...this.sb,
        enemyWeapons: [...this.sb.enemyWeapons],
        rects: this.sandboxRects.map(
          (rect, index) =>
            `${index + 1}. x=${Math.trunc(rect.x)} y=${Math.trunc(rect.y)} w=${Math.trunc(rect.w)} h=${Math.trunc(rect.h)}`,
        ),
        selectedRect: this.selectedRect,
      },
    };
  }

  private effectiveCost(item: ShopItem) {
    const weaponKey = item.key.startsWith("buy_") ? item.key.slice(4) : null;
    if (weaponKey && this.owned.has(weaponKey)) {
      return 0;
    }
    return item.cost;
  }

  private sanitizeSandbox() {
    const count = clampInt(this.sb.enemyCount, 0, 8);
    this.sb.enemyCount = String(count);
    this.sb.playerHp = String(clampInt(this.sb.playerHp, 1, 50000));
    this.sb.playerShield = String(clampInt(this.sb.playerShield, 0, 50000));
    this.sb.playerSpeed = String(clampInt(this.sb.playerSpeed, 50, 1200));
    this.sb.enemyHp = String(clampInt(this.sb.enemyHp, 1, 50000));
    this.sb.enemyShield = String(clampInt(this.sb.enemyShield, 0, 50000));
    this.sb.enemySpeed = String(clampInt(this.sb.enemySpeed, 0, 1200));
    this.sb.weaponDamage = String(clampInt(this.sb.weaponDamage, 1, 5000));
    this.sb.weaponCooldown = String(clampFloat(this.sb.weaponCooldown, 0.01, 5));
    this.sb.weaponBulletSpeed = String(clampFloat(this.sb.weaponBulletSpeed, 0, 4000));
    this.sb.weaponRange = String(clampFloat(this.sb.weaponRange, 1, 600));
    this.sb.weaponPellets = String(clampInt(this.sb.weaponPellets, 1, 20));
    this.sb.weaponSpread = String(clampFloat(this.sb.weaponSpread, 0, 180));
    this.sb.weaponAoeRadius = String(clampFloat(this.sb.weaponAoeRadius, 0, 250));
    this.sb.weaponAoeDamage = String(clampInt(this.sb.weaponAoeDamage, 0, 5000));
    if (this.sb.weaponKind !== "gun" && this.sb.weaponKind !== "melee") {
      this.sb.weaponKind = "gun";
    }
    const loadout: string[] = [];
    for (let i = 0; i < count; i += 1) {
      let wk = this.sb.enemyWeapons[i] ?? "pistol";
      if (!(wk in this.weapons) && wk !== "sandbox_custom") {
        wk = "pistol";
      }
      loadout.push(wk);
    }
    this.sandboxEnemyLoadout = loadout;
    this.sandboxEnemyCountLast = count;
  }

  private installSandboxWeapon() {
    const kind = this.sb.weaponKind === "melee" ? "melee" : "gun";
    this.weapons.sandbox_custom = {
      key: "sandbox_custom",
      name: "SandboxCustom",
      kind,
      damage: clampInt(this.sb.weaponDamage, 1, 5000),
      cooldown: clampFloat(this.sb.weaponCooldown, 0.01, 5),
      range: clampFloat(this.sb.weaponRange, 1, 600),
      bulletSpeed: clampFloat(this.sb.weaponBulletSpeed, 0, 4000),
      pelletCount: clampInt(this.sb.weaponPellets, 1, 20),
      spreadDeg: clampFloat(this.sb.weaponSpread, 0, 180),
      aoeRadius: clampFloat(this.sb.weaponAoeRadius, 0, 250),
      aoeDamage: clampInt(this.sb.weaponAoeDamage, 0, 5000),
    };
  }

  private loadSandbox() {
    this.gameOver = false;
    this.win = false;
    this.attackHeld = false;
    this.pendingUnlock = null;
    this.end = null;
    this.shopOpen = false;
    this.bullets = [];
    this.enemies = [];
    this.floaters = [];
    this.explosions = [];
    this.lasers = [];
    this.clearLandmines(true);
    this.boss = null;

    const php = clampInt(this.sb.playerHp, 1, 50000);
    const pshield = clampInt(this.sb.playerShield, 0, 50000);
    const pspeed = clampInt(this.sb.playerSpeed, 50, 1200);
    if (!this.player) {
      this.player = this.makeFighter(160, 320, 16, pspeed, php, pshield, "sandbox_custom");
    } else {
      this.player.x = 160;
      this.player.y = 320;
      this.player.speed = pspeed;
      this.player.maxHp = php;
      this.player.hp = php;
      this.player.maxShield = pshield;
      this.player.shield = pshield;
      this.player.weaponKey = "sandbox_custom";
      this.player.nextAttack = 0;
    }

    const ehp = clampInt(this.sb.enemyHp, 1, 50000);
    const eshield = clampInt(this.sb.enemyShield, 0, 50000);
    const espeed = clampInt(this.sb.enemySpeed, 0, 1200);
    const spots = SANDBOX_SPAWNS.slice(0, this.sandboxEnemyCountLast);
    for (let i = 0; i < spots.length; i += 1) {
      const [sx, sy] = spots[i];
      const enemy = this.makeFighter(sx, sy, 18, espeed, ehp, eshield, this.sandboxEnemyLoadout[i] ?? "pistol");
      enemy.facingX = -1;
      this.enemies.push(enemy);
    }

    this.buildMap(this.sandboxRects);
    this.refreshHud();
  }

  private loadLevel(index: number, fullHeal: boolean) {
    this.levelIndex = index;
    this.gameOver = false;
    this.win = false;
    this.attackHeld = false;
    this.pendingUnlock = null;
    this.end = null;
    this.shopOpen = false;
    this.bullets = [];
    this.enemies = [];
    this.floaters = [];
    this.explosions = [];
    this.lasers = [];
    this.clearLandmines(true);
    this.boss = null;

    const level = this.levels[index];
    const [px, py] = level.playerSpawn;
    if (!this.player) {
      this.player = this.makeFighter(px, py, 16, 270, 100, 0, "pistol");
    } else {
      this.player.x = px;
      this.player.y = py;
      if (fullHeal) {
        this.player.hp = this.player.maxHp;
        this.player.shield = this.player.maxShield;
      } else {
        this.player.hp = Math.max(1, Math.min(this.player.hp, this.player.maxHp));
        this.player.shield = Math.max(0, Math.min(this.player.shield, this.player.maxShield));
      }
      this.player.nextAttack = 0;
    }

    for (const [sx, sy] of level.enemySpawns) {
      const pool = level.enemyWeaponPool;
      const weaponKey = pool[Math.floor(Math.random() * pool.length)] ?? "pistol";
      const enemy = this.makeFighter(sx, sy, 18, level.enemySpeed, level.enemyHp, level.enemyShield, weaponKey);
      enemy.facingX = -1;
      this.enemies.push(enemy);
    }

    if (level.bossSpawn && level.bossHp > 0) {
      const [bx, by] = level.bossSpawn;
      const radius = index === 4 ? 34 : index === 9 ? 100 : index === 14 ? 70 : 48;
      const boss = this.makeFighter(
        bx,
        by,
        radius,
        Math.max(40, level.bossSpeed),
        level.bossHp,
        level.bossShield,
        level.bossWeapon,
      );
      boss.facingX = -1;
      if (index === 14) {
        boss.spriteKey = "level15";
      }
      this.boss = boss;
    }

    this.buildMap(level.walls);
    this.refreshHud();
  }

  private makeFighter(
    x: number,
    y: number,
    r: number,
    speed: number,
    hp: number,
    shield: number,
    weaponKey: string,
  ): Fighter {
    return {
      x,
      y,
      r,
      speed,
      hp,
      maxHp: hp,
      shield,
      maxShield: shield,
      facingX: 1,
      facingY: 0,
      weaponKey,
      nextAttack: 0,
      spriteKey: "",
    };
  }

  private buildMap(walls: readonly Rect[]) {
    this.mapWalls = walls.map((wall) => ({ ...wall }));
    this.obstacles = [...this.mapWalls, ...BORDER];
    this.worldReady = true;
  }

  private clearLandmines(resetCharges: boolean) {
    this.landmines = [];
    this.landmineRechargeQueue = [];
    if (resetCharges) {
      this.landmineCharges = this.landmineMaxCharges;
    }
  }

  private refreshHud() {
    const player = this.player;
    if (!player) {
      this.hud = "";
      this.levelLine = "";
      return;
    }
    const weaponName = this.weapons[player.weaponKey]?.name ?? player.weaponKey;
    const enemiesCount = this.enemies.length + (this.boss && this.boss.hp > 0 ? 1 : 0);
    if (this.sandboxMode) {
      this.levelLine = `Sandbox   (Enemies spawned: ${this.sandboxEnemyCountLast})`;
    } else {
      const level = this.levels[this.levelIndex];
      this.levelLine = `${level.name}   (Level ${this.levelIndex + 1}/${this.levels.length})`;
    }
    const moneyText = this.sandboxMode ? "INF" : `$${this.money}`;
    let extra = "";
    if (player.weaponKey === "landmine") {
      const recharging = this.landmineRechargeQueue.length;
      extra = `   Mines ${this.landmineCharges}/${this.landmineMaxCharges}`;
      if (recharging > 0) {
        extra += ` (${recharging} recharging)`;
      }
    }
    this.hud =
      `HP ${Math.max(0, player.hp)}/${player.maxHp}   ` +
      `Shield ${Math.max(0, player.shield)}/${player.maxShield}   ` +
      `Enemies ${enemiesCount}   Money ${moneyText}   Weapon ${weaponName}${extra}`;
  }

  private handleBossUnlocks() {
    if (this.levelIndex === 9 && !this.unlockedChunkier) {
      this.unlockedChunkier = true;
      this.pendingUnlock = "Unlocked Boss Weapon: ChunkierGun (Shop → Boss Weapons)";
      if (this.player) {
        this.floatText(this.player.x, this.player.y - 60, "UNLOCKED: CHUNKIERGUN", "#fef3c7");
      }
    }
    if (this.levelIndex === 14 && !this.unlockedPukeko) {
      this.unlockedPukeko = true;
      this.pendingUnlock = "Unlocked Boss Weapon: Pukeko (Shop → Boss Weapons)";
      if (this.player) {
        this.floatText(this.player.x, this.player.y - 60, "UNLOCKED: PUKEKO", "#fef3c7");
      }
    }
  }

  private updatePlayer(player: Fighter, dt: number) {
    if (this.shopOpen) {
      return;
    }
    let dx = 0;
    let dy = 0;
    if (this.move.move_left) dx -= 1;
    if (this.move.move_right) dx += 1;
    if (this.move.move_up) dy -= 1;
    if (this.move.move_down) dy += 1;

    if (dx !== 0 || dy !== 0) {
      const length = Math.hypot(dx, dy);
      dx /= length;
      dy /= length;
      if (!this.aimByMouse) {
        player.facingX = dx;
        player.facingY = dy;
      }
      const [x, y] = this.moveCircle(player.x, player.y, player.r, dx * player.speed * dt, dy * player.speed * dt);
      player.x = x;
      player.y = y;
    }

    if (this.aimByMouse) {
      const [fx, fy] = norm(this.mouseX - player.x, this.mouseY - player.y, [player.facingX, player.facingY]);
      player.facingX = fx;
      player.facingY = fy;
    }
  }

  private tryPlayerAttack(player: Fighter) {
    if (this.shopOpen || this.gameOver || this.win) {
      return;
    }
    const weapon = this.weapons[player.weaponKey];
    if (!weapon) {
      return;
    }
    const now = nowSec();
    if (now < player.nextAttack) {
      return;
    }
    player.nextAttack = now + weapon.cooldown;
    if (weapon.key === "landmine") {
      this.placeLandmine(player);
    } else if (weapon.kind === "gun") {
      if (weapon.key === "railcannon") {
        this.firePlayerRailcannon(player, weapon);
      } else {
        this.firePlayerGun(player, weapon);
      }
    } else {
      this.playerMelee(player, weapon);
    }
  }

  private firePlayerGun(player: Fighter, weapon: Weapon) {
    const [fx, fy] = norm(player.facingX, player.facingY, [1, 0]);
    const [sx, sy] = projectileSpawn(player);
    for (let i = 0; i < weapon.pelletCount; i += 1) {
      let angle = Math.atan2(fy, fx);
      if (weapon.spreadDeg > 0) {
        angle += rad(uniform(-weapon.spreadDeg, weapon.spreadDeg));
      }
      const radius = weapon.key === "blaster" ? 6 : 5;
      const fill = weapon.key === "blaster" ? "#f59e0b" : "#fbbf24";
      this.bullets.push({
        x: sx,
        y: sy,
        vx: Math.cos(angle) * weapon.bulletSpeed,
        vy: Math.sin(angle) * weapon.bulletSpeed,
        r: radius,
        damage: weapon.damage,
        fromEnemy: false,
        weaponKey: weapon.key,
        color: fill,
      });
    }
  }

  private firePlayerRailcannon(player: Fighter, weapon: Weapon) {
    const [fx, fy] = norm(player.facingX, player.facingY, [1, 0]);
    const [ox, oy] = projectileSpawn(player);
    const maxDist = 1200;
    const wallDist = this.raycastWalls(ox, oy, fx, fy, maxDist);
    const enemyHit = this.raycastEnemy(ox, oy, fx, fy, wallDist);
    const bossHit = this.raycastBoss(ox, oy, fx, fy, wallDist);

    let endT = wallDist;
    let hit: "enemy" | "boss" | null = null;
    if (enemyHit.enemy && enemyHit.t < endT) {
      endT = enemyHit.t;
      hit = "enemy";
    }
    if (bossHit.hit && bossHit.t < endT) {
      endT = bossHit.t;
      hit = "boss";
    }
    const ex = ox + fx * endT;
    const ey = oy + fy * endT;
    if (hit === "enemy" && enemyHit.enemy) {
      this.damageEnemy(enemyHit.enemy, weapon.damage);
      if (weapon.aoeRadius > 0 && weapon.aoeDamage > 0) {
        this.explodeAt(ex, ey, weapon, enemyHit.enemy, false);
      }
    } else if (hit === "boss") {
      this.damageBoss(weapon.damage);
      if (weapon.aoeRadius > 0 && weapon.aoeDamage > 0) {
        this.explodeAt(ex, ey, weapon, null, true);
      }
    }
    this.lasers.push({ x1: ox, y1: oy, x2: ex, y2: ey, born: nowSec(), duration: 0.18 });
  }

  private playerMelee(player: Fighter, weapon: Weapon) {
    const [fx, fy] = norm(player.facingX, player.facingY, [1, 0]);
    for (const enemy of this.enemies) {
      const dx = enemy.x - player.x;
      const dy = enemy.y - player.y;
      const dist2 = dx * dx + dy * dy;
      if (dist2 > (weapon.range + enemy.r) ** 2) {
        continue;
      }
      const dist = Math.max(1, Math.hypot(dx, dy));
      if ((dx / dist) * fx + (dy / dist) * fy > 0.2) {
        this.damageEnemy(enemy, weapon.damage);
      }
    }
    if (this.boss && this.boss.hp > 0) {
      const dx = this.boss.x - player.x;
      const dy = this.boss.y - player.y;
      const dist2 = dx * dx + dy * dy;
      if (dist2 <= (weapon.range + this.boss.r) ** 2) {
        const dist = Math.max(1, Math.hypot(dx, dy));
        if ((dx / dist) * fx + (dy / dist) * fy > 0.2) {
          this.damageBoss(weapon.damage);
        }
      }
    }
  }

  private placeLandmine(player: Fighter) {
    if (this.landmineCharges <= 0) {
      this.floatText(player.x, player.y - 36, "NO MINES", "#fca5a5");
      return;
    }
    const [fx, fy] = norm(player.facingX, player.facingY, [1, 0]);
    const px = player.x + fx * (player.r + 16);
    const py = player.y + fy * (player.r + 16);
    const mineR = 12;
    if (this.blocked({ x: px - mineR, y: py - mineR, w: mineR * 2, h: mineR * 2 })) {
      this.floatText(player.x, player.y - 36, "BLOCKED", "#fca5a5");
      return;
    }
    for (const mine of this.landmines) {
      const dx = px - mine.x;
      const dy = py - mine.y;
      if (dx * dx + dy * dy <= (mineR + mine.r + 6) ** 2) {
        this.floatText(player.x, player.y - 36, "TOO CLOSE", "#fca5a5");
        return;
      }
    }
    this.landmines.push({ x: px, y: py, r: mineR, damage: 500 });
    this.landmineCharges -= 1;
    this.floatText(px, py - 26, "MINE", "#fde68a");
  }

  private detonateLandmine(mine: Landmine, hitEnemy: Fighter | null, hitBoss: boolean) {
    const index = this.landmines.indexOf(mine);
    if (index < 0) {
      return;
    }
    this.landmines.splice(index, 1);
    const aoeR = 84;
    if (hitEnemy) {
      this.damageEnemy(hitEnemy, mine.damage);
    }
    if (hitBoss && this.boss && this.boss.hp > 0) {
      this.damageBoss(mine.damage);
    }
    for (const enemy of this.enemies) {
      if (hitEnemy && enemy === hitEnemy) {
        continue;
      }
      const dx = enemy.x - mine.x;
      const dy = enemy.y - mine.y;
      if (dx * dx + dy * dy <= (aoeR + enemy.r) ** 2) {
        this.damageEnemy(enemy, mine.damage);
      }
    }
    if (this.boss && this.boss.hp > 0 && !hitBoss) {
      const dx = this.boss.x - mine.x;
      const dy = this.boss.y - mine.y;
      if (dx * dx + dy * dy <= (aoeR + this.boss.r) ** 2) {
        this.damageBoss(mine.damage);
      }
    }
    const flash = this.weapons.rocket_launcher;
    if (flash) {
      this.explodeAt(mine.x, mine.y, flash, null, false);
    }
    this.landmineRechargeQueue.push(nowSec() + this.landmineRechargeSeconds);
  }

  private updateLandmines(player: Fighter) {
    const now = nowSec();
    const keep: number[] = [];
    let gained = 0;
    for (const ready of this.landmineRechargeQueue) {
      if (now >= ready && this.landmineCharges < this.landmineMaxCharges) {
        this.landmineCharges += 1;
        gained += 1;
      } else {
        keep.push(ready);
      }
    }
    this.landmineRechargeQueue = keep;
    if (gained > 0) {
      this.floatText(player.x, player.y - 56, "+MINE", "#fde68a");
    }

    for (const mine of [...this.landmines]) {
      let triggered = false;
      for (const enemy of this.enemies) {
        const dx = enemy.x - mine.x;
        const dy = enemy.y - mine.y;
        if (dx * dx + dy * dy <= (mine.r + enemy.r) ** 2) {
          this.detonateLandmine(mine, enemy, false);
          triggered = true;
          break;
        }
      }
      if (triggered) {
        continue;
      }
      if (this.boss && this.boss.hp > 0) {
        const dx = this.boss.x - mine.x;
        const dy = this.boss.y - mine.y;
        if (dx * dx + dy * dy <= (mine.r + this.boss.r) ** 2) {
          this.detonateLandmine(mine, null, true);
        }
      }
    }
  }

  private updateEnemies(player: Fighter, dt: number) {
    if (this.shopOpen) {
      return;
    }
    const now = nowSec();
    const desired = 240;
    const survivors: Fighter[] = [];
    for (const enemy of this.enemies) {
      if (enemy.hp <= 0) {
        continue;
      }
      const dx = player.x - enemy.x;
      const dy = player.y - enemy.y;
      const dist = Math.max(1, Math.hypot(dx, dy));
      const weapon = this.weapons[enemy.weaponKey];
      const target = weapon?.kind === "melee" ? 120 : desired;
      const dirX = dx / dist;
      const dirY = dy / dist;
      let moveX = 0;
      let moveY = 0;
      if (dist > target) {
        moveX = dirX * enemy.speed * dt;
        moveY = dirY * enemy.speed * dt;
      } else if (dist < target * 0.7) {
        moveX = -dirX * enemy.speed * dt;
        moveY = -dirY * enemy.speed * dt;
      } else {
        const strafe = Math.sin(now * (1.6 + (enemy.x % 3))) * 0.8;
        moveX = -dirY * enemy.speed * 0.35 * dt * strafe;
        moveY = dirX * enemy.speed * 0.35 * dt * strafe;
      }
      const [x, y] = this.moveCircle(enemy.x, enemy.y, enemy.r, moveX, moveY);
      enemy.x = x;
      enemy.y = y;
      const [fx, fy] = norm(dx, dy, [-1, 0]);
      enemy.facingX = fx;
      enemy.facingY = fy;
      this.enemyAttack(enemy, player, now);
      survivors.push(enemy);
    }
    this.enemies = survivors;
  }

  private enemyAttack(enemy: Fighter, player: Fighter, now: number) {
    const weapon = this.weapons[enemy.weaponKey];
    if (!weapon || now < enemy.nextAttack) {
      return;
    }
    enemy.nextAttack = now + weapon.cooldown;
    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;
    const [fx, fy] = norm(dx, dy, [-1, 0]);
    enemy.facingX = fx;
    enemy.facingY = fy;
    if (weapon.key === "landmine") {
      return;
    }
    if (weapon.kind === "gun") {
      const [sx, sy] = projectileSpawn(enemy);
      for (let i = 0; i < weapon.pelletCount; i += 1) {
        let angle = Math.atan2(fy, fx);
        if (weapon.spreadDeg > 0) {
          angle += rad(uniform(-weapon.spreadDeg, weapon.spreadDeg));
        }
        this.bullets.push({
          x: sx,
          y: sy,
          vx: Math.cos(angle) * weapon.bulletSpeed * 0.75,
          vy: Math.sin(angle) * weapon.bulletSpeed * 0.75,
          r: 4,
          damage: weapon.damage,
          fromEnemy: true,
          weaponKey: weapon.key,
          color: "#93c5fd",
        });
      }
      return;
    }
    const dist2 = dx * dx + dy * dy;
    if (dist2 <= (weapon.range + player.r) ** 2) {
      const dist = Math.max(1, Math.hypot(dx, dy));
      if ((dx / dist) * fx + (dy / dist) * fy > 0.2) {
        this.damagePlayer(player, weapon.damage);
      }
    }
  }

  private updateBoss(player: Fighter, dt: number) {
    if (this.shopOpen || !this.boss || this.boss.hp <= 0) {
      return;
    }
    const boss = this.boss;
    const now = nowSec();
    const dx = player.x - boss.x;
    const dy = player.y - boss.y;
    const dist = Math.max(1, Math.hypot(dx, dy));
    const weapon = this.weapons[boss.weaponKey];
    const desired = weapon?.kind === "gun" ? 300 : 140;
    const dirX = dx / dist;
    const dirY = dy / dist;
    let moveX = 0;
    let moveY = 0;
    if (dist > desired) {
      moveX = dirX * boss.speed * dt;
      moveY = dirY * boss.speed * dt;
    } else if (dist < desired * 0.7) {
      moveX = -dirX * boss.speed * dt;
      moveY = -dirY * boss.speed * dt;
    } else {
      const strafe = Math.sin(now * 1.2);
      moveX = -dirY * boss.speed * 0.55 * dt * strafe;
      moveY = dirX * boss.speed * 0.55 * dt * strafe;
    }
    if (boss.shield <= Math.max(10, Math.floor(boss.maxShield / 10))) {
      moveX += dirX * boss.speed * 0.25 * dt;
      moveY += dirY * boss.speed * 0.25 * dt;
    }
    const [x, y] = this.moveCircle(boss.x, boss.y, boss.r, moveX, moveY);
    boss.x = x;
    boss.y = y;
    const [fx, fy] = norm(dx, dy, [-1, 0]);
    boss.facingX = fx;
    boss.facingY = fy;
    this.bossAttack(boss, player, now);
  }

  private bossAttack(boss: Fighter, player: Fighter, now: number) {
    const weapon = this.weapons[boss.weaponKey];
    if (!weapon || now < boss.nextAttack) {
      return;
    }
    boss.nextAttack = now + weapon.cooldown;
    const dx = player.x - boss.x;
    const dy = player.y - boss.y;
    const [fx, fy] = norm(dx, dy, [-1, 0]);
    boss.facingX = fx;
    boss.facingY = fy;
    if (weapon.key === "landmine") {
      return;
    }
    if (weapon.kind === "gun") {
      const [sx, sy] = projectileSpawn(boss);
      let salvo = 1;
      if (weapon.key === "rocket_launcher") salvo = 1;
      else if (weapon.key === "minigun") salvo = 3;
      else if (weapon.key === "shotgun") salvo = Math.max(6, weapon.pelletCount);
      for (let i = 0; i < salvo; i += 1) {
        let angle = Math.atan2(fy, fx);
        const spread = weapon.key === "rocket_launcher" ? 7 : weapon.spreadDeg > 0 ? weapon.spreadDeg : 4;
        angle += rad(uniform(-spread, spread));
        const speed = weapon.bulletSpeed > 0 ? weapon.bulletSpeed * 0.7 : 520;
        const radius = weapon.key === "rocket_launcher" || weapon.key === "blaster" ? 7 : 5;
        const fill = weapon.key === "rocket_launcher" ? "#93c5fd" : "#60a5fa";
        this.bullets.push({
          x: sx,
          y: sy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          r: radius,
          damage: weapon.damage,
          fromEnemy: true,
          weaponKey: weapon.key,
          color: fill,
        });
      }
      return;
    }
    const dist2 = dx * dx + dy * dy;
    if (dist2 <= (weapon.range + player.r) ** 2) {
      this.damagePlayer(player, weapon.damage);
    }
  }

  private updateBullets(player: Fighter, dt: number) {
    const alive: Bullet[] = [];
    for (const bullet of this.bullets) {
      bullet.x += bullet.vx * dt;
      bullet.y += bullet.vy * dt;

      if (this.bulletHitsWall(bullet)) {
        if (!bullet.fromEnemy && SPLASH_KEYS.has(bullet.weaponKey)) {
          const weapon = this.weapons[bullet.weaponKey];
          if (weapon) this.explodeAt(bullet.x, bullet.y, weapon, null, false);
        }
        if (bullet.fromEnemy && SPLASH_KEYS.has(bullet.weaponKey)) {
          const weapon = this.weapons[bullet.weaponKey];
          if (weapon) this.enemyExplodeAt(player, bullet.x, bullet.y, weapon);
        }
        continue;
      }

      if (bullet.fromEnemy) {
        const dx = bullet.x - player.x;
        const dy = bullet.y - player.y;
        if (dx * dx + dy * dy <= (bullet.r + player.r) ** 2) {
          this.damagePlayer(player, bullet.damage);
          if (SPLASH_KEYS.has(bullet.weaponKey)) {
            const weapon = this.weapons[bullet.weaponKey];
            if (weapon) this.enemyExplodeAt(player, bullet.x, bullet.y, weapon);
          }
          continue;
        }
      } else {
        let hitEnemy: Fighter | null = null;
        for (const enemy of this.enemies) {
          const dx = bullet.x - enemy.x;
          const dy = bullet.y - enemy.y;
          if (dx * dx + dy * dy <= (bullet.r + enemy.r) ** 2) {
            hitEnemy = enemy;
            break;
          }
        }
        let hitBoss = false;
        if (!hitEnemy && this.boss && this.boss.hp > 0) {
          const dx = bullet.x - this.boss.x;
          const dy = bullet.y - this.boss.y;
          if (dx * dx + dy * dy <= (bullet.r + this.boss.r) ** 2) {
            hitBoss = true;
          }
        }
        if (hitEnemy) {
          this.damageEnemy(hitEnemy, bullet.damage);
          if (SPLASH_KEYS.has(bullet.weaponKey)) {
            const weapon = this.weapons[bullet.weaponKey];
            if (weapon) this.explodeAt(bullet.x, bullet.y, weapon, hitEnemy, false);
          }
          continue;
        }
        if (hitBoss) {
          this.damageBoss(bullet.damage);
          if (SPLASH_KEYS.has(bullet.weaponKey)) {
            const weapon = this.weapons[bullet.weaponKey];
            if (weapon) this.explodeAt(bullet.x, bullet.y, weapon, null, true);
          }
          continue;
        }
      }

      if (bullet.x >= -60 && bullet.x <= 1040 && bullet.y >= -60 && bullet.y <= 700) {
        alive.push(bullet);
      }
    }
    this.bullets = alive;
  }

  private enemyExplodeAt(player: Fighter, x: number, y: number, weapon: Weapon) {
    if (weapon.aoeRadius <= 0 || weapon.aoeDamage <= 0) {
      return;
    }
    this.explosions.push({
      x,
      y,
      radius: weapon.aoeRadius,
      born: nowSec(),
      duration: 0.18,
      color: "#93c5fd",
    });
    const dx = player.x - x;
    const dy = player.y - y;
    if (dx * dx + dy * dy <= weapon.aoeRadius * weapon.aoeRadius) {
      this.damagePlayer(player, weapon.aoeDamage);
    }
    this.floatText(x, y - 22, "BOOM", "#93c5fd");
  }

  private explodeAt(
    x: number,
    y: number,
    weapon: Weapon,
    hitEnemy: Fighter | null,
    hitBoss: boolean,
  ) {
    if (weapon.aoeRadius <= 0 || weapon.aoeDamage <= 0) {
      return;
    }
    this.explosions.push({
      x,
      y,
      radius: weapon.aoeRadius,
      born: nowSec(),
      duration: 0.18,
      color: "#fde68a",
    });
    const reach = weapon.aoeRadius * weapon.aoeRadius;
    for (const enemy of this.enemies) {
      if (enemy.hp <= 0) continue;
      if (hitEnemy && enemy === hitEnemy) continue;
      const dx = enemy.x - x;
      const dy = enemy.y - y;
      if (dx * dx + dy * dy <= reach) {
        this.damageEnemy(enemy, weapon.aoeDamage);
      }
    }
    if (this.boss && this.boss.hp > 0 && !hitBoss) {
      const dx = this.boss.x - x;
      const dy = this.boss.y - y;
      if (dx * dx + dy * dy <= reach) {
        this.damageBoss(weapon.aoeDamage);
      }
    }
    this.floatText(x, y - 22, "BOOM", "#fde68a");
  }

  private updateExplosions() {
    const now = nowSec();
    this.explosions = this.explosions.filter((boom) => now - boom.born < boom.duration);
  }

  private updateLasers() {
    const now = nowSec();
    this.lasers = this.lasers.filter((beam) => now - beam.born < beam.duration);
  }

  private updateFloaters(dt: number) {
    const now = nowSec();
    const next: Floater[] = [];
    for (const floater of this.floaters) {
      if (now - floater.born > 0.8) continue;
      floater.y -= 1.5 * (dt / 0.016);
      next.push(floater);
    }
    this.floaters = next;
  }

  private damagePlayer(player: Fighter, amount: number) {
    let dmg = amount;
    if (player.shield > 0) {
      const absorbed = Math.min(player.shield, dmg);
      player.shield -= absorbed;
      dmg -= absorbed;
      this.floatText(player.x, player.y - 26, `-${absorbed} SHIELD`, "#a78bfa");
    }
    if (dmg > 0) {
      player.hp -= dmg;
      this.floatText(player.x, player.y - 26, `-${dmg}`, "#93c5fd");
    }
  }

  private damageEnemy(enemy: Fighter, amount: number) {
    let dmg = amount;
    let absorbed = 0;
    if (enemy.shield > 0) {
      absorbed = Math.min(enemy.shield, dmg);
      enemy.shield -= absorbed;
      dmg -= absorbed;
    }
    if (absorbed > 0) {
      this.floatText(enemy.x, enemy.y - 26, `-${absorbed} SHIELD`, "#c4b5fd");
    }
    if (dmg > 0) {
      enemy.hp -= dmg;
      this.floatText(enemy.x, enemy.y - 26, `-${dmg}`, "#fbbf24");
    }
    this.money += 2;
    if (enemy.hp <= 0) {
      this.money += 40;
      this.floatText(enemy.x, enemy.y - 44, "+$40", "#34d399");
    }
  }

  private damageBoss(amount: number) {
    const boss = this.boss;
    if (!boss || boss.hp <= 0) return;
    let dmg = amount;
    let absorbed = 0;
    if (boss.shield > 0) {
      absorbed = Math.min(boss.shield, dmg);
      boss.shield -= absorbed;
      dmg -= absorbed;
    }
    if (absorbed > 0) {
      this.floatText(boss.x, boss.y - 32, `-${absorbed} SHIELD`, "#c4b5fd");
    }
    if (dmg > 0) {
      boss.hp -= dmg;
      this.floatText(boss.x, boss.y - 32, `-${dmg}`, "#fbbf24");
    }
    this.money += 3;
    if (boss.hp <= 0) {
      this.money += 400;
      this.floatText(boss.x, boss.y - 52, "+$400", "#34d399");
    }
  }

  private floatText(x: number, y: number, text: string, color: string) {
    this.floaters.push({ x, y, text, color, born: nowSec() });
  }

  private blocked(rect: Rect) {
    return this.obstacles.some((obstacle) => intersects(rect, obstacle));
  }

  private moveCircle(x: number, y: number, r: number, dx: number, dy: number) {
    let nextX = x + dx;
    if (this.blocked({ x: nextX - r, y: y - r, w: r * 2, h: r * 2 })) {
      nextX = x;
    }
    let nextY = y + dy;
    if (this.blocked({ x: nextX - r, y: nextY - r, w: r * 2, h: r * 2 })) {
      nextY = y;
    }
    return [nextX, nextY] as const;
  }

  private bulletHitsWall(bullet: Bullet) {
    const rect = { x: bullet.x - bullet.r, y: bullet.y - bullet.r, w: bullet.r * 2, h: bullet.r * 2 };
    return this.obstacles.some((obstacle) => intersects(rect, obstacle));
  }

  private rayRectDist(ox: number, oy: number, dx: number, dy: number, rect: Rect) {
    const eps = 1e-9;
    let txMin: number;
    let txMax: number;
    let tyMin: number;
    let tyMax: number;
    if (Math.abs(dx) < eps) {
      if (ox < rect.x || ox > rect.x + rect.w) return null;
      txMin = Number.NEGATIVE_INFINITY;
      txMax = Number.POSITIVE_INFINITY;
    } else {
      const tx1 = (rect.x - ox) / dx;
      const tx2 = (rect.x + rect.w - ox) / dx;
      txMin = Math.min(tx1, tx2);
      txMax = Math.max(tx1, tx2);
    }
    if (Math.abs(dy) < eps) {
      if (oy < rect.y || oy > rect.y + rect.h) return null;
      tyMin = Number.NEGATIVE_INFINITY;
      tyMax = Number.POSITIVE_INFINITY;
    } else {
      const ty1 = (rect.y - oy) / dy;
      const ty2 = (rect.y + rect.h - oy) / dy;
      tyMin = Math.min(ty1, ty2);
      tyMax = Math.max(ty1, ty2);
    }
    const tEnter = Math.max(txMin, tyMin);
    const tExit = Math.min(txMax, tyMax);
    if (tExit < 0 || tEnter > tExit) return null;
    return tEnter >= 0 ? tEnter : tExit;
  }

  private raycastWalls(ox: number, oy: number, dx: number, dy: number, maxDist: number) {
    let best = maxDist;
    for (const rect of this.obstacles) {
      const t = this.rayRectDist(ox, oy, dx, dy, rect);
      if (t !== null && t >= 0 && t < best) best = t;
    }
    return best;
  }

  private raycastEnemy(ox: number, oy: number, dx: number, dy: number, maxDist: number) {
    let best: Fighter | null = null;
    let bestT = maxDist;
    for (const enemy of this.enemies) {
      if (enemy.hp <= 0) continue;
      const t = (enemy.x - ox) * dx + (enemy.y - oy) * dy;
      if (t < 0 || t > maxDist) continue;
      const px = ox + dx * t;
      const py = oy + dy * t;
      const ddx = enemy.x - px;
      const ddy = enemy.y - py;
      if (ddx * ddx + ddy * ddy <= enemy.r * enemy.r && t < bestT) {
        bestT = t;
        best = enemy;
      }
    }
    return { enemy: best, t: bestT };
  }

  private raycastBoss(ox: number, oy: number, dx: number, dy: number, maxDist: number) {
    const boss = this.boss;
    if (!boss || boss.hp <= 0) return { hit: false, t: maxDist };
    const t = (boss.x - ox) * dx + (boss.y - oy) * dy;
    if (t < 0 || t > maxDist) return { hit: false, t: maxDist };
    const px = ox + dx * t;
    const py = oy + dy * t;
    const ddx = boss.x - px;
    const ddy = boss.y - py;
    if (ddx * ddx + ddy * ddy <= boss.r * boss.r) return { hit: true, t };
    return { hit: false, t: maxDist };
  }

  private onAttackPress() {
    if (this.screen !== "game" || this.shopOpen || this.gameOver || this.win || !this.player) {
      return;
    }
    this.attackHeld = true;
    this.tryPlayerAttack(this.player);
  }

  private drawBoss(ctx: CanvasRenderingContext2D, boss: Fighter) {
    const image = boss.spriteKey === "level15" ? this.bossSprite : null;
    if (image && image.complete && image.naturalWidth > 0) {
      const w = image.naturalWidth * BOSS_SPRITE_ZOOM;
      const h = image.naturalHeight * BOSS_SPRITE_ZOOM;
      ctx.drawImage(image, boss.x - w / 2, boss.y - h / 2, w, h);
    } else {
      ctx.beginPath();
      ctx.arc(boss.x, boss.y, boss.r, 0, Math.PI * 2);
      ctx.fillStyle = "#ef4444";
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = "#450a0a";
      ctx.stroke();
    }
    this.drawWeaponSprite(ctx, boss);
    if (this.showArrow) {
      drawAim(ctx, boss, "#fecdd3");
    }
  }

  private drawFighter(
    ctx: CanvasRenderingContext2D,
    fighter: Fighter,
    fill: string,
    outline: string,
    aim: string,
    width: number,
  ) {
    ctx.beginPath();
    ctx.arc(fighter.x, fighter.y, fighter.r, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.lineWidth = width;
    ctx.strokeStyle = outline;
    ctx.stroke();
    this.drawWeaponSprite(ctx, fighter);
    if (this.showArrow) {
      drawAim(ctx, fighter, aim);
    }
  }

  private drawWeaponSprite(ctx: CanvasRenderingContext2D, fighter: Fighter) {
    if (!this.showWeaponSprites) return;
    const image = this.weaponSprites.get(fighter.weaponKey);
    if (!image || !image.complete || image.naturalWidth === 0) return;
    const [fx, fy] = norm(fighter.facingX, fighter.facingY, [1, 0]);
    const forward =
      fighter.weaponKey === "sword" || fighter.weaponKey === "claws" ? fighter.r * 0.12 : fighter.r * 0.16;
    const scale = WEAPON_SCALE * (WEAPON_SCALE_BY_KEY[fighter.weaponKey] ?? 1);
    const dw = image.naturalWidth * scale;
    const dh = image.naturalHeight * scale;
    let angle = (Math.atan2(fy, fx) * 180) / Math.PI;
    angle = ((angle % 360) + 360) % 360;
    let bucket = Math.round(angle / WEAPON_ANGLE_STEP) * WEAPON_ANGLE_STEP;
    bucket = ((bucket % 360) + 360) % 360;
    ctx.save();
    ctx.translate(fighter.x + fx * forward, fighter.y + fy * forward);
    ctx.rotate((bucket * Math.PI) / 180);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(image, -dw / 2, -dh / 2, dw, dh);
    ctx.restore();
  }
}

function projectileSpawn(ent: Fighter): [number, number] {
  const [fx, fy] = norm(ent.facingX, ent.facingY, [1, 0]);
  const nudge = Math.max(2, ent.r * 0.08);
  return [ent.x + fx * nudge, ent.y + fy * nudge];
}

function rad(degrees: number) {
  return (degrees * Math.PI) / 180;
}

function uniform(lo: number, hi: number) {
  return lo + Math.random() * (hi - lo);
}

function strokeRect(
  ctx: CanvasRenderingContext2D,
  rect: Rect,
  fill: string,
  stroke: string,
  width: number,
) {
  ctx.fillStyle = fill;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  if (width > 0) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = width;
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
  }
}

function strokeLine(
  ctx: CanvasRenderingContext2D,
  beam: Laser,
  color: string,
  width: number,
) {
  ctx.beginPath();
  ctx.moveTo(beam.x1, beam.y1);
  ctx.lineTo(beam.x2, beam.y2);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
}

function drawAim(ctx: CanvasRenderingContext2D, fighter: Fighter, color: string) {
  const [fx, fy] = norm(fighter.facingX, fighter.facingY, [1, 0]);
  const tipLen = fighter.r + 12;
  const baseLen = fighter.r + 3;
  const baseHalf = 7;
  const px = -fy;
  const py = fx;
  const tipX = fighter.x + fx * tipLen;
  const tipY = fighter.y + fy * tipLen;
  const baseX = fighter.x + fx * baseLen;
  const baseY = fighter.y + fy * baseLen;
  ctx.beginPath();
  ctx.moveTo(tipX, tipY);
  ctx.lineTo(baseX + px * baseHalf, baseY + py * baseHalf);
  ctx.lineTo(baseX - px * baseHalf, baseY - py * baseHalf);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

function signature(view: GameView) {
  return JSON.stringify(view);
}

