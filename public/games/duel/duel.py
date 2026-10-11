import tkinter as tk
import time
import random
import math
from dataclasses import dataclass
from typing import List, Tuple, Dict, Optional


# =========================
# Core geometry + entities
# =========================

@dataclass
class Rect:
    x: float
    y: float
    w: float
    h: float

    def intersects(self, other: "Rect") -> bool:
        return not (
            self.x + self.w <= other.x or
            other.x + other.w <= self.x or
            self.y + self.h <= other.y or
            other.y + other.h <= self.y
        )


@dataclass
class Bullet:
    x: float
    y: float
    vx: float
    vy: float
    r: float
    damage: int
    from_enemy: bool
    item_id: int
    weapon_key: str  # NEW: needed for AOE behavior


@dataclass
class Weapon:
    key: str
    name: str
    kind: str                 # "gun" or "melee"
    damage: int
    cooldown: float
    range: float = 0.0        # melee range
    bullet_speed: float = 0.0 # gun speed
    pellet_count: int = 1     # shotgun style
    spread_deg: float = 0.0   # shotgun style

    aoe_radius: float = 0.0   # NEW: splash radius (px)
    aoe_damage: int = 0       # NEW: splash damage


@dataclass
class Player:
    x: float
    y: float
    r: float
    speed: float
    hp: int
    max_hp: int
    shield: int
    max_shield: int
    item_id: int
    aim_id: int

    facing_x: float = 1.0
    facing_y: float = 0.0
    weapon_key: str = "pistol"
    next_attack_time: float = 0.0

    @property
    def rect(self) -> Rect:
        return Rect(self.x - self.r, self.y - self.r, self.r * 2, self.r * 2)


@dataclass
class Enemy:
    x: float
    y: float
    r: float
    speed: float
    hp: int
    max_hp: int
    shield: int
    max_shield: int
    item_id: int
    aim_id: int

    facing_x: float = -1.0
    facing_y: float = 0.0
    weapon_key: str = "pistol"
    next_attack_time: float = 0.0

    @property
    def rect(self) -> Rect:
        return Rect(self.x - self.r, self.y - self.r, self.r * 2, self.r * 2)


@dataclass
class Level:
    name: str
    player_spawn: Tuple[float, float]
    enemy_spawns: List[Tuple[float, float]]
    walls: List[Rect]

    enemy_hp: int
    enemy_speed: float
    enemy_shield: int
    enemy_weapon_pool: List[str]


@dataclass
class ShopItem:
    key: str
    name: str
    desc: str
    cost: int


# =========================
# Game App
# =========================

