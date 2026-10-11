import {
  BORDER,
  LEVELS,
  SHOP_ITEMS,
  STARFIELD,
  WEAPONS,
  WORLD_H,
  WORLD_W,
  type LevelDef,
  type ShopItem,
  type Weapon,
} from "./data";
import { intersects, norm, type Rect } from "./geometry";

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
};

export type Bullet = {
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
};

export type EndScreen = {
  title: string;
  subtitle: string;
  color: string;
};

export type ShopButton = ShopItem & {
  affordable: boolean;
  button: string;
};

export type ShopView = {
  open: boolean;
  money: number;
  weaponName: string;
  items: ShopButton[];
};

const FLOAT_STEP = 1.5 / 0.016;

export class DuelEngine {
  time = 0;
  money = 0;
  levelIndex = 0;
  gameOver = false;
  win = false;
  shopOpen = false;
  attackHeld = false;
  end: EndScreen | null = null;

  readonly keys = { left: false, right: false, up: false, down: false };
  readonly levels: readonly LevelDef[] = LEVELS;
  readonly weapons: Record<string, Weapon> = WEAPONS;
  readonly shopItems: readonly ShopItem[] = SHOP_ITEMS;

  player: Fighter;
  enemies: Fighter[] = [];
  bullets: Bullet[] = [];
  obstacles: Rect[] = [];
  private floaters: Floater[] = [];
  private explosions: Explosion[] = [];

  constructor() {
    this.player = {
      x: 160,
      y: 320,
      r: 16,
      speed: 270,
      hp: 100,
      maxHp: 100,
      shield: 0,
      maxShield: 0,
      facingX: 1,
      facingY: 0,
      weaponKey: "pistol",
      nextAttack: 0,
    };
    this.loadLevel(0, true);
  }

  setKey(key: keyof DuelEngine["keys"], down: boolean) {
    this.keys[key] = down;
  }

  setAttack(down: boolean) {
    this.attackHeld = down;
  }

  clearKeys() {
    this.keys.left = false;
    this.keys.right = false;
    this.keys.up = false;
    this.keys.down = false;
    this.attackHeld = false;
  }

  loadLevel(index: number, fullHeal: boolean) {
    this.levelIndex = index;
    this.gameOver = false;
    this.win = false;
    this.end = null;
    this.shopOpen = false;
    this.bullets = [];
    this.enemies = [];
    this.floaters = [];
    this.explosions = [];

    const level = this.levels[index];
    const [px, py] = level.playerSpawn;
    this.player.x = px;
    this.player.y = py;
    if (fullHeal) {
      this.player.hp = this.player.maxHp;
      this.player.shield = this.player.maxShield;
    } else {
      this.player.hp = Math.max(1, Math.min(this.player.hp, this.player.maxHp));
      this.player.shield = Math.max(
        0,
        Math.min(this.player.shield, this.player.maxShield),
      );
    }
    this.player.nextAttack = 0;

    for (const [sx, sy] of level.enemySpawns) {
      const pool = level.enemyWeaponPool;
      const weaponKey = pool[Math.floor(Math.random() * pool.length)] ?? "pistol";
      this.enemies.push({
        x: sx,
        y: sy,
        r: 18,
        speed: level.enemySpeed,
        hp: level.enemyHp,
        maxHp: level.enemyHp,
        shield: level.enemyShield,
        maxShield: level.enemyShield,
        facingX: -1,
        facingY: 0,
        weaponKey,
        nextAttack: 0,
      });
    }

    this.obstacles = [...level.walls, ...BORDER];
  }

  restart() {
    this.clearKeys();
    this.loadLevel(this.levelIndex, true);
  }

  nextLevel() {
    if (!this.win) {
      return;
    }
    if (this.levelIndex + 1 < this.levels.length) {
      this.loadLevel(this.levelIndex + 1, false);
    } else {
      this.loadLevel(0, true);
    }
  }

  toggleShop() {
    if (this.gameOver || this.win) {
      return;
    }
    this.shopOpen = !this.shopOpen;
  }

  buy(key: string) {
    const item = this.shopItems.find((entry) => entry.key === key);
    if (!item || this.money < item.cost) {
      return false;
    }

    this.money -= item.cost;
    const player = this.player;

    if (key === "buy_pistol") {
      player.weaponKey = "pistol";
    } else if (key === "buy_rifle") {
      player.weaponKey = "rifle";
    } else if (key === "buy_shotgun") {
      player.weaponKey = "shotgun";
    } else if (key === "buy_sword") {
      player.weaponKey = "sword";
    } else if (key === "buy_blaster") {
      player.weaponKey = "blaster";
    } else if (key === "buy_rocket_launcher") {
      player.weaponKey = "rocket_launcher";
    } else if (key === "claws") {
      // Catalog key is "claws"; the Tkinter handler only checks "buy_claws",
      // so the original button spends money and equips nothing.
      player.weaponKey = "claws";
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
    return true;
  }

  hudLine() {
    const player = this.player;
    const weaponName = this.weapons[player.weaponKey]?.name ?? player.weaponKey;
    return (
      `HP ${Math.max(0, player.hp)}/${player.maxHp}   ` +
      `Shield ${Math.max(0, player.shield)}/${player.maxShield}   ` +
      `Enemies ${this.enemies.length}   Money $${this.money}   Weapon ${weaponName}`
    );
  }

  levelLine() {
    const level = this.levels[this.levelIndex];
    return `${level.name}   (Level ${this.levelIndex + 1}/${this.levels.length})`;
  }

  shopSignature() {
    return `${this.shopOpen}|${this.money}|${this.player.weaponKey}`;
  }

  shopView(): ShopView {
    return {
      open: this.shopOpen,
      money: this.money,
      weaponName: this.weapons[this.player.weaponKey]?.name ?? this.player.weaponKey,
      items: this.shopItems.map((item) => ({
        ...item,
        affordable: this.money >= item.cost,
        button: `Buy (${item.cost === 0 ? "FREE" : `$${item.cost}`})`,
      })),
    };
  }

  update(dt: number) {
    if (dt <= 0) {
      return;
    }
    this.time += dt;
    if (this.gameOver || this.win) {
      return;
    }

    this.tryAttack();
    this.updatePlayer(dt);
    this.updateEnemies(dt);
    this.updateBullets(dt);
    this.updateFloaters(dt);
    this.updateExplosions();

    if (this.player.hp <= 0) {
      this.gameOver = true;
      this.end = {
        title: "YOU LOSE",
        subtitle: "Press R to restart",
        color: "#93c5fd",
      };
      return;
    }

    if (this.enemies.length === 0) {
      this.win = true;
      if (this.levelIndex + 1 < this.levels.length) {
        this.money += 100;
        this.end = {
          title: "LEVEL CLEAR",
          subtitle: "Press N for next level or R to replay",
          color: "#34d399",
        };
      } else {
        this.money += 200;
        this.end = {
          title: "YOU WIN",
          subtitle: "All levels cleared. Press N to loop or R to replay.",
          color: "#34d399",
        };
      }
    }
  }

  render(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = "#0b1020";
    ctx.fillRect(0, 0, WORLD_W, WORLD_H);

    ctx.fillStyle = "#e5e7eb";
    for (const [x, y, r] of STARFIELD) {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    const level = this.levels[this.levelIndex];
    for (const wall of level.walls) {
      strokeRect(ctx, wall, "#111827", "#334155", 2);
    }
    for (const edge of BORDER) {
      strokeRect(ctx, edge, "#0f172a", "#0f172a", 1);
    }

    drawFighter(ctx, this.player, "#34d399", "#052e2b", "#bbf7d0");
    for (const enemy of this.enemies) {
      drawFighter(ctx, enemy, "#fb7185", "#450a0a", "#fecdd3");
    }

    for (const bullet of this.bullets) {
      ctx.fillStyle = bullet.color;
      ctx.beginPath();
      ctx.arc(bullet.x, bullet.y, bullet.r, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const boom of this.explosions) {
      ctx.beginPath();
      ctx.arc(boom.x, boom.y, boom.radius, 0, Math.PI * 2);
      ctx.strokeStyle = "#fde68a";
      ctx.lineWidth = 4;
      ctx.stroke();
    }

    ctx.font = "bold 12px Helvetica, Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (const floater of this.floaters) {
      ctx.fillStyle = floater.color;
      ctx.fillText(floater.text, floater.x, floater.y);
    }

    if (this.end) {
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
    }
  }

  private tryAttack() {
    if (this.shopOpen || this.gameOver || this.win || !this.attackHeld) {
      return;
    }
    const weapon = this.weapons[this.player.weaponKey];
    if (!weapon || this.time < this.player.nextAttack) {
      return;
    }
    this.player.nextAttack = this.time + weapon.cooldown;
    if (weapon.kind === "gun") {
      this.fireGun(this.player, weapon, false);
    } else {
      this.playerMelee(weapon);
    }
  }

  private fireGun(owner: Fighter, weapon: Weapon, fromEnemy: boolean) {
    const fallback: [number, number] = fromEnemy ? [-1, 0] : [1, 0];
    const [fx, fy] = norm(owner.facingX, owner.facingY, fallback);
    const tipX = owner.x + fx * (owner.r + 14);
    const tipY = owner.y + fy * (owner.r + 14);
    const speed = fromEnemy ? weapon.bulletSpeed * 0.75 : weapon.bulletSpeed;

    for (let pellet = 0; pellet < weapon.pelletCount; pellet += 1) {
      let angle = Math.atan2(fy, fx);
      if (weapon.spreadDeg > 0) {
        const swing = (Math.random() * 2 - 1) * weapon.spreadDeg;
        angle += (swing * Math.PI) / 180;
      }
      let radius = 5;
      let color = "#fbbf24";
      if (fromEnemy) {
        radius = 4;
        color = "#93c5fd";
      } else if (weapon.key === "blaster") {
        radius = 6;
        color = "#f59e0b";
      }
      this.bullets.push({
        x: tipX,
        y: tipY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        r: radius,
        damage: weapon.damage,
        fromEnemy,
        weaponKey: weapon.key,
        color,
      });
    }
  }

  private playerMelee(weapon: Weapon) {
    const [fx, fy] = norm(this.player.facingX, this.player.facingY, [1, 0]);
    for (const enemy of this.enemies) {
      const dx = enemy.x - this.player.x;
      const dy = enemy.y - this.player.y;
      const dist2 = dx * dx + dy * dy;
      if (dist2 > (weapon.range + enemy.r) ** 2) {
        continue;
      }
      const dist = Math.max(1, Math.sqrt(dist2));
      if ((dx / dist) * fx + (dy / dist) * fy > 0.2) {
        this.damageEnemy(enemy, weapon.damage);
      }
    }
  }

  private enemyAttack(enemy: Fighter) {
    const weapon = this.weapons[enemy.weaponKey];
    if (!weapon || this.time < enemy.nextAttack) {
      return;
    }
    enemy.nextAttack = this.time + weapon.cooldown;

    const dx = this.player.x - enemy.x;
    const dy = this.player.y - enemy.y;
    const [fx, fy] = norm(dx, dy, [-1, 0]);
    enemy.facingX = fx;
    enemy.facingY = fy;

    if (weapon.kind === "gun") {
      this.fireGun(enemy, weapon, true);
      return;
    }

    const dist2 = dx * dx + dy * dy;
    if (dist2 > (weapon.range + this.player.r) ** 2) {
      return;
    }
    const dist = Math.max(1, Math.sqrt(dist2));
    if ((dx / dist) * fx + (dy / dist) * fy > 0.2) {
      this.damagePlayer(weapon.damage);
    }
  }

  private updatePlayer(dt: number) {
    if (this.shopOpen) {
      return;
    }
    let dx = 0;
    let dy = 0;
    if (this.keys.left) dx -= 1;
    if (this.keys.right) dx += 1;
    if (this.keys.up) dy -= 1;
    if (this.keys.down) dy += 1;
    if (dx === 0 && dy === 0) {
      return;
    }
    const length = Math.hypot(dx, dy);
    dx /= length;
    dy /= length;
    this.player.facingX = dx;
    this.player.facingY = dy;
    const [x, y] = this.moveCircle(
      this.player.x,
      this.player.y,
      this.player.r,
      dx * this.player.speed * dt,
      dy * this.player.speed * dt,
    );
    this.player.x = x;
    this.player.y = y;
  }

  private updateEnemies(dt: number) {
    if (this.shopOpen) {
      return;
    }
    const desired = 240;
    const survivors: Fighter[] = [];
    for (const enemy of this.enemies) {
      if (enemy.hp <= 0) {
        continue;
      }
      const dx = this.player.x - enemy.x;
      const dy = this.player.y - enemy.y;
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
        const strafe = Math.sin(this.time * (1.6 + (enemy.x % 3))) * 0.8;
        moveX = -dirY * enemy.speed * 0.35 * dt * strafe;
        moveY = dirX * enemy.speed * 0.35 * dt * strafe;
      }
      const [x, y] = this.moveCircle(enemy.x, enemy.y, enemy.r, moveX, moveY);
      enemy.x = x;
      enemy.y = y;
      const [fx, fy] = norm(dx, dy, [-1, 0]);
      enemy.facingX = fx;
      enemy.facingY = fy;
      this.enemyAttack(enemy);
      survivors.push(enemy);
    }
    this.enemies = survivors;
  }

  private updateBullets(dt: number) {
    const alive: Bullet[] = [];
    for (const bullet of this.bullets) {
      bullet.x += bullet.vx * dt;
      bullet.y += bullet.vy * dt;

      if (this.bulletHitsWall(bullet)) {
        if (!bullet.fromEnemy) {
          this.splash(bullet, null);
        }
        continue;
      }

      if (bullet.fromEnemy) {
        const dx = bullet.x - this.player.x;
        const dy = bullet.y - this.player.y;
        if (dx * dx + dy * dy <= (bullet.r + this.player.r) ** 2) {
          this.damagePlayer(bullet.damage);
          continue;
        }
      } else {
        let hit: Fighter | null = null;
        for (const enemy of this.enemies) {
          const dx = bullet.x - enemy.x;
          const dy = bullet.y - enemy.y;
          if (dx * dx + dy * dy <= (bullet.r + enemy.r) ** 2) {
            hit = enemy;
            break;
          }
        }
        if (hit) {
          this.damageEnemy(hit, bullet.damage);
          this.splash(bullet, hit);
          continue;
        }
      }

      if (bullet.x >= -60 && bullet.x <= 1040 && bullet.y >= -60 && bullet.y <= 700) {
        alive.push(bullet);
      }
    }
    this.bullets = alive;
  }

  private splash(bullet: Bullet, hit: Fighter | null) {
    if (bullet.fromEnemy) {
      return;
    }
    const weapon = this.weapons[bullet.weaponKey];
    // Tkinter only explodes weapon_key == "blaster" and always uses the
    // blaster stats. Rocket shots carry aoe fields and the shop says they
    // splash, so any player gun with those stats explodes using its own numbers.
    if (!weapon || weapon.aoeRadius <= 0 || weapon.aoeDamage <= 0) {
      return;
    }
    this.explodeAt(bullet.x, bullet.y, weapon, hit);
  }

  private explodeAt(x: number, y: number, weapon: Weapon, hit: Fighter | null) {
    if (weapon.aoeRadius <= 0 || weapon.aoeDamage <= 0) {
      return;
    }
    this.explosions.push({
      x,
      y,
      radius: weapon.aoeRadius,
      born: this.time,
      duration: 0.18,
    });
    const reach = weapon.aoeRadius * weapon.aoeRadius;
    for (const enemy of this.enemies) {
      if (enemy.hp <= 0 || enemy === hit) {
        continue;
      }
      const dx = enemy.x - x;
      const dy = enemy.y - y;
      if (dx * dx + dy * dy <= reach) {
        this.damageEnemy(enemy, weapon.aoeDamage);
      }
    }
    this.floatText(x, y - 22, "BOOM", "#fde68a");
  }

  private updateExplosions() {
    this.explosions = this.explosions.filter(
      (boom) => this.time - boom.born < boom.duration,
    );
  }

  private updateFloaters(dt: number) {
    const next: Floater[] = [];
    for (const floater of this.floaters) {
      if (this.time - floater.born > 0.8) {
        continue;
      }
      floater.y -= FLOAT_STEP * dt;
      next.push(floater);
    }
    this.floaters = next;
  }

  private damagePlayer(amount: number) {
    let dmg = amount;
    if (this.player.shield > 0) {
      const absorbed = Math.min(this.player.shield, dmg);
      this.player.shield -= absorbed;
      dmg -= absorbed;
      this.floatText(
        this.player.x,
        this.player.y - 26,
        `-${absorbed} SHIELD`,
        "#a78bfa",
      );
    }
    if (dmg > 0) {
      this.player.hp -= dmg;
      this.floatText(this.player.x, this.player.y - 26, `-${dmg}`, "#93c5fd");
    }
  }

  private damageEnemy(enemy: Fighter, amount: number) {
    let dmg = amount;
    if (enemy.shield > 0) {
      const absorbed = Math.min(enemy.shield, dmg);
      enemy.shield -= absorbed;
      dmg -= absorbed;
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

  private floatText(x: number, y: number, text: string, color: string) {
    this.floaters.push({ x, y, text, color, born: this.time });
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
    const rect = {
      x: bullet.x - bullet.r,
      y: bullet.y - bullet.r,
      w: bullet.r * 2,
      h: bullet.r * 2,
    };
    return this.obstacles.some((obstacle) => intersects(rect, obstacle));
  }
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

function drawFighter(
  ctx: CanvasRenderingContext2D,
  fighter: Fighter,
  fill: string,
  outline: string,
  aim: string,
) {
  ctx.beginPath();
  ctx.arc(fighter.x, fighter.y, fighter.r, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = outline;
  ctx.stroke();

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
  ctx.fillStyle = aim;
  ctx.fill();
}