class DuelGame:
    def __init__(self):
        self.root = tk.Tk()
        self.root.title("2D Duel: Shop + Loadouts + Multiple Enemies (Tkinter)")
        self.root.geometry("980x640")
        self.root.minsize(860, 560)

        self.canvas = tk.Canvas(self.root, bg="#0b1020", highlightthickness=0)
        self.canvas.pack(fill=tk.BOTH, expand=True)

        # HUD
        self.ui = tk.Frame(self.root, bg="#0b1020")
        self.ui.place(x=12, y=12)

        self.hud_label = tk.Label(self.ui, text="", fg="white", bg="#0b1020", font=("Helvetica", 14, "bold"))
        self.hud_label.pack(anchor="w")

        self.level_label = tk.Label(self.ui, text="", fg="#e5e7eb", bg="#0b1020", font=("Helvetica", 11, "bold"))
        self.level_label.pack(anchor="w", pady=(4, 0))

        self.tip_label = tk.Label(
            self.ui,
            text="Move: Arrows | Attack: F | Shop: S | Next level: N | Restart: R",
            fg="#cbd5e1",
            bg="#0b1020",
            font=("Helvetica", 10),
        )
        self.tip_label.pack(anchor="w", pady=(4, 0))

        # Input state
        self.keys = {"Left": False, "Right": False, "Up": False, "Down": False}

        # Focus-safe bindings
        self.root.bind_all("<KeyPress>", self.on_key_down, add=True)
        self.root.bind_all("<KeyRelease>", self.on_key_up, add=True)

        self.root.bind_all("<KeyPress-f>", self.on_attack, add=True)
        self.root.bind_all("<KeyPress-F>", self.on_attack, add=True)

        self.root.bind_all("<KeyPress-s>", self.toggle_shop, add=True)
        self.root.bind_all("<KeyPress-S>", self.toggle_shop, add=True)

        self.root.bind_all("<KeyPress-r>", self.restart_level, add=True)
        self.root.bind_all("<KeyPress-R>", self.restart_level, add=True)

        self.root.bind_all("<KeyPress-n>", self.next_level, add=True)
        self.root.bind_all("<KeyPress-N>", self.next_level, add=True)

        self.root.after(50, self._force_focus)

        # World containers
        self.obstacles: List[Tuple[Rect, int]] = []
        self.bullets: List[Bullet] = []
        self.enemies: List[Enemy] = []

        # Floating text
        self._float: List[Tuple[int, float]] = []

        # Explosion visuals: list of (item_id, t0, duration)
        self.explosions: List[Tuple[int, float, float]] = []

        # Timing
        self.last_time = time.time()

        # Meta progression
        self.money: int = 0
        self.level_index: int = 0

        # Flags
        self.game_over = False
        self.win = False
        self.shop_open = False

        # Weapons
        self.weapons: Dict[str, Weapon] = {
            "pistol": Weapon(key="pistol", name="Pistol", kind="gun", damage=12, cooldown=0.18, bullet_speed=560.0),
            "rifle": Weapon(key="rifle", name="Rifle", kind="gun", damage=9, cooldown=0.5, bullet_speed=710.0),
            "shotgun": Weapon(key="shotgun", name="Shotgun", kind="gun", damage=20, cooldown=0.42, bullet_speed=510.0, pellet_count=5, spread_deg=18.0),
            "sword": Weapon(key="sword", name="Sword", kind="melee", damage=18, cooldown=0.28, range=72.0),
            "claws": Weapon(key="claws", name="Claws", kind="melee", damage=23, cooldown=0.33, range=58.0),
            "rocket launcher":Weapon(key="rocket_launcher",name="RocketLauncher", kind="gun",damage= 50,cooldown=0.55,bullet_speed=480.6,aoe_radius=90,aoe_damage=25),
            # NEW: Blaster has AOE splash
            "blaster": Weapon(
                key="blaster",
                name="Blaster",
                kind="gun",
                damage=10,
                cooldown=0.16,
                bullet_speed=600.0,
                aoe_radius=85.0,   # splash radius
                aoe_damage=8       # splash damage to enemies in radius
            ),
        }

        # Shop catalog
        self.shop_items: List[ShopItem] = [
            ShopItem("buy_pistol", "Equip: Pistol", "Balanced shots.", 0),
            ShopItem("buy_rifle", "Equip: Rifle", "Fast fire, lower damage.", 250),
            ShopItem("buy_shotgun", "Equip: Shotgun", "Burst pellets with spread.", 450),
            ShopItem("buy_sword", "Equip: Sword", "High melee damage, no bullets.", 300),
            ShopItem("buy_blaster", "Equip: Blaster", "Explodes on impact for splash damage.", 600),
            ShopItem("buy_rocket_launcher","equip: Rocket Launcher", "big damage!!!!!!111 yay!!11 has splash dmg",1000),
            ShopItem("hp_up", "Max HP +20", "More health capacity.", 220),
            ShopItem("shield_up", "Max Shield +15", "Shield absorbs hits first.", 260),
            ShopItem("speed_up", "Move Speed +25", "Dodge more easily.", 280),
            ShopItem("claws","equip: claws","a stronger melee",500),
            ShopItem("heal", "Heal to Full", "Restore HP and shield.", 160),
        ]

        # Levels
        self.levels = self._make_levels()

        # Player created at load_level
        self.player: Player = None  # type: ignore

        # Shop overlay (scrollable)
        self.shop_frame = self._build_shop_ui()
        self.shop_frame.place_forget()

        # Start
        self.load_level(0, full_heal=True)
        self.loop()

    def _force_focus(self):
        try:
            self.root.focus_force()
            self.canvas.focus_set()
        except Exception:
            pass

    # -------------------------
    # Levels
    # -------------------------

    def _make_levels(self) -> List[Level]:
        return [
            Level(
                name="Level 1: Yard",
                player_spawn=(160, 320),
                enemy_spawns=[(820, 320)],
                walls=[
                    Rect(320, 90, 40, 460),
                    Rect(600, 90, 40, 460),
                    Rect(420, 260, 140, 40),
                ],
                enemy_hp=110,
                enemy_speed=110,
                enemy_shield=0,
                enemy_weapon_pool=["pistol", "claws"],
            ),
            Level(
                name="Level 2: Crossfire",
                player_spawn=(150, 120),
                enemy_spawns=[(830, 520), (820, 120)],
                walls=[
                    Rect(220, 140, 540, 36),
                    Rect(220, 460, 540, 36),
                    Rect(460, 220, 36, 200),
                    Rect(140, 300, 120, 36),
                    Rect(720, 300, 120, 36),
                ],
                enemy_hp=140,
                enemy_speed=125,
                enemy_shield=10,
                enemy_weapon_pool=["pistol", "blaster", "claws"],
            ),
            Level(
                name="Level 3: The Box",
                player_spawn=(140, 320),
                enemy_spawns=[(840, 320), (760, 220), (760, 420)],
                walls=[
                    Rect(260, 140, 460, 36),
                    Rect(260, 460, 460, 36),
                    Rect(260, 140, 36, 356),
                    Rect(684, 140, 36, 356),
                    Rect(430, 300, 120, 36),
                ],
                enemy_hp=180,
                enemy_speed=145,
                enemy_shield=18,
                enemy_weapon_pool=["rifle", "shotgun", "claws", "blaster"],
            ),
        ]

    def load_level(self, idx: int, full_heal: bool = False):
        self.level_index = idx
        self.game_over = False
        self.win = False

        # close shop on load
        self.shop_open = False
        self.shop_frame.place_forget()

        # clear world
        self.bullets.clear()
        self.enemies.clear()
        self._float.clear()
        self.explosions.clear()

        lvl = self.levels[self.level_index]
        px, py = lvl.player_spawn

        if self.player is None:
            self.player = Player(
                x=px, y=py, r=16, speed=270,
                hp=100, max_hp=100,
                shield=0, max_shield=0,
                item_id=-1, aim_id=-1,
                weapon_key="pistol",
            )
        else:
            self.player.x, self.player.y = px, py
            if full_heal:
                self.player.hp = self.player.max_hp
                self.player.shield = self.player.max_shield
            else:
                self.player.hp = max(1, min(self.player.hp, self.player.max_hp))
                self.player.shield = max(0, min(self.player.shield, self.player.max_shield))
            self.player.next_attack_time = 0.0

        for sx, sy in lvl.enemy_spawns:
            wk = random.choice(lvl.enemy_weapon_pool)
            e = Enemy(
                x=sx, y=sy, r=18, speed=lvl.enemy_speed,
                hp=lvl.enemy_hp, max_hp=lvl.enemy_hp,
                shield=lvl.enemy_shield, max_shield=lvl.enemy_shield,
                item_id=-1, aim_id=-1,
                weapon_key=wk,
            )
            self.enemies.append(e)

        self.build_map(lvl.walls)
        self.draw_entities()
        self.refresh_ui()
        self.refresh_shop_ui()

        self.root.after(10, self._force_focus)

    # -------------------------
    # Shop UI (SCROLLABLE)
    # -------------------------

    def _build_shop_ui(self) -> tk.Frame:
        frame = tk.Frame(self.root, bg="#0f172a", bd=3, relief="ridge")

        title = tk.Label(frame, text="SHOP (S to close)", bg="#0f172a", fg="white", font=("Helvetica", 14, "bold"))
        title.pack(anchor="w", padx=12, pady=(10, 6))

        self.shop_money_label = tk.Label(frame, text="", bg="#0f172a", fg="#e5e7eb", font=("Helvetica", 11, "bold"))
        self.shop_money_label.pack(anchor="w", padx=12, pady=(0, 10))

        container = tk.Frame(frame, bg="#0f172a")
        container.pack(fill=tk.BOTH, expand=True, padx=12, pady=(0, 10))

        self.shop_scroll_canvas = tk.Canvas(container, bg="#0f172a", highlightthickness=0)
        self.shop_scroll_canvas.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)

        self.shop_scrollbar = tk.Scrollbar(container, orient="vertical", command=self.shop_scroll_canvas.yview)
        self.shop_scrollbar.pack(side=tk.RIGHT, fill=tk.Y)

        self.shop_scroll_canvas.configure(yscrollcommand=self.shop_scrollbar.set)

        self.shop_items_frame = tk.Frame(self.shop_scroll_canvas, bg="#0f172a")
        self.shop_window_id = self.shop_scroll_canvas.create_window((0, 0), window=self.shop_items_frame, anchor="nw")

        def _on_items_configure(_event):
            self.shop_scroll_canvas.configure(scrollregion=self.shop_scroll_canvas.bbox("all"))

        def _on_canvas_configure(_event):
            self.shop_scroll_canvas.itemconfig(self.shop_window_id, width=self.shop_scroll_canvas.winfo_width())

        self.shop_items_frame.bind("<Configure>", _on_items_configure)
        self.shop_scroll_canvas.bind("<Configure>", _on_canvas_configure)

        def _wheel(event):
            if not self.shop_open:
                return
            if event.delta:
                self.shop_scroll_canvas.yview_scroll(int(-1 * (event.delta / 120)), "units")

        def _linux_wheel_up(_event):
            if self.shop_open:
                self.shop_scroll_canvas.yview_scroll(-3, "units")

        def _linux_wheel_down(_event):
            if self.shop_open:
                self.shop_scroll_canvas.yview_scroll(3, "units")

        for widget in (self.shop_scroll_canvas, self.shop_items_frame):
            widget.bind("<MouseWheel>", _wheel)
            widget.bind("<Button-4>", _linux_wheel_up)
            widget.bind("<Button-5>", _linux_wheel_down)

        self.shop_buttons: Dict[str, tk.Button] = {}
        for item in self.shop_items:
            row = tk.Frame(self.shop_items_frame, bg="#111827", padx=10, pady=8)
            row.pack(fill=tk.X, pady=6)

            name = tk.Label(row, text=item.name, bg="#111827", fg="white", font=("Helvetica", 11, "bold"))
            name.pack(anchor="w")

            desc = tk.Label(
                row,
                text=item.desc,
                bg="#111827",
                fg="#cbd5e1",
                font=("Helvetica", 9),
                wraplength=250,
                justify="left",
            )
            desc.pack(anchor="w", pady=(2, 6))

            cost_text = "FREE" if item.cost == 0 else f"${item.cost}"
            btn = tk.Button(row, text=f"Buy ({cost_text})", command=lambda k=item.key: self.buy_shop_item(k))
            btn.pack(anchor="e")
            self.shop_buttons[item.key] = btn

        footer = tk.Label(
            frame,
            text="Earn money by damaging enemies and clearing levels.\nBuy upgrades to survive tougher waves.",
            bg="#0f172a", fg="#94a3b8", font=("Helvetica", 9)
        )
        footer.pack(anchor="w", padx=12, pady=(0, 10))
        return frame

    def toggle_shop(self, _e=None):
        if self.game_over or self.win:
            return
        self.shop_open = not self.shop_open
        if self.shop_open:
            self.shop_frame.place(x=640, y=60, width=320, height=520)
            self._shop_scroll_to_top()
        else:
            self.shop_frame.place_forget()
            self.root.after(10, self._force_focus)
        self.refresh_shop_ui()

    def _shop_scroll_to_top(self):
        try:
            self.shop_scroll_canvas.yview_moveto(0.0)
        except Exception:
            pass

    def refresh_shop_ui(self):
        if not hasattr(self, "shop_money_label") or self.player is None:
            return
        weapon_name = self.weapons[self.player.weapon_key].name
        self.shop_money_label.config(text=f"Money: ${self.money}   Weapon: {weapon_name}")
        for item in self.shop_items:
            btn = self.shop_buttons.get(item.key)
            if btn is None:
                continue
            btn.config(state=tk.NORMAL if self.money >= item.cost else tk.DISABLED)

    def buy_shop_item(self, key: str):
        item = next((it for it in self.shop_items if it.key == key), None)
        if item is None or self.money < item.cost:
            return

        self.money -= item.cost

        if key == "buy_pistol":
            self.player.weapon_key = "pistol"
        elif key == "buy_rifle":
            self.player.weapon_key = "rifle"
        elif key == "buy_shotgun":
            self.player.weapon_key = "shotgun"
        elif key == "buy_sword":
            self.player.weapon_key = "sword"
        elif key == "buy_blaster":
            self.player.weapon_key = "blaster"
        elif key == "buy_rocket_launcher":
            self.player.weapon_key = "rocket_launcher"
        elif key == "buy_claws":
            self.player.weapon_key = "claws"
        elif key == "hp_up":
            self.player.max_hp += 20
            self.player.hp += 20
        elif key == "shield_up":
            self.player.max_shield += 15
            self.player.shield += 15
        elif key == "speed_up":
            self.player.speed += 25
        elif key == "heal":
            self.player.hp = self.player.max_hp
            self.player.shield = self.player.max_shield

        self.float_text(self.player.x, self.player.y - 36, "UPGRADED!", "#a7f3d0")
        self.refresh_shop_ui()
        self.refresh_ui()

    # -------------------------
    # Key handlers
    # -------------------------

    def on_key_down(self, e):
        if e.keysym in self.keys:
            self.keys[e.keysym] = True

    def on_key_up(self, e):
        if e.keysym in self.keys:
            self.keys[e.keysym] = False

    def restart_level(self, _e=None):
        for k in self.keys:
            self.keys[k] = False
        self.load_level(self.level_index, full_heal=True)
        self.canvas.focus_set()

    def next_level(self, _e=None):
        if not self.win:
            return
        if self.level_index + 1 < len(self.levels):
            self.load_level(self.level_index + 1, full_heal=False)
        else:
            self.load_level(0, full_heal=True)

    # -------------------------
    # Drawing
    # -------------------------

    def build_map(self, walls: List[Rect]):
        self.canvas.delete("all")
        self.obstacles.clear()

        random.seed(4)
        for _ in range(120):
            x = random.randint(0, 980)
            y = random.randint(0, 640)
            r = random.choice([1, 1, 2])
            self.canvas.create_oval(x - r, y - r, x + r, y + r, fill="#e5e7eb", outline="")

        for r in walls:
            cid = self.canvas.create_rectangle(
                r.x, r.y, r.x + r.w, r.y + r.h,
                fill="#111827", outline="#334155", width=2
            )
            self.obstacles.append((r, cid))

        border = [
            Rect(0, 0, 980, 18),
            Rect(0, 0, 18, 640),
            Rect(0, 640 - 18, 980, 18),
            Rect(980 - 18, 0, 18, 640),
        ]
        for r in border:
            cid = self.canvas.create_rectangle(r.x, r.y, r.x + r.w, r.y + r.h, fill="#0f172a", outline="#0f172a")
            self.obstacles.append((r, cid))

    def draw_entities(self):
        self.player.item_id = self.canvas.create_oval(
            self.player.x - self.player.r, self.player.y - self.player.r,
            self.player.x + self.player.r, self.player.y + self.player.r,
            fill="#34d399", outline="#052e2b", width=3
        )
        self.player.aim_id = self.canvas.create_polygon(0, 0, 0, 0, 0, 0, fill="#bbf7d0", outline="")
        self._update_aim_triangle(
            self.player.x, self.player.y, self.player.r,
            self.player.facing_x, self.player.facing_y, self.player.aim_id
        )

        for e in self.enemies:
            e.item_id = self.canvas.create_oval(
                e.x - e.r, e.y - e.r,
                e.x + e.r, e.y + e.r,
                fill="#fb7185", outline="#450a0a", width=3
            )
            e.aim_id = self.canvas.create_polygon(0, 0, 0, 0, 0, 0, fill="#fecdd3", outline="")
            self._update_aim_triangle(e.x, e.y, e.r, e.facing_x, e.facing_y, e.aim_id)

    def update_entity_draw(self):
        self.canvas.coords(
            self.player.item_id,
            self.player.x - self.player.r, self.player.y - self.player.r,
            self.player.x + self.player.r, self.player.y + self.player.r
        )
        self._update_aim_triangle(
            self.player.x, self.player.y, self.player.r,
            self.player.facing_x, self.player.facing_y, self.player.aim_id
        )

        for e in self.enemies:
            self.canvas.coords(e.item_id, e.x - e.r, e.y - e.r, e.x + e.r, e.y + e.r)
            self._update_aim_triangle(e.x, e.y, e.r, e.facing_x, e.facing_y, e.aim_id)

    def _update_aim_triangle(self, cx: float, cy: float, r: float, fx: float, fy: float, tri_id: int):
        mag = math.sqrt(fx * fx + fy * fy)
        if mag < 1e-6:
            fx, fy = 1.0, 0.0
            mag = 1.0
        fx /= mag
        fy /= mag

        tip_len = r + 12
        base_len = r + 3
        base_half = 7

        px = -fy
        py = fx

        tip_x = cx + fx * tip_len
        tip_y = cy + fy * tip_len
        base_x = cx + fx * base_len
        base_y = cy + fy * base_len

        p1x = base_x + px * base_half
        p1y = base_y + py * base_half
        p2x = base_x - px * base_half
        p2y = base_y - py * base_half

        self.canvas.coords(tri_id, tip_x, tip_y, p1x, p1y, p2x, p2y)

    # -------------------------
    # Collision + movement
    # -------------------------

    def blocked(self, rect: Rect) -> bool:
        for orect, _cid in self.obstacles:
            if rect.intersects(orect):
                return True
        return False

    def move_circle_with_collisions(self, x: float, y: float, r: float, dx: float, dy: float) -> Tuple[float, float]:
        new_x = x + dx
        test = Rect(new_x - r, y - r, 2 * r, 2 * r)
        if self.blocked(test):
            new_x = x

        new_y = y + dy
        test = Rect(new_x - r, new_y - r, 2 * r, 2 * r)
        if self.blocked(test):
            new_y = y

        return new_x, new_y

    def update_player(self, dt: float):
        if self.shop_open:
            return

        dx = 0.0
        dy = 0.0
        if self.keys["Left"]:
            dx -= 1.0
        if self.keys["Right"]:
            dx += 1.0
        if self.keys["Up"]:
            dy -= 1.0
        if self.keys["Down"]:
            dy += 1.0

        if dx != 0.0 or dy != 0.0:
            length = math.sqrt(dx * dx + dy * dy)
            dx /= length
            dy /= length

            self.player.facing_x = dx
            self.player.facing_y = dy

            step_x = dx * self.player.speed * dt
            step_y = dy * self.player.speed * dt
            self.player.x, self.player.y = self.move_circle_with_collisions(
                self.player.x, self.player.y, self.player.r, step_x, step_y
            )

    # -------------------------
    # Damage + rewards
    # -------------------------

    def apply_damage_to_player(self, dmg: int):
        if self.player.shield > 0:
            absorbed = min(self.player.shield, dmg)
            self.player.shield -= absorbed
            dmg -= absorbed
            self.float_text(self.player.x, self.player.y - 26, f"-{absorbed} SHIELD", "#a78bfa")
        if dmg > 0:
            self.player.hp -= dmg
            self.float_text(self.player.x, self.player.y - 26, f"-{dmg}", "#93c5fd")

    def apply_damage_to_enemy(self, e: Enemy, dmg: int):
        if e.shield > 0:
            absorbed = min(e.shield, dmg)
            e.shield -= absorbed
            dmg -= absorbed
            self.float_text(e.x, e.y - 26, f"-{absorbed} SHIELD", "#c4b5fd")
        if dmg > 0:
            e.hp -= dmg
            self.float_text(e.x, e.y - 26, f"-{dmg}", "#fbbf24")

        self.money += 2
        if e.hp <= 0:
            self.money += 40
            self.float_text(e.x, e.y - 44, "+$40", "#34d399")

    # -------------------------
    # AOE explosion logic (NEW)
    # -------------------------

    def explode_at(self, x: float, y: float, weapon: Weapon, hit_enemy: Optional[Enemy] = None):
        if weapon.aoe_radius <= 0 or weapon.aoe_damage <= 0:
            return

        # Visual ring
        rid = self.canvas.create_oval(
            x - weapon.aoe_radius, y - weapon.aoe_radius,
            x + weapon.aoe_radius, y + weapon.aoe_radius,
            outline="#fde68a", width=4
        )
        self.explosions.append((rid, time.time(), 0.18))

        # Splash damage to nearby enemies
        r2 = weapon.aoe_radius * weapon.aoe_radius
        for e in list(self.enemies):
            if e.hp <= 0:
                continue
            dx = e.x - x
            dy = e.y - y
            if dx * dx + dy * dy <= r2:
                # Avoid double-applying to the exact hit target if you want.
                # Here we still apply splash to everyone, including the hit target,
                # but we will reduce that by skipping hit_enemy.
                if hit_enemy is not None and e is hit_enemy:
                    continue
                self.apply_damage_to_enemy(e, weapon.aoe_damage)

        self.float_text(x, y - 22, "BOOM", "#fde68a")

    def update_explosions(self):
        keep = []
        for rid, t0, dur in self.explosions:
            age = time.time() - t0
            if age >= dur:
                self.canvas.delete(rid)
            else:
                keep.append((rid, t0, dur))
        self.explosions = keep

    # -------------------------
    # Attacks (guns + melee)
    # -------------------------

    def on_attack(self, _e=None):
        if self.shop_open or self.game_over or self.win:
            return

        now = time.time()
        w = self.weapons[self.player.weapon_key]
        if now < self.player.next_attack_time:
            return
        self.player.next_attack_time = now + w.cooldown

        if w.kind == "gun":
            self.fire_player_gun(w)
        else:
            self.player_melee_swing(w)

    def fire_player_gun(self, w: Weapon):
        fx, fy = self._norm(self.player.facing_x, self.player.facing_y, fallback=(1.0, 0.0))
        tip_x = self.player.x + fx * (self.player.r + 14)
        tip_y = self.player.y + fy * (self.player.r + 14)

        for _ in range(w.pellet_count):
            ang = math.atan2(fy, fx)
            if w.spread_deg > 0:
                ang += math.radians(random.uniform(-w.spread_deg, w.spread_deg))

            vx = math.cos(ang) * w.bullet_speed
            vy = math.sin(ang) * w.bullet_speed

            # Different bullet size for blaster so it feels chunky
            br = 6 if w.key == "blaster" else 5
            fill = "#f59e0b" if w.key == "blaster" else "#fbbf24"

            cid = self.canvas.create_oval(tip_x - br, tip_y - br, tip_x + br, tip_y + br, fill=fill, outline="")
            self.bullets.append(
                Bullet(
                    x=tip_x, y=tip_y, vx=vx, vy=vy, r=br,
                    damage=w.damage, from_enemy=False, item_id=cid,
                    weapon_key=w.key
                )
            )

    def player_melee_swing(self, w: Weapon):
        fx, fy = self._norm(self.player.facing_x, self.player.facing_y, fallback=(1.0, 0.0))
        for e in list(self.enemies):
            dx = e.x - self.player.x
            dy = e.y - self.player.y
            dist2 = dx * dx + dy * dy
            if dist2 > (w.range + e.r) ** 2:
                continue
            dist = max(1.0, math.sqrt(dist2))
            nx, ny = dx / dist, dy / dist
            if (nx * fx + ny * fy) > 0.2:
                self.apply_damage_to_enemy(e, w.damage)

    def enemy_attack(self, e: Enemy, now: float):
        w = self.weapons[e.weapon_key]
        if now < e.next_attack_time:
            return
        e.next_attack_time = now + w.cooldown

        dx = self.player.x - e.x
        dy = self.player.y - e.y
        fx, fy = self._norm(dx, dy, fallback=(-1.0, 0.0))
        e.facing_x, e.facing_y = fx, fy

        if w.kind == "gun":
            tip_x = e.x + fx * (e.r + 14)
            tip_y = e.y + fy * (e.r + 14)
            for _ in range(w.pellet_count):
                ang = math.atan2(fy, fx)
                if w.spread_deg > 0:
                    ang += math.radians(random.uniform(-w.spread_deg, w.spread_deg))
                vx = math.cos(ang) * (w.bullet_speed * 0.75)
                vy = math.sin(ang) * (w.bullet_speed * 0.75)
                cid = self.canvas.create_oval(tip_x - 4, tip_y - 4, tip_x + 4, tip_y + 4, fill="#93c5fd", outline="")
                self.bullets.append(
                    Bullet(
                        x=tip_x, y=tip_y, vx=vx, vy=vy, r=4,
                        damage=w.damage, from_enemy=True, item_id=cid,
                        weapon_key=w.key
                    )
                )
        else:
            dxp = self.player.x - e.x
            dyp = self.player.y - e.y
            dist2 = dxp * dxp + dyp * dyp
            if dist2 <= (w.range + self.player.r) ** 2:
                dist = max(1.0, math.sqrt(dist2))
                nx, ny = dxp / dist, dyp / dist
                if (nx * fx + ny * fy) > 0.2:
                    self.apply_damage_to_player(w.damage)

    # -------------------------
    # Bullets update (AOE on impact)
    # -------------------------

    def bullet_hits_wall(self, x: float, y: float, r: float) -> bool:
        brect = Rect(x - r, y - r, 2 * r, 2 * r)
        for orect, _cid in self.obstacles:
            if brect.intersects(orect):
                return True
        return False

    def update_bullets(self, dt: float):
        alive: List[Bullet] = []
        for b in self.bullets:
            b.x += b.vx * dt
            b.y += b.vy * dt

            # Wall collision
            if self.bullet_hits_wall(b.x, b.y, b.r):
                if (not b.from_enemy) and b.weapon_key == "blaster":
                    self.explode_at(b.x, b.y, self.weapons["blaster"])
                self.canvas.delete(b.item_id)
                continue

            if b.from_enemy:
                # Enemy bullets hitting player
                dx = b.x - self.player.x
                dy = b.y - self.player.y
                if dx * dx + dy * dy <= (b.r + self.player.r) ** 2:
                    self.apply_damage_to_player(b.damage)
                    self.canvas.delete(b.item_id)
                    continue
            else:
                # Player bullets hitting enemies
                hit_enemy: Optional[Enemy] = None
                for e in list(self.enemies):
                    dx = b.x - e.x
                    dy = b.y - e.y
                    if dx * dx + dy * dy <= (b.r + e.r) ** 2:
                        hit_enemy = e
                        break

                if hit_enemy is not None:
                    self.apply_damage_to_enemy(hit_enemy, b.damage)

                    # AOE explosion for blaster on enemy impact
                    if b.weapon_key == "blaster":
                        self.explode_at(b.x, b.y, self.weapons["blaster"], hit_enemy=hit_enemy)

                    self.canvas.delete(b.item_id)
                    continue

            # Keep on-screen
            if -60 <= b.x <= 1040 and -60 <= b.y <= 700:
                self.canvas.coords(b.item_id, b.x - b.r, b.y - b.r, b.x + b.r, b.y + b.r)
                alive.append(b)
            else:
                self.canvas.delete(b.item_id)

        self.bullets = alive

    # -------------------------
    # Enemy AI
    # -------------------------

    def update_enemies(self, dt: float):
        if self.shop_open:
            return

        now = time.time()
        desired = 240.0

        for e in list(self.enemies):
            if e.hp <= 0:
                self.canvas.delete(e.item_id)
                self.canvas.delete(e.aim_id)
                self.enemies.remove(e)
                continue

            dx = self.player.x - e.x
            dy = self.player.y - e.y
            dist = max(1.0, math.sqrt(dx * dx + dy * dy))

            w = self.weapons[e.weapon_key]
            target = 120.0 if (w.kind == "melee") else desired

            dir_x = dx / dist
            dir_y = dy / dist

            move_x = 0.0
            move_y = 0.0

            if dist > target:
                move_x = dir_x * e.speed * dt
                move_y = dir_y * e.speed * dt
            elif dist < target * 0.70:
                move_x = -dir_x * e.speed * dt
                move_y = -dir_y * e.speed * dt
            else:
                strafe = math.sin(time.time() * (1.6 + (e.x % 3))) * 0.8
                move_x = (-dir_y) * e.speed * 0.35 * dt * strafe
                move_y = (dir_x) * e.speed * 0.35 * dt * strafe

            e.x, e.y = self.move_circle_with_collisions(e.x, e.y, e.r, move_x, move_y)

            fx, fy = self._norm(dx, dy, fallback=(-1.0, 0.0))
            e.facing_x, e.facing_y = fx, fy
            self.enemy_attack(e, now)

    # -------------------------
    # Floating text + HUD
    # -------------------------

    def float_text(self, x: float, y: float, text: str, color: str):
        tid = self.canvas.create_text(x, y, text=text, fill=color, font=("Helvetica", 12, "bold"))
        self._float.append((tid, time.time()))

    def update_float_texts(self):
        keep = []
        for tid, t0 in self._float:
            age = time.time() - t0
            if age > 0.8:
                self.canvas.delete(tid)
            else:
                self.canvas.move(tid, 0, -1.5)
                keep.append((tid, t0))
        self._float = keep

    def refresh_ui(self):
        lvl = self.levels[self.level_index]
        weapon_name = self.weapons[self.player.weapon_key].name
        self.level_label.config(text=f"{lvl.name}   (Level {self.level_index + 1}/{len(self.levels)})")
        self.hud_label.config(
            text=f"HP {max(0, self.player.hp)}/{self.player.max_hp}   "
                 f"Shield {max(0, self.player.shield)}/{self.player.max_shield}   "
                 f"Enemies {len(self.enemies)}   Money ${self.money}   Weapon {weapon_name}"
        )

    # -------------------------
    # End screens
    # -------------------------

    def show_end_screen(self, title: str, subtitle: str, color: str):
        w = self.canvas.winfo_width()
        h = self.canvas.winfo_height()
        self.canvas.create_rectangle(0, 0, w, h, fill="#000000", stipple="gray25", outline="")
        self.canvas.create_text(w / 2, h / 2 - 20, text=title, fill=color, font=("Helvetica", 44, "bold"))
        self.canvas.create_text(w / 2, h / 2 + 30, text=subtitle, fill="#e5e7eb", font=("Helvetica", 14, "bold"))

    # -------------------------
    # Main loop
    # -------------------------

    def loop(self):
        now = time.time()
        dt = now - self.last_time
        self.last_time = now

        if not self.game_over and not self.win:
            self.update_player(dt)
            self.update_enemies(dt)
            self.update_bullets(dt)
            self.update_entity_draw()
            self.update_float_texts()
            self.update_explosions()
            self.refresh_ui()
            self.refresh_shop_ui()

            if self.player.hp <= 0:
                self.game_over = True
                self.show_end_screen("YOU LOSE", "Press R to restart", "#93c5fd")
                self.canvas.focus_set()
            elif len(self.enemies) == 0:
                self.win = True
                if self.level_index + 1 < len(self.levels):
                    self.money += 100
                    self.show_end_screen("LEVEL CLEAR", "Press N for next level or R to replay", "#34d399")
                else:
                    self.money += 200
                    self.show_end_screen("YOU WIN", "All levels cleared. Press N to loop or R to replay.", "#34d399")
                self.canvas.focus_set()

        self.root.after(16, self.loop)

    # -------------------------
    # Utility
    # -------------------------

    def _norm(self, x: float, y: float, fallback: Tuple[float, float]) -> Tuple[float, float]:
        mag = math.sqrt(x * x + y * y)
        if mag < 1e-6:
            return fallback
        return (x / mag, y / mag)

    def run(self):
        self.root.mainloop()


def main():
    DuelGame().run()


if __name__ == "__main__":
    main()
