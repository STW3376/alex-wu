import tkinter as tk
import time
import random
import math
import os
from dataclasses import dataclass
from typing import List, Tuple, Dict, Optional

# Pillow is required for rotated weapon sprites (recommended)
try:
    from PIL import Image, ImageTk
    PIL_AVAILABLE = True
except Exception:
    Image = None  # type: ignore
    ImageTk = None  # type: ignore
    PIL_AVAILABLE = False

# Optional music support (mp3)
try:
    import pygame
    PYGAME_AVAILABLE = True
except Exception:
    pygame = None  # type: ignore
    PYGAME_AVAILABLE = False


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
    weapon_key: str


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
    aoe_radius: float = 0.0   # splash radius (px)
    aoe_damage: int = 0       # splash damage


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
    weapon_item_id: int = -1  # canvas id for weapon sprite


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
    weapon_item_id: int = -1  # canvas id for weapon sprite


    facing_x: float = -1.0
    facing_y: float = 0.0
    weapon_key: str = "pistol"
    next_attack_time: float = 0.0

    @property
    def rect(self) -> Rect:
        return Rect(self.x - self.r, self.y - self.r, self.r * 2, self.r * 2)


@dataclass
class Boss:
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
    weapon_item_id: int = -1  # canvas id for weapon sprite


    facing_x: float = -1.0
    facing_y: float = 0.0
    weapon_key: str = "rocket_launcher"
    next_attack_time: float = 0.0

    # Sprite support
    sprite_key: str = ""
    sprite_img: Optional[tk.PhotoImage] = None

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
    boss_spawn: Optional[Tuple[float, float]] = None
    boss_hp: int = 0
    boss_speed: float = 0
    boss_shield: int = 0
    boss_weapon: str = "rocket_launcher"


@dataclass
class ShopItem:
    key: str
    name: str
    desc: str
    cost: int


@dataclass
class LaserBeam:
    ids: List[int]   # canvas item ids for glow layers
    t0: float
    dur: float


@dataclass
class Landmine:
    x: float
    y: float
    r: float
    damage: int
    item_id: int
    glow_id: int


# =========================
# Game App
# =========================

class DuelGame:
    def __init__(self):
        self.root = tk.Tk()
        self.root.title("2D Duel: Shop + Loadouts + Multiple Enemies (Tkinter)")
        self.root.geometry("980x640")
        self.root.minsize(860, 560)
        self.root.configure(bg="#0b1020")

        self.canvas = tk.Canvas(self.root, bg="#0b1020", highlightthickness=0)
        self.canvas.pack(fill=tk.BOTH, expand=True)
        # Screen state
        self.screen = "menu"  # "menu" | "settings" | "game" | "pause"
        self.settings_return_to = "menu"  # "menu" | "pause"

        # Sandbox state
        self.sandbox_mode = False
        self.sandbox_rects: List[Rect] = []
        self.sandbox_enemy_loadout: List[str] = []
        self.sandbox_enemy_count_last = 0

        # Settings (toggles)
        self.opt_aim_by_mouse = tk.BooleanVar(value=False)
        self.opt_show_arrow = tk.BooleanVar(value=True)
        self.opt_show_weapon_sprites = tk.BooleanVar(value=True)

        # Mouse aim tracking
        self.mouse_x = 0
        self.mouse_y = 0
        self.canvas.bind("<Motion>", self.on_mouse_move)

        # Music (optional, uses pygame if available)
        self.music_enabled = True
        self.music_path = None
        self._music_started = False


        # Load boss PNG sprites (keep references here so they stay alive)
        # Put your PNG at: assets/boss15.png
        self.boss_sprites: Dict[str, Optional[tk.PhotoImage]] = {}
        try:
            img = tk.PhotoImage(file="assets/boss15.png")
            # If you want scaling, use integer zoom/subsample:
            img = img.zoom(4, 4)       # enlarge 4x
            self.boss_sprites["level15"] = img
        except Exception as ex:
            print("Could not load assets/boss15.png:", ex)
            self.boss_sprites["level15"] = None
        # Weapon sprites (in-hands) + rotation cache
        # Put these PNGs in your project folder:
        #   assets/pistol.png
        #   assets/rifle.png
        #   assets/blaster.png
        #   assets/rocket_launcher.png
        #   assets/sword.png
        #   assets/claws.png
        #
        # Smaller number means smaller on-screen sprites.
        self.weapon_scale = 0.12


        self.weapon_scale_by_key = {
            "pistol": 1.00,
            "rifle": 0.95,
            "blaster": 0.95,
            "rocket_launcher": 0.85,
            "sword": 0.95,
            "claws": 0.95,
        }

        # Rotation is cached in discrete angle steps for performance.
        self.weapon_angle_step = 6  # degrees per cache step

        # If your base art points a different direction (not right), tweak offsets here.
        self.weapon_base_angle_offset: Dict[str, float] = {
            "pistol": 0.0,
            "rifle": 0.0,
            "blaster": 0.0,
            "rocket_launcher": 0.0,
            "sword": 0.0,
            "claws": 0.0,
        }

        # Pillow-backed rotated sprites (recommended)
        self.weapon_pil_base: Dict[str, object] = {}
        self.weapon_muzzle_len: Dict[str, float] = {}
        self.weapon_rot_cache: Dict[Tuple[str, int], object] = {}

        # Fallback (no rotation) if Pillow is not installed
        self.weapon_sprites: Dict[str, tk.PhotoImage] = {}

        self._load_weapon_assets()

        # HUD container
        self.ui = tk.Frame(self.root, bg="#0b1020")
        self.ui.place(x=12, y=12)

        self.hud_label = tk.Label(self.ui, text="", fg="white", bg="#0b1020", font=("Helvetica", 14, "bold"))
        self.hud_label.pack(anchor="w")

        self.level_label = tk.Label(self.ui, text="", fg="#e5e7eb", bg="#0b1020", font=("Helvetica", 11, "bold"))
        self.level_label.pack(anchor="w", pady=(4, 0))

        self.tip_label = tk.Label(
            self.ui,
            text="",
            fg="#cbd5e1",
            bg="#0b1020",
            font=("Helvetica", 10),
        )
        self.tip_label.pack(anchor="w", pady=(4, 0))

        # Shop open button (top-right)
        self.shop_btn = tk.Button(
            self.root,
            text="Shop",
            command=self.toggle_shop,
            padx=12,
            pady=6
        )
        self.shop_btn.place(x=980 - 90, y=10)  # will be corrected on resize
        self.root.bind("<Configure>", self._on_resize)

        # Boss bar (hidden unless boss is alive)
        self.boss_name_label = tk.Label(
            self.root, text="", fg="#fecdd3", bg="#0b1020", font=("Helvetica", 12, "bold")
        )
        self.boss_bar_canvas = tk.Canvas(self.root, width=520, height=18, bg="#0b1020", highlightthickness=0)
        self._boss_bar_bg = self.boss_bar_canvas.create_rectangle(2, 2, 518, 16, fill="#111827", outline="#334155", width=2)
        self._boss_bar_fill = self.boss_bar_canvas.create_rectangle(4, 4, 4, 14, fill="#fb7185", outline="")

        # Input state / configurable controls
        self.keybinds = {
            "move_up": "w",
            "move_left": "a",
            "move_down": "s",
            "move_right": "d",
            "attack": "space",
            "restart": "r",
            "next_level": "n",
            "menu": "escape",
        }
        self.keys = {
            "move_up": False,
            "move_left": False,
            "move_down": False,
            "move_right": False,
        }
        self.rebinding_action: Optional[str] = None
        self.keybind_buttons: Dict[str, tk.Button] = {}

        # Sandbox config vars
        self.sb_player_hp = tk.IntVar(value=400)
        self.sb_player_shield = tk.IntVar(value=100)
        self.sb_player_speed = tk.IntVar(value=320)
        self.sb_enemy_count = tk.IntVar(value=3)
        self.sb_enemy_hp = tk.IntVar(value=180)
        self.sb_enemy_speed = tk.IntVar(value=145)
        self.sb_enemy_shield = tk.IntVar(value=0)
        self.sb_weapon_kind = tk.StringVar(value="gun")
        self.sb_weapon_damage = tk.IntVar(value=25)
        self.sb_weapon_cooldown = tk.DoubleVar(value=0.12)
        self.sb_weapon_bullet_speed = tk.DoubleVar(value=720.0)
        self.sb_weapon_range = tk.DoubleVar(value=72.0)
        self.sb_weapon_pellets = tk.IntVar(value=1)
        self.sb_weapon_spread = tk.DoubleVar(value=0.0)
        self.sb_weapon_aoe_radius = tk.DoubleVar(value=0.0)
        self.sb_weapon_aoe_damage = tk.IntVar(value=0)
        self.sb_rect_x = tk.IntVar(value=420)
        self.sb_rect_y = tk.IntVar(value=260)
        self.sb_rect_w = tk.IntVar(value=120)
        self.sb_rect_h = tk.IntVar(value=40)
        self.sb_enemy_weapon_vars = [tk.StringVar(value="pistol") for _ in range(8)]

        # Hold-to-fire
        self.attack_held = False

        # Focus-safe bindings
        self.root.bind_all("<KeyPress>", self.on_key_down, add=True)
        self.root.bind_all("<KeyRelease>", self.on_key_up, add=True)

        self.root.after(50, self._force_focus)

        # World containers
        self.obstacles: List[Tuple[Rect, int]] = []
        self.bullets: List[Bullet] = []
        self.enemies: List[Enemy] = []
        self.boss: Optional[Boss] = None

        # Floating text
        self._float: List[Tuple[int, float]] = []

        # Explosion visuals: list of (item_id, t0, duration)
        self.explosions: List[Tuple[int, float, float]] = []

        # Railcannon laser visuals
        self.lasers: List[LaserBeam] = []

        # Landmines
        self.landmines: List[Landmine] = []
        self.landmine_max_charges = 3
        self.landmine_charges = 3
        self.landmine_recharge_seconds = 15.0
        self.landmine_recharge_queue: List[float] = []

        # Timing
        self.last_time = time.time()

        # Meta progression
        self.money: int = 937830623970
        self.level_index: int = 0

        # Owned weapons: once bought, free forever in the shop
        self.owned_weapons = set(["pistol"])

        # Boss-weapon unlock flags (persist during this run)
        self.unlocked_chunkier = False   # unlocked by beating Level 10 boss
        self.unlocked_pukeko = False     # unlocked by beating Level 15 boss

        # Flags
        self.game_over = False
        self.win = False
        self.shop_open = False

        # Win-screen extra line for unlock messaging
        self._pending_unlock_message: Optional[str] = None

        # Weapons
        self.weapons: Dict[str, Weapon] = {
            "pistol": Weapon(key="pistol", name="Pistol", kind="gun", damage=12, cooldown=0.18, bullet_speed=560.0),
            "rifle": Weapon(key="rifle", name="Rifle", kind="gun", damage=9, cooldown=0.09, bullet_speed=710.0),
            "shotgun": Weapon(key="shotgun", name="Shotgun", kind="gun", damage=20, cooldown=0.42, bullet_speed=510.0, pellet_count=5, spread_deg=18.0),
            "sword": Weapon(key="sword", name="Sword", kind="melee", damage=18, cooldown=0.28, range=72.0),
            "claws": Weapon(key="claws", name="Claws", kind="melee", damage=23, cooldown=0.33, range=58.0),
            "rocket_launcher": Weapon(key="rocket_launcher", name="RocketLauncher", kind="gun", damage=50, cooldown=0.55, bullet_speed=480.6, aoe_radius=90, aoe_damage=25),
            "minigun": Weapon(key="minigun", name="Minigun", kind="gun", damage=15, cooldown=0.03, bullet_speed=1000),
            "railcannon": Weapon(key="railcannon", name="Railcannon", kind="gun", damage=100, cooldown=0.55, bullet_speed=0.0, aoe_radius=150, aoe_damage=50),
            "blaster": Weapon(key="blaster", name="Blaster", kind="gun", damage=10, cooldown=0.16, bullet_speed=600.0, aoe_radius=85.0, aoe_damage=8),
            "chunkier_gun": Weapon(key="chunkier_gun", name="ChunkierGun", kind="gun", damage=99, cooldown=0.77, bullet_speed=450, aoe_radius=100, aoe_damage=49),
            "pukeko": Weapon(key="pukeko", name="Pukeko", kind="gun", damage=200, cooldown=0.66, bullet_speed=490.2),
            "landmine": Weapon(key="landmine", name="Landmine", kind="gun", damage=500, cooldown=0.15, bullet_speed=0.0),
        }

        # Shop catalog (normal shop is populated from start)
        self.shop_items: List[ShopItem] = [
            ShopItem("buy_pistol", "Equip: Pistol", "Balanced shots.", 0),
            ShopItem("buy_rifle", "Equip: Rifle", "Fast fire, lower damage.", 250),
            ShopItem("buy_shotgun", "Equip: Shotgun", "Burst pellets with spread.", 450),
            ShopItem("buy_sword", "Equip: Sword", "High melee damage, no bullets.", 300),
            ShopItem("buy_blaster", "Equip: Blaster", "Explodes on impact for splash damage.", 600),
            ShopItem("buy_rocket_launcher", "Equip: Rocket Launcher", "Big damage, splash hits.", 1000),
            ShopItem("buy_minigun", "Equip: Minigun", "Very fast fire.", 1200),
            ShopItem("buy_railcannon", "Equip: Railcannon", "IS THAT AN ULTRAKILL REFERENCE", 2500),
            ShopItem("buy_claws", "Equip: Claws", "Stronger melee.", 500),
            ShopItem("buy_landmine", "Equip: Landmine", "Place up to 3 mines. 500 dmg. 15s recharge after explosion.", 900),
            ShopItem("hp_up", "Max HP +20", "More health capacity.", 220),
            ShopItem("shield_up", "Max Shield +15", "Shield absorbs hits first.", 260),
            ShopItem("speed_up", "Move Speed +25", "Dodge more easily.", 280),
            ShopItem("heal", "Heal to Full", "Restore HP and shield.", 160),
        ]

        # Boss weapon page items (free equips, gated by unlocks)
        self.boss_shop_items: List[ShopItem] = [
            ShopItem("equip_chunkier_gun", "Equip: ChunkierGun", "Unlocked by beating Level 10 boss.", 0),
            ShopItem("equip_pukeko", "Equip: Pukeko", "Unlocked by beating Level 15 boss.", 0),
        ]

        # Levels
        self.levels = self._make_levels()

        # Player created at load_level
        self.player: Player = None  # type: ignore

        # Shop overlay (two tabs)
        self.shop_frame = self._build_shop_ui()
        self.shop_frame.place_forget()

        # Main menu (game starts on Play)
        self._build_main_menu_ui()
        self._update_tip_label()
        # Auto-load background music if present
        if os.path.exists("assets/music.mp3"):
            self.set_music("assets/music.mp3")
        self._show_menu()
        self.loop()

    def _on_resize(self, _e=None):
        # keep shop button top-right
        w = self.root.winfo_width()
        self.shop_btn.place(x=max(10, w - 90), y=10)

    def _load_weapon_assets(self):
        """Load weapon images from assets/ and pre-scale them.

        If Pillow is available, we keep a scaled RGBA base image per weapon and generate
        rotated ImageTk.PhotoImage objects on demand, cached by angle bucket.
        """
        files = {
            "pistol": "assets/pistol.png",
            "rifle": "assets/rifle.png",
            "blaster": "assets/blaster.png",
            "rocket_launcher": "assets/rocket_launcher.png",
            "sword": "assets/sword.png",
            "claws": "assets/claws.png",
        }

        # Clear any previous caches
        self.weapon_pil_base.clear()
        self.weapon_sprites.clear()
        self.weapon_muzzle_len.clear()
        self.weapon_rot_cache.clear()

        if PIL_AVAILABLE and Image is not None:
            for wk, fp in files.items():
                try:
                    im = Image.open(fp).convert("RGBA")
                    w, h = im.size
                    scale = float(self.weapon_scale) * float(getattr(self, 'weapon_scale_by_key', {}).get(wk, 1.0))
                    new_w = max(1, int(w * scale))
                    new_h = max(1, int(h * scale))
                    if new_w != w or new_h != h:
                        im = im.resize((new_w, new_h), resample=Image.LANCZOS)
                    self.weapon_pil_base[wk] = im
                    self.weapon_muzzle_len[wk] = max(10.0, im.size[0] * 0.55)
                except Exception as ex:
                    print(f"Could not load {fp}: {ex}")
            return

        # Fallback (no rotation): Tk PhotoImage only supports integer subsample/zoom
        # so we approximate scaling with subsample.
        subsample = max(1, int(round(1.0 / max(0.05, float(self.weapon_scale)))))
        subsample = min(subsample, 10)
        for wk, fp in files.items():
            try:
                img = tk.PhotoImage(file=fp)
                if subsample > 1:
                    img = img.subsample(subsample, subsample)
                self.weapon_sprites[wk] = img
                self.weapon_muzzle_len[wk] = max(10.0, img.width() * 0.55)
            except Exception as ex:
                print(f"Could not load {fp}: {ex}")


    def _force_focus(self):
        try:
            self.root.focus_force()
            self.canvas.focus_set()
        except Exception:
            pass
    # -------------------------
    # Main menu + settings
    # -------------------------

    def _build_main_menu_ui(self):
        # Main menu overlay
        self.menu_frame = tk.Frame(self.root, bg="#0b1020")
        self.menu_frame.place(x=0, y=0, relwidth=1.0, relheight=1.0)

        inner = tk.Frame(self.menu_frame, bg="#0b1020")
        inner.place(relx=0.5, rely=0.5, anchor="center")

        title = tk.Label(inner, text="2D DUEL", fg="white", bg="#0b1020", font=("Helvetica", 28, "bold"))
        title.pack(pady=(0, 18))

        play_btn = tk.Button(inner, text="Play", command=self.start_game, padx=22, pady=10)
        play_btn.pack(pady=6, fill=tk.X)

        sandbox_btn = tk.Button(inner, text="Sandbox", command=self.show_sandbox_builder, padx=22, pady=10)
        sandbox_btn.pack(pady=6, fill=tk.X)

        settings_btn = tk.Button(inner, text="Settings", command=lambda: self.show_settings(return_to="menu"), padx=22, pady=10)
        settings_btn.pack(pady=6, fill=tk.X)

        quit_btn = tk.Button(inner, text="Quit", command=self.root.destroy, padx=22, pady=10)
        quit_btn.pack(pady=(18, 0), fill=tk.X)

        # Settings overlay
        self.settings_frame = tk.Frame(self.root, bg="#0b1020")
        self.settings_frame.place(x=0, y=0, relwidth=1.0, relheight=1.0)

        sin = tk.Frame(self.settings_frame, bg="#0b1020")
        sin.place(relx=0.5, rely=0.5, anchor="center")

        st = tk.Label(sin, text="Settings", fg="white", bg="#0b1020", font=("Helvetica", 22, "bold"))
        st.pack(pady=(0, 14))

        cb1 = tk.Checkbutton(
            sin,
            text="Aim follows mouse",
            variable=self.opt_aim_by_mouse,
            onvalue=True,
            offvalue=False,
            bg="#0b1020",
            fg="white",
            selectcolor="#111827",
            activebackground="#0b1020",
            activeforeground="white",
        )
        cb1.pack(anchor="w", pady=6)

        cb2 = tk.Checkbutton(
            sin,
            text="Show direction arrow",
            variable=self.opt_show_arrow,
            onvalue=True,
            offvalue=False,
            bg="#0b1020",
            fg="white",
            selectcolor="#111827",
            activebackground="#0b1020",
            activeforeground="white",
            command=self._apply_visual_toggles_now,
        )
        cb2.pack(anchor="w", pady=6)

        cb3 = tk.Checkbutton(
            sin,
            text="Show weapon sprites",
            variable=self.opt_show_weapon_sprites,
            onvalue=True,
            offvalue=False,
            bg="#0b1020",
            fg="white",
            selectcolor="#111827",
            activebackground="#0b1020",
            activeforeground="white",
            command=self._apply_visual_toggles_now,
        )
        cb3.pack(anchor="w", pady=6)

        controls_label = tk.Label(
            sin,
            text="Controls",
            fg="white",
            bg="#0b1020",
            font=("Helvetica", 14, "bold"),
        )
        controls_label.pack(anchor="w", pady=(16, 8))

        keybind_frame = tk.Frame(sin, bg="#0b1020")
        keybind_frame.pack(fill=tk.X, pady=(0, 8))

        self._build_keybind_row(keybind_frame, "Move Up", "move_up")
        self._build_keybind_row(keybind_frame, "Move Left", "move_left")
        self._build_keybind_row(keybind_frame, "Move Down", "move_down")
        self._build_keybind_row(keybind_frame, "Move Right", "move_right")
        self._build_keybind_row(keybind_frame, "Attack", "attack")
        self._build_keybind_row(keybind_frame, "Restart", "restart")
        self._build_keybind_row(keybind_frame, "Next Level", "next_level")
        self._build_keybind_row(keybind_frame, "Menu / Pause", "menu")

        hint = tk.Label(
            sin,
            text="Music: assets/music.mp3 (auto-plays if pygame is installed).",
            fg="#94a3b8",
            bg="#0b1020",
            font=("Helvetica", 10),
        )
        hint.pack(pady=(10, 18))

        back_btn = tk.Button(sin, text="Back", command=self.back_from_settings, padx=22, pady=10)
        back_btn.pack(fill=tk.X)

        # Sandbox builder overlay
        self.sandbox_frame = tk.Frame(self.root, bg="#0b1020")
        self.sandbox_frame.place(x=0, y=0, relwidth=1.0, relheight=1.0)

        sb_outer = tk.Frame(self.sandbox_frame, bg="#0b1020")
        sb_outer.place(relx=0.5, rely=0.5, anchor="center")

        sb_title = tk.Label(sb_outer, text="Sandbox", fg="white", bg="#0b1020", font=("Helvetica", 22, "bold"))
        sb_title.pack(pady=(0, 12))

        sb_grid = tk.Frame(sb_outer, bg="#0b1020")
        sb_grid.pack()

        left = tk.Frame(sb_grid, bg="#0b1020")
        left.grid(row=0, column=0, sticky="n", padx=(0, 18))
        right = tk.Frame(sb_grid, bg="#0b1020")
        right.grid(row=0, column=1, sticky="n")

        def add_labeled_entry(parent, text, var, width=8):
            row = tk.Frame(parent, bg="#0b1020")
            row.pack(anchor="w", pady=3)
            tk.Label(row, text=text, fg="white", bg="#0b1020", width=18, anchor="w").pack(side=tk.LEFT)
            tk.Entry(row, textvariable=var, width=width).pack(side=tk.LEFT)

        tk.Label(left, text="Player", fg="white", bg="#0b1020", font=("Helvetica", 14, "bold")).pack(anchor="w", pady=(0, 6))
        add_labeled_entry(left, "Player HP", self.sb_player_hp)
        add_labeled_entry(left, "Player Shield", self.sb_player_shield)
        add_labeled_entry(left, "Player Speed", self.sb_player_speed)
        add_labeled_entry(left, "Enemy Count (0-8)", self.sb_enemy_count)
        add_labeled_entry(left, "Enemy HP", self.sb_enemy_hp)
        add_labeled_entry(left, "Enemy Shield", self.sb_enemy_shield)
        add_labeled_entry(left, "Enemy Speed", self.sb_enemy_speed)

        tk.Label(left, text="Custom Weapon", fg="white", bg="#0b1020", font=("Helvetica", 14, "bold")).pack(anchor="w", pady=(16, 6))
        kind_row = tk.Frame(left, bg="#0b1020")
        kind_row.pack(anchor="w", pady=3)
        tk.Label(kind_row, text="Weapon Type", fg="white", bg="#0b1020", width=18, anchor="w").pack(side=tk.LEFT)
        tk.OptionMenu(kind_row, self.sb_weapon_kind, "gun", "melee").pack(side=tk.LEFT)
        add_labeled_entry(left, "Damage", self.sb_weapon_damage)
        add_labeled_entry(left, "Cooldown", self.sb_weapon_cooldown)
        add_labeled_entry(left, "Bullet Speed", self.sb_weapon_bullet_speed)
        add_labeled_entry(left, "Melee Range", self.sb_weapon_range)
        add_labeled_entry(left, "Pellet Count", self.sb_weapon_pellets)
        add_labeled_entry(left, "Spread Degrees", self.sb_weapon_spread)
        add_labeled_entry(left, "AOE Radius", self.sb_weapon_aoe_radius)
        add_labeled_entry(left, "AOE Damage", self.sb_weapon_aoe_damage)

        tk.Label(right, text="Enemy Weapons", fg="white", bg="#0b1020", font=("Helvetica", 14, "bold")).pack(anchor="w", pady=(0, 6))
        tk.Label(right, text="Only the first N rows are used.", fg="#94a3b8", bg="#0b1020", font=("Helvetica", 10)).pack(anchor="w", pady=(0, 8))
        sandbox_weapon_choices = ["sandbox_custom", "pistol", "rifle", "shotgun", "sword", "claws", "rocket_launcher", "minigun", "railcannon", "blaster", "chunkier_gun", "pukeko", "landmine"]
        for i, var in enumerate(self.sb_enemy_weapon_vars, start=1):
            row = tk.Frame(right, bg="#0b1020")
            row.pack(anchor="w", pady=2)
            tk.Label(row, text=f"Enemy {i}", fg="white", bg="#0b1020", width=10, anchor="w").pack(side=tk.LEFT)
            tk.OptionMenu(row, var, *sandbox_weapon_choices).pack(side=tk.LEFT)

        tk.Label(right, text="Rectangles", fg="white", bg="#0b1020", font=("Helvetica", 14, "bold")).pack(anchor="w", pady=(16, 6))
        rect_row1 = tk.Frame(right, bg="#0b1020")
        rect_row1.pack(anchor="w", pady=2)
        tk.Label(rect_row1, text="X", fg="white", bg="#0b1020").pack(side=tk.LEFT)
        tk.Entry(rect_row1, textvariable=self.sb_rect_x, width=6).pack(side=tk.LEFT, padx=(4, 10))
        tk.Label(rect_row1, text="Y", fg="white", bg="#0b1020").pack(side=tk.LEFT)
        tk.Entry(rect_row1, textvariable=self.sb_rect_y, width=6).pack(side=tk.LEFT, padx=(4, 10))
        tk.Label(rect_row1, text="W", fg="white", bg="#0b1020").pack(side=tk.LEFT)
        tk.Entry(rect_row1, textvariable=self.sb_rect_w, width=6).pack(side=tk.LEFT, padx=(4, 10))
        tk.Label(rect_row1, text="H", fg="white", bg="#0b1020").pack(side=tk.LEFT)
        tk.Entry(rect_row1, textvariable=self.sb_rect_h, width=6).pack(side=tk.LEFT, padx=(4, 0))

        rect_btns = tk.Frame(right, bg="#0b1020")
        rect_btns.pack(anchor="w", pady=(6, 6))
        tk.Button(rect_btns, text="Add Rectangle", command=self.add_sandbox_rectangle, padx=10, pady=4).pack(side=tk.LEFT)
        tk.Button(rect_btns, text="Remove Selected", command=self.remove_sandbox_rectangle, padx=10, pady=4).pack(side=tk.LEFT, padx=(8, 0))
        tk.Button(rect_btns, text="Clear Walls", command=self.clear_sandbox_rectangles, padx=10, pady=4).pack(side=tk.LEFT, padx=(8, 0))

        self.sandbox_rect_list = tk.Listbox(right, width=44, height=8)
        self.sandbox_rect_list.pack(anchor="w", pady=(0, 8))

        sb_hint = tk.Label(
            sb_outer,
            text="Sandbox gives infinite money, equips your custom weapon, and uses your wall list.",
            fg="#94a3b8",
            bg="#0b1020",
            font=("Helvetica", 10),
        )
        sb_hint.pack(pady=(10, 14))

        sb_actions = tk.Frame(sb_outer, bg="#0b1020")
        sb_actions.pack()
        tk.Button(sb_actions, text="Start Sandbox", command=self.start_sandbox, padx=20, pady=10).pack(side=tk.LEFT)
        tk.Button(sb_actions, text="Back", command=self._show_menu, padx=20, pady=10).pack(side=tk.LEFT, padx=(10, 0))

        # In-game pause/menu overlay
        self.pause_frame = tk.Frame(self.root, bg="#0b1020")
        self.pause_frame.place(x=0, y=0, relwidth=1.0, relheight=1.0)

        pin = tk.Frame(self.pause_frame, bg="#0b1020")
        pin.place(relx=0.5, rely=0.5, anchor="center")

        pt = tk.Label(pin, text="Menu", fg="white", bg="#0b1020", font=("Helvetica", 22, "bold"))
        pt.pack(pady=(0, 14))

        self.pause_resume_btn = tk.Button(pin, text="Resume", command=self.resume_game, padx=22, pady=10)
        self.pause_resume_btn.pack(pady=6, fill=tk.X)

        ps = tk.Button(pin, text="Settings", command=lambda: self.show_settings(return_to="pause"), padx=22, pady=10)
        ps.pack(pady=6, fill=tk.X)

        pm = tk.Button(pin, text="Main Menu", command=self.goto_main_menu_from_game, padx=22, pady=10)
        pm.pack(pady=6, fill=tk.X)

        pq = tk.Button(pin, text="Quit", command=self.root.destroy, padx=22, pady=10)
        pq.pack(pady=(18, 0), fill=tk.X)

        self.overlay_frames = [
            self.menu_frame,
            self.settings_frame,
            self.sandbox_frame,
            self.pause_frame,
        ]
        self._hide_overlays()



    def _hide_overlays(self):
        try:
            self.shop_frame.place_forget()
        except Exception:
            pass
        try:
            self.menu_frame.place_forget()
        except Exception:
            pass
        try:
            self.settings_frame.place_forget()
        except Exception:
            pass
        try:
            self.sandbox_frame.place_forget()
        except Exception:
            pass
        try:
            self.pause_frame.place_forget()
        except Exception:
            pass

    def _show_overlay(self, frame: tk.Frame):
        # Keep canvas below overlays so we never land on the default root gray.
        try:
            self.canvas.lower()
        except Exception:
            pass
        frame.place(x=0, y=0, relwidth=1.0, relheight=1.0)
        frame.lift()

    def _show_menu(self):
        self.screen = "menu"
        self.settings_return_to = "menu"
        self.shop_open = False
        self.attack_held = False
        self._show_overlay(self.menu_frame)
        try:
            self.shop_btn.place_forget()
        except Exception:
            pass
        self._try_start_music()

    def show_settings(self, return_to: str = "menu"):
        self.screen = "settings"
        self.settings_return_to = return_to
        self.attack_held = False
        self.shop_open = False
        self.rebinding_action = None
        self._show_overlay(self.settings_frame)
        try:
            self.shop_btn.place_forget()
        except Exception:
            pass
        self.refresh_keybind_buttons()
        # Apply toggles immediately if we came from the in-game menu.
        self._apply_visual_toggles_now()
        self._try_start_music()

    def show_sandbox_builder(self):
        self.screen = "menu"
        self.attack_held = False
        self.shop_open = False
        self._show_overlay(self.sandbox_frame)
        try:
            self.shop_btn.place_forget()
        except Exception:
            pass
        self.refresh_sandbox_rect_list()
        self._try_start_music()

    def _clamp_int(self, value, lo: int, hi: int) -> int:
        try:
            v = int(float(value))
        except Exception:
            v = lo
        return max(lo, min(hi, v))

    def _clamp_float(self, value, lo: float, hi: float) -> float:
        try:
            v = float(value)
        except Exception:
            v = lo
        return max(lo, min(hi, v))

    def refresh_sandbox_rect_list(self):
        if not hasattr(self, "sandbox_rect_list"):
            return
        self.sandbox_rect_list.delete(0, tk.END)
        for i, r in enumerate(self.sandbox_rects, start=1):
            self.sandbox_rect_list.insert(tk.END, f"{i}. x={int(r.x)} y={int(r.y)} w={int(r.w)} h={int(r.h)}")

    def add_sandbox_rectangle(self):
        x = self._clamp_int(self.sb_rect_x.get(), 20, 900)
        y = self._clamp_int(self.sb_rect_y.get(), 20, 600)
        w = self._clamp_int(self.sb_rect_w.get(), 20, 700)
        h = self._clamp_int(self.sb_rect_h.get(), 20, 500)
        x = min(x, 980 - 20 - w)
        y = min(y, 640 - 20 - h)
        self.sandbox_rects.append(Rect(x, y, w, h))
        self.refresh_sandbox_rect_list()

    def remove_sandbox_rectangle(self):
        if not hasattr(self, "sandbox_rect_list"):
            return
        sel = self.sandbox_rect_list.curselection()
        if not sel:
            return
        idx = int(sel[0])
        if 0 <= idx < len(self.sandbox_rects):
            self.sandbox_rects.pop(idx)
        self.refresh_sandbox_rect_list()

    def clear_sandbox_rectangles(self):
        self.sandbox_rects.clear()
        self.refresh_sandbox_rect_list()

    def _sandbox_spawn_points(self, count: int) -> List[Tuple[float, float]]:
        spots = [
            (820, 320), (760, 180), (760, 460), (900, 160),
            (900, 480), (660, 320), (860, 320), (620, 160),
        ]
        return spots[:count]

    def _sanitize_sandbox_config(self):
        count = self._clamp_int(self.sb_enemy_count.get(), 0, 8)
        self.sb_enemy_count.set(count)
        self.sb_player_hp.set(self._clamp_int(self.sb_player_hp.get(), 1, 50000))
        self.sb_player_shield.set(self._clamp_int(self.sb_player_shield.get(), 0, 50000))
        self.sb_player_speed.set(self._clamp_int(self.sb_player_speed.get(), 50, 1200))
        self.sb_enemy_hp.set(self._clamp_int(self.sb_enemy_hp.get(), 1, 50000))
        self.sb_enemy_shield.set(self._clamp_int(self.sb_enemy_shield.get(), 0, 50000))
        self.sb_enemy_speed.set(self._clamp_int(self.sb_enemy_speed.get(), 0, 1200))
        self.sb_weapon_damage.set(self._clamp_int(self.sb_weapon_damage.get(), 1, 5000))
        self.sb_weapon_cooldown.set(self._clamp_float(self.sb_weapon_cooldown.get(), 0.01, 5.0))
        self.sb_weapon_bullet_speed.set(self._clamp_float(self.sb_weapon_bullet_speed.get(), 0.0, 4000.0))
        self.sb_weapon_range.set(self._clamp_float(self.sb_weapon_range.get(), 1.0, 600.0))
        self.sb_weapon_pellets.set(self._clamp_int(self.sb_weapon_pellets.get(), 1, 20))
        self.sb_weapon_spread.set(self._clamp_float(self.sb_weapon_spread.get(), 0.0, 180.0))
        self.sb_weapon_aoe_radius.set(self._clamp_float(self.sb_weapon_aoe_radius.get(), 0.0, 250.0))
        self.sb_weapon_aoe_damage.set(self._clamp_int(self.sb_weapon_aoe_damage.get(), 0, 5000))
        loadout = []
        for i in range(count):
            wk = self.sb_enemy_weapon_vars[i].get()
            if wk not in self.weapons and wk != "sandbox_custom":
                wk = "pistol"
            loadout.append(wk)
        self.sandbox_enemy_loadout = loadout
        self.sandbox_enemy_count_last = count

    def _install_sandbox_weapon(self):
        kind = self.sb_weapon_kind.get().strip().lower()
        if kind not in ("gun", "melee"):
            kind = "gun"
        self.weapons["sandbox_custom"] = Weapon(
            key="sandbox_custom",
            name="SandboxCustom",
            kind=kind,
            damage=int(self.sb_weapon_damage.get()),
            cooldown=float(self.sb_weapon_cooldown.get()),
            range=float(self.sb_weapon_range.get()),
            bullet_speed=float(self.sb_weapon_bullet_speed.get()),
            pellet_count=int(self.sb_weapon_pellets.get()),
            spread_deg=float(self.sb_weapon_spread.get()),
            aoe_radius=float(self.sb_weapon_aoe_radius.get()),
            aoe_damage=int(self.sb_weapon_aoe_damage.get()),
        )

    def start_sandbox(self):
        self._sanitize_sandbox_config()
        self._install_sandbox_weapon()
        self.sandbox_mode = True
        self.screen = "game"
        self.money = 10 ** 9
        self.owned_weapons = set(self.weapons.keys())
        self._hide_overlays()
        self._on_resize()
        try:
            self.shop_btn.place(x=max(10, self.root.winfo_width() - 90), y=10)
        except Exception:
            pass
        self.load_sandbox()
        self._apply_visual_toggles_now()
        self._try_start_music()

    def load_sandbox(self):
        self.game_over = False
        self.win = False
        self.attack_held = False
        self._pending_unlock_message = None
        self.shop_open = False
        self.shop_frame.place_forget()
        self.bullets.clear()
        self.enemies.clear()
        self._float.clear()
        self.explosions.clear()
        self._clear_lasers()
        self._clear_landmines(reset_charges=True)
        if self.boss is not None:
            try:
                self.canvas.delete(self.boss.item_id)
                if getattr(self.boss, "weapon_item_id", -1) != -1:
                    self.canvas.delete(self.boss.weapon_item_id)
                self.canvas.delete(self.boss.aim_id)
            except Exception:
                pass
        self.boss = None
        self._hide_boss_bar()

        px, py = 160, 320
        php = int(self.sb_player_hp.get())
        pshield = int(self.sb_player_shield.get())
        pspeed = int(self.sb_player_speed.get())
        if self.player is None:
            self.player = Player(
                x=px, y=py, r=16, speed=pspeed,
                hp=php, max_hp=php,
                shield=pshield, max_shield=pshield,
                item_id=-1, aim_id=-1,
                weapon_key="sandbox_custom",
            )
        else:
            self.player.x, self.player.y = px, py
            self.player.speed = pspeed
            self.player.max_hp = php
            self.player.hp = php
            self.player.max_shield = pshield
            self.player.shield = pshield
            self.player.weapon_key = "sandbox_custom"
            self.player.next_attack_time = 0.0

        ehp = int(self.sb_enemy_hp.get())
        eshield = int(self.sb_enemy_shield.get())
        espeed = int(self.sb_enemy_speed.get())
        for (sx, sy), wk in zip(self._sandbox_spawn_points(self.sandbox_enemy_count_last), self.sandbox_enemy_loadout):
            e = Enemy(
                x=sx, y=sy, r=18, speed=espeed,
                hp=ehp, max_hp=ehp,
                shield=eshield, max_shield=eshield,
                item_id=-1, aim_id=-1,
                weapon_key=wk,
            )
            self.enemies.append(e)

        self._invalidate_entity_canvas_ids(self.player)
        for e in self.enemies:
            self._invalidate_entity_canvas_ids(e)

        self.build_map(list(self.sandbox_rects))
        self.draw_entities()
        self.refresh_ui()
        self.refresh_shop_ui()
        self.refresh_boss_shop_ui()
        self.root.after(10, self._force_focus)

    def back_to_menu(self):
        self._show_menu()

    def back_from_settings(self):
        if self.settings_return_to == "pause":
            self.show_pause_menu()
        else:
            self._show_menu()

    def start_game(self):
        # Fresh run from main menu
        self.sandbox_mode = False
        self.screen = "game"
        self._hide_overlays()
        self._on_resize()
        try:
            self.shop_btn.place(x=max(10, self.root.winfo_width() - 90), y=10)
        except Exception:
            pass
        self.load_level(0, full_heal=True)
        self._apply_visual_toggles_now()
        self._try_start_music()

    def show_pause_menu(self):
        if self.player is None:
            return
        for k in self.keys:
            self.keys[k] = False
        self.screen = "pause"
        self.attack_held = False
        self.shop_open = False
        try:
            self.shop_frame.place_forget()
        except Exception:
            pass
        self._show_overlay(self.pause_frame)
        try:
            self.shop_btn.place_forget()
        except Exception:
            pass
        self._apply_visual_toggles_now()
        self._try_start_music()

    def resume_game(self):
        if self.player is None:
            return
        self.screen = "game"
        self._hide_overlays()
        try:
            self.canvas.lift()
        except Exception:
            pass
        self._on_resize()
        self.root.after(10, self._force_focus)
        self._apply_visual_toggles_now()

    def goto_main_menu_from_game(self):
        # From pause menu only.
        for k in self.keys:
            self.keys[k] = False
        self.attack_held = False
        self.shop_open = False
        try:
            self.shop_frame.place_forget()
        except Exception:
            pass
        self._show_menu()

    def toggle_pause_menu(self, _e=None):
        if self.screen == "game":
            if self.shop_open:
                # If shop is open, close it first.
                self.shop_open = False
                try:
                    self.shop_frame.place_forget()
                except Exception:
                    pass
                self.root.after(10, self._force_focus)
                return
            if not self.game_over and not self.win:
                self.show_pause_menu()
        elif self.screen == "pause":
            self.resume_game()
        elif self.screen == "settings":
            self.back_from_settings()

    def _pretty_key_name(self, key: str) -> str:
        specials = {
            "space": "Space",
            "escape": "Esc",
            "left": "Left",
            "right": "Right",
            "up": "Up",
            "down": "Down",
            "return": "Enter",
            "backspace": "Backspace",
            "tab": "Tab",
        }
        return specials.get(key, key.upper())

    def _update_tip_label(self):
        move_text = (
            f"{self._pretty_key_name(self.keybinds['move_up'])}/"
            f"{self._pretty_key_name(self.keybinds['move_left'])}/"
            f"{self._pretty_key_name(self.keybinds['move_down'])}/"
            f"{self._pretty_key_name(self.keybinds['move_right'])}"
        )
        self.tip_label.config(
            text=(
                f"Move: {move_text} | "
                f"Attack: Hold {self._pretty_key_name(self.keybinds['attack'])} | "
                f"Shop: Button | "
                f"Next level: {self._pretty_key_name(self.keybinds['next_level'])} | "
                f"Restart: {self._pretty_key_name(self.keybinds['restart'])} | "
                f"Main Menu: {self._pretty_key_name(self.keybinds['menu'])}"
            )
        )

    def _build_keybind_row(self, parent: tk.Frame, label_text: str, action: str):
        row = tk.Frame(parent, bg="#0b1020")
        row.pack(fill=tk.X, pady=3)

        lab = tk.Label(
            row,
            text=label_text,
            fg="white",
            bg="#0b1020",
            font=("Helvetica", 11),
            width=16,
            anchor="w",
        )
        lab.pack(side=tk.LEFT)

        btn = tk.Button(
            row,
            text=self._pretty_key_name(self.keybinds[action]),
            command=lambda a=action: self.start_rebind(a),
            padx=12,
            pady=4,
            width=12,
        )
        btn.pack(side=tk.RIGHT)
        self.keybind_buttons[action] = btn

    def refresh_keybind_buttons(self):
        for action, btn in self.keybind_buttons.items():
            btn.config(text=self._pretty_key_name(self.keybinds[action]))

    def start_rebind(self, action: str):
        self.rebinding_action = action
        for act, btn in self.keybind_buttons.items():
            if act == action:
                btn.config(text="Press key...")
            else:
                btn.config(text=self._pretty_key_name(self.keybinds[act]))

    def finish_rebind(self):
        self.rebinding_action = None
        self.refresh_keybind_buttons()

    def _normalize_bound_key(self, key: str) -> str:
        key = (key or "").lower()
        aliases = {
            "esc": "escape",
            "spacebar": "space",
        }
        return aliases.get(key, key)

    def set_keybind(self, action: str, new_key: str):
        new_key = self._normalize_bound_key(new_key)
        if not new_key:
            return

        blocked = {
            "caps_lock", "shift_l", "shift_r", "control_l", "control_r",
            "alt_l", "alt_r", "super_l", "super_r", "option_l", "option_r",
        }
        if new_key in blocked:
            return

        current_key = self.keybinds[action]
        for other_action, bound_key in self.keybinds.items():
            if other_action != action and bound_key == new_key:
                self.keybinds[other_action] = current_key
                break

        self.keybinds[action] = new_key
        self.finish_rebind()
        self._update_tip_label()

    def on_mouse_move(self, e):

        self.mouse_x = e.x
        self.mouse_y = e.y

    def set_music(self, filepath: str):
        self.music_path = filepath
        self._music_started = False
        self._try_start_music()

    def _try_start_music(self):
        if not self.music_enabled:
            return
        if self._music_started:
            return
        if self.music_path is None:
            return
        if not PYGAME_AVAILABLE:
            return
        if not os.path.exists(self.music_path):
            return
        try:
            pygame.mixer.init()
            pygame.mixer.music.load(self.music_path)
            pygame.mixer.music.play(-1)
            self._music_started = True
        except Exception:
            self._music_started = False

    def _apply_visual_toggles_now(self):
        if getattr(self, "player", None) is None:
            return
        if self.screen not in ("game", "pause"):
            return

        show_arrow = bool(self.opt_show_arrow.get())
        show_weapons = bool(self.opt_show_weapon_sprites.get())

        # Arrow visibility
        try:
            self.canvas.itemconfigure(self.player.aim_id, state=("normal" if show_arrow else "hidden"))
        except Exception:
            pass
        for e in self.enemies:
            try:
                self.canvas.itemconfigure(e.aim_id, state=("normal" if show_arrow else "hidden"))
            except Exception:
                pass
        if self.boss is not None:
            try:
                self.canvas.itemconfigure(self.boss.aim_id, state=("normal" if show_arrow else "hidden"))
            except Exception:
                pass

        # Weapon sprites
        if not show_weapons:
            ents = [self.player] + list(self.enemies) + ([self.boss] if self.boss is not None else [])
            for ent in ents:
                if ent is None:
                    continue
                wid = getattr(ent, "weapon_item_id", -1)
                if wid != -1:
                    try:
                        self.canvas.delete(wid)
                    except Exception:
                        pass
                    ent.weapon_item_id = -1
                    setattr(ent, "weapon_img", None)
        else:
            self._sync_weapon_sprite(self.player)
            for e in self.enemies:
                self._sync_weapon_sprite(e)
            if self.boss is not None:
                self._sync_weapon_sprite(self.boss)




    # -------------------------
    # Weapon sprite layer (in-hand)
    # -------------------------

    def _weapon_image_for(self, weapon_key: str, fx: float, fy: float) -> Optional[tk.PhotoImage]:
        """Return a (possibly rotated) PhotoImage for a weapon."""
        fx, fy = self._norm(fx, fy, fallback=(1.0, 0.0))

        # Prefer Pillow rotation if available.
        if PIL_AVAILABLE and weapon_key in self.weapon_pil_base:
            angle = math.degrees(math.atan2(fy, fx))
            angle = (angle + self.weapon_base_angle_offset.get(weapon_key, 0.0)) % 360.0

            step = max(1, int(self.weapon_angle_step))
            bucket = int(round(angle / step)) * step
            bucket %= 360

            ck = (weapon_key, bucket)
            cached = self.weapon_rot_cache.get(ck)
            if cached is None:
                base = self.weapon_pil_base[weapon_key]
                # Tk's y-axis points down, so negate to keep visual rotation intuitive.
                rot = base.rotate(-bucket, resample=Image.BICUBIC, expand=True)
                cached = ImageTk.PhotoImage(rot)
                self.weapon_rot_cache[ck] = cached
            return cached

        # Fallback: non-rotated tk.PhotoImage.
        return self.weapon_sprites.get(weapon_key)


    def _weapon_sprite_pos(self, ent) -> Tuple[float, float]:
        """Weapon sprite anchored near the body's center line, slightly forward."""
        fx, fy = self._norm(getattr(ent, "facing_x", 1.0), getattr(ent, "facing_y", 0.0), fallback=(1.0, 0.0))

        if getattr(ent, "weapon_key", "") in ("sword", "claws"):
            forward = ent.r * 0.12
        else:
            forward = ent.r * 0.16

        return ent.x + fx * forward, ent.y + fy * forward

    def _weapon_muzzle_pos(self, ent, weapon_key: str) -> Tuple[float, float]:
        """Point where bullets originate (near the end of the sprite)."""
        fx, fy = self._norm(ent.facing_x, ent.facing_y, fallback=(1.0, 0.0))
        wx, wy = self._weapon_sprite_pos(ent)
        muzzle = self.weapon_muzzle_len.get(weapon_key, ent.r + 18)
        return (wx + fx * muzzle, wy + fy * muzzle)


    def _projectile_spawn_pos(self, ent, weapon_key: str) -> Tuple[float, float]:
        """Spawn bullets from the body's center line (slight nudge forward)."""
        fx, fy = self._norm(getattr(ent, "facing_x", 1.0), getattr(ent, "facing_y", 0.0), fallback=(1.0, 0.0))
        nudge = max(2.0, getattr(ent, "r", 16) * 0.08)
        sx = ent.x + fx * nudge
        sy = ent.y + fy * nudge
        return sx, sy

    def _spawn_bullet(self, x: float, y: float, vx: float, vy: float, r: int, fill: str, from_enemy: bool, damage: int, weapon_key: str):
        cid = self.canvas.create_oval(x - r, y - r, x + r, y + r, fill=fill, outline="")
        self.bullets.append(
            Bullet(
                x=x, y=y, vx=vx, vy=vy, r=r,
                damage=damage, from_enemy=from_enemy, item_id=cid,
                weapon_key=weapon_key
            )
        )


    def _sync_weapon_sprite(self, ent):
        """Create/update the canvas image that represents the weapon in-hand."""
        if not self.opt_show_weapon_sprites.get():
            if getattr(ent, "weapon_item_id", -1) != -1:
                try:
                    self.canvas.delete(ent.weapon_item_id)
                except Exception:
                    pass
                ent.weapon_item_id = -1
            setattr(ent, "weapon_img", None)
            return
        fx, fy = self._norm(ent.facing_x, ent.facing_y, fallback=(1.0, 0.0))
        img = self._weapon_image_for(ent.weapon_key, fx, fy)

        # No sprite for this weapon.
        if img is None:
            if getattr(ent, "weapon_item_id", -1) != -1:
                try:
                    self.canvas.delete(ent.weapon_item_id)
                except Exception:
                    pass
                ent.weapon_item_id = -1
            ent.weapon_img = None
            return

        wx, wy = self._weapon_sprite_pos(ent)

        # Recreate defensively if the item was deleted during a level reload.
        need_create = getattr(ent, "weapon_item_id", -1) == -1
        if not need_create:
            try:
                self.canvas.itemconfigure(ent.weapon_item_id, image=img)
                self.canvas.coords(ent.weapon_item_id, wx, wy)
            except Exception:
                try:
                    self.canvas.delete(ent.weapon_item_id)
                except Exception:
                    pass
                ent.weapon_item_id = -1
                need_create = True

        if need_create:
            ent.weapon_item_id = self.canvas.create_image(wx, wy, image=img, anchor="center")

        # Keep a reference alive (important if not cached).
        ent.weapon_img = img

        # Layering: body -> weapon -> aim marker
        try:
            self.canvas.tag_raise(ent.item_id)
            self.canvas.tag_raise(ent.weapon_item_id)
            self.canvas.tag_raise(ent.aim_id)
        except Exception:
            pass

    # -------------------------
    # Shop pricing helpers
    # -------------------------

    def _shop_weapon_key_from_item(self, item_key: str) -> Optional[str]:
        if item_key.startswith("buy_"):
            return item_key[len("buy_"):]
        return None

    def _effective_item_cost(self, item: ShopItem) -> int:
        wk = self._shop_weapon_key_from_item(item.key)
        if wk is not None and wk in self.owned_weapons:
            return 0
        return item.cost

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
                enemy_weapon_pool=["rifle", "claws"],
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
            Level(
                name="Level 4: Tube",
                player_spawn=(140, 320),
                enemy_spawns=[(840, 320), (760, 220), (760, 420), (900, 320)],
                walls=[
                    Rect(200, 260, 290, 40),
                    Rect(490, 0, 200, 300),
                    Rect(200, 490, 200, 150),
                    Rect(400, 490, 290, 40)
                ],
                enemy_hp=180,
                enemy_speed=145,
                enemy_shield=18,
                enemy_weapon_pool=["rifle", "shotgun", "claws", "blaster", "minigun", "blaster"],
            ),
            Level(
                name="Level 5: chunky man",
                player_spawn=(140, 320),
                enemy_spawns=[],
                walls=[],
                enemy_hp=0,
                enemy_speed=0,
                enemy_shield=0,
                enemy_weapon_pool=[],
                boss_spawn=(820, 320),
                boss_hp=2500,
                boss_speed=125,
                boss_shield=100,
                boss_weapon="rocket_launcher",
            ),

            Level(
                name="Level 6: Zigzag Hall",
                player_spawn=(140, 320),
                enemy_spawns=[(860, 120), (860, 520), (740, 320)],
                walls=[
                    Rect(260, 80, 40, 480),
                    Rect(420, 0, 40, 360),
                    Rect(420, 440, 40, 200),
                    Rect(580, 80, 40, 480),
                    Rect(740, 0, 40, 360),
                    Rect(740, 440, 40, 200),
                    Rect(320, 280, 160, 40),
                    Rect(520, 320, 160, 40),
                ],
                enemy_hp=200,
                enemy_speed=155,
                enemy_shield=22,
                enemy_weapon_pool=["rifle", "rifle", "shotgun", "claws", "blaster"],
            ),

            Level(
                name="Level 7: Four Rooms",
                player_spawn=(140, 200),
                enemy_spawns=[(840, 120), (840, 520), (520, 120), (520, 520)],
                walls=[
                    Rect(460, 0, 40, 260),
                    Rect(460, 380, 40, 260),
                    Rect(0, 300, 440, 40),
                    Rect(540, 300, 440, 40),
                    Rect(220, 140, 80, 40),
                    Rect(680, 460, 80, 40),
                    Rect(680, 140, 80, 40),
                    Rect(220, 460, 80, 40),
                ],
                enemy_hp=215,
                enemy_speed=160,
                enemy_shield=26,
                enemy_weapon_pool=["shotgun", "shotgun", "rifle", "claws", "blaster"],
            ),

            Level(
                name="Level 8: Center Pit",
                player_spawn=(140, 320),
                enemy_spawns=[(880, 320), (760, 160), (760, 480), (800, 320)],
                walls=[
                    # Big “pit” ring with two choke entries
                    Rect(390, 170, 200, 40),
                    Rect(390, 430, 200, 40),
                    Rect(350, 210, 40, 220),
                    Rect(600, 210, 40, 220),
                    # Side cover to create angle fights
                    Rect(220, 120, 60, 120),
                    Rect(220, 400, 60, 120),
                    Rect(760, 260, 60, 120),
                ],
                enemy_hp=235,
                enemy_speed=170,
                enemy_shield=30,
                enemy_weapon_pool=["minigun", "rifle", "shotgun", "blaster", "claws"],
            ),

            Level(
                name="Level 9: Long Bridge",
                player_spawn=(120, 320),
                enemy_spawns=[(900, 320), (760, 320), (820, 200), (820, 440)],
                walls=[
                    # Two long rails forming a “bridge lane”
                    Rect(220, 180, 560, 40),
                    Rect(220, 420, 560, 40),
                    # Mid choke posts
                    Rect(480, 220, 40, 200),
                    Rect(620, 220, 40, 200),
                    # Near-player cover so you can stabilize
                    Rect(140, 260, 60, 120),
                ],
                enemy_hp=255,
                enemy_speed=175,
                enemy_shield=34,
                enemy_weapon_pool=["rifle", "rifle", "minigun", "shotgun", "blaster"],
            ),
            Level(
                name="Level 10: chunkier man",
                player_spawn=(140, 320),
                enemy_spawns=[],
                walls=[],
                enemy_hp=0,
                enemy_speed=0,
                enemy_shield=0,
                enemy_weapon_pool=[],
                boss_spawn=(820, 320),
                boss_hp=5000,
                boss_speed=125,
                boss_shield=200,
                boss_weapon="chunkier_gun",
            ),
            Level(
                name="Level 11: The Funnel",
                player_spawn=(140, 320),
                enemy_spawns=[(900, 120), (900, 520), (780, 320), (620, 320)],
                walls=[
                    # Wide-to-narrow funnel corridor
                    Rect(260, 80, 40, 480),
                    Rect(420, 120, 40, 400),
                    Rect(580, 160, 40, 320),
                    Rect(740, 200, 40, 240),
                    # Blocking slabs to prevent straight sniping
                    Rect(320, 260, 120, 40),
                    Rect(500, 340, 120, 40),
                    Rect(660, 260, 120, 40),
                ],
                enemy_hp=290,
                enemy_speed=185,
                enemy_shield=45,
                enemy_weapon_pool=["minigun", "minigun", "rifle", "blaster", "shotgun"],
            ),

            Level(
                name="Level 12: Offset Lanes",
                player_spawn=(140, 120),
                enemy_spawns=[(900, 520), (780, 520), (900, 200), (660, 360)],
                walls=[
                    # Two staggered lanes with crossovers
                    Rect(220, 160, 700, 40),
                    Rect(220, 440, 700, 40),
                    Rect(340, 200, 40, 160),
                    Rect(540, 280, 40, 160),
                    Rect(740, 200, 40, 160),
                    # Safe-ish pocket near spawn
                    Rect(140, 200, 80, 80),
                ],
                enemy_hp=305,
                enemy_speed=190,
                enemy_shield=50,
                enemy_weapon_pool=["rifle", "minigun", "shotgun", "blaster", "claws"],
            ),

            Level(
                name="Level 13: Checkers",
                player_spawn=(140, 320),
                enemy_spawns=[(900, 320), (780, 160), (780, 480), (620, 240), (620, 400)],
                walls=[
                    # Checker blocks for constant corner play
                    Rect(280, 120, 80, 80),
                    Rect(420, 240, 80, 80),
                    Rect(560, 120, 80, 80),
                    Rect(700, 240, 80, 80),
                    Rect(280, 360, 80, 80),
                    Rect(560, 360, 80, 80),
                    Rect(700, 440, 80, 80),

                ],
                enemy_hp=320,
                enemy_speed=195,
                enemy_shield=55,
                enemy_weapon_pool=["blaster", "blaster", "minigun", "rifle", "shotgun"],
            ),

            Level(
                name="Level 14: Spiral",
                player_spawn=(140, 320),
                enemy_spawns=[(900, 320), (820, 160), (820, 480), (700, 320)],
                walls=[
                    # Spiral corridor (forces rotation and repositioning)
                    Rect(260, 80, 520, 40),
                    Rect(740, 120, 40, 440),
                    Rect(300, 520, 480, 40),
                    Rect(260, 160, 40, 360),
                    Rect(340, 160, 360, 40),
                    Rect(660, 240, 40, 240),
                    Rect(420, 400, 240, 40),
                    # Inner bump so it never becomes a perfect loop
                    Rect(520, 280, 80, 40),
                ],
                enemy_hp=340,
                enemy_speed=205,
                enemy_shield=60,
                enemy_weapon_pool=["minigun", "railcannon", "shotgun", "blaster", "rifle"],
            ),
            Level(
                name="Level 15: pukeko",
                player_spawn=(140, 320),
                enemy_spawns=[],
                walls=[],
                enemy_hp=0,
                enemy_speed=0,
                enemy_shield=0,
                enemy_weapon_pool=[],
                boss_spawn=(820, 320),
                boss_hp=10000,
                boss_speed=125,
                boss_shield=400,
                boss_weapon="pukeko",
            ),
        ]


    def _invalidate_entity_canvas_ids(self, ent):
        if ent is None:
            return
        ent.item_id = -1
        ent.aim_id = -1
        setattr(ent, "weapon_item_id", -1)
        setattr(ent, "weapon_img", None)


    def load_level(self, idx: int, full_heal: bool = False):
        self.level_index = idx
        self.game_over = False
        self.win = False
        self.attack_held = False
        self._pending_unlock_message = None

        # close shop on load
        self.shop_open = False
        self.shop_frame.place_forget()

        # clear world
        self.bullets.clear()
        self.enemies.clear()
        self._float.clear()
        self.explosions.clear()
        self._clear_lasers()
        self._clear_landmines(reset_charges=True)

        # clear boss
        if self.boss is not None:
            try:
                self.canvas.delete(self.boss.item_id)
                if getattr(self.boss, "weapon_item_id", -1) != -1:
                    self.canvas.delete(self.boss.weapon_item_id)
                self.canvas.delete(self.boss.aim_id)
            except Exception:
                pass
        self.boss = None
        self._hide_boss_bar()

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

        if lvl.boss_spawn is not None and lvl.boss_hp > 0:
            bx, by = lvl.boss_spawn

            if self.level_index == 4:
                self.boss = Boss(
                    x=bx, y=by, r=34,
                    speed=max(40, lvl.boss_speed),
                    hp=lvl.boss_hp, max_hp=lvl.boss_hp,
                    shield=lvl.boss_shield, max_shield=lvl.boss_shield,
                    item_id=-1, aim_id=-1,
                    weapon_key=lvl.boss_weapon,
                )
            elif self.level_index == 9:
                self.boss = Boss(
                    x=bx, y=by, r=100,
                    speed=max(40, lvl.boss_speed),
                    hp=lvl.boss_hp, max_hp=lvl.boss_hp,
                    shield=lvl.boss_shield, max_shield=lvl.boss_shield,
                    item_id=-1, aim_id=-1,
                    weapon_key=lvl.boss_weapon,
                )
            elif self.level_index == 14:
                self.boss = Boss(
                    x=bx, y=by, r=70,
                    speed=max(40, lvl.boss_speed),
                    hp=lvl.boss_hp, max_hp=lvl.boss_hp,
                    shield=lvl.boss_shield, max_shield=lvl.boss_shield,
                    item_id=-1, aim_id=-1,
                    weapon_key=lvl.boss_weapon,
                )
                self.boss.sprite_key = "level15"
                self.boss.sprite_img = self.boss_sprites.get("level15", None)
            else:
                self.boss = Boss(
                    x=bx, y=by, r=48,
                    speed=max(40, lvl.boss_speed),
                    hp=lvl.boss_hp, max_hp=lvl.boss_hp,
                    shield=lvl.boss_shield, max_shield=lvl.boss_shield,
                    item_id=-1, aim_id=-1,
                    weapon_key=lvl.boss_weapon,
                )

        self._invalidate_entity_canvas_ids(self.player)
        for e in self.enemies:
            self._invalidate_entity_canvas_ids(e)
        self._invalidate_entity_canvas_ids(self.boss)

        self.build_map(lvl.walls)
        self.draw_entities()
        self.refresh_ui()
        self.refresh_shop_ui()
        self.refresh_boss_shop_ui()
        self._update_boss_bar()
        self.root.after(10, self._force_focus)

    # -------------------------
    # Boss bar
    # -------------------------

    def _hide_boss_bar(self):
        self.boss_name_label.place_forget()
        self.boss_bar_canvas.place_forget()

    def _show_boss_bar(self, name: str):
        cx = self.root.winfo_width() // 2
        self.boss_name_label.config(text=name.upper())
        self.boss_name_label.place(x=cx - 260, y=12)
        self.boss_bar_canvas.place(x=cx - 260, y=34)

    def _update_boss_bar(self):
        if self.boss is None or self.boss.hp <= 0:
            self._hide_boss_bar()
            return

        self._show_boss_bar(self.levels[self.level_index].name)
        hp = max(0, self.boss.hp)
        mx = max(1, self.boss.max_hp)
        frac = max(0.0, min(1.0, hp / mx))

        fill_left = 4
        fill_right_max = 516
        fill_right = fill_left + (fill_right_max - fill_left) * frac
        self.boss_bar_canvas.coords(self._boss_bar_fill, fill_left, 4, fill_right, 14)

    # -------------------------
    # Shop UI (two tabs)
    # -------------------------

    def _build_shop_ui(self) -> tk.Frame:
        frame = tk.Frame(self.root, bg="#0f172a", bd=0, relief="flat")

        # Header row
        header = tk.Frame(frame, bg="#0f172a")
        header.pack(fill=tk.X, padx=18, pady=(14, 8))

        title = tk.Label(
            header,
            text="SHOP",
            bg="#0f172a",
            fg="white",
            font=("Helvetica", 18, "bold"),
        )
        title.pack(side=tk.LEFT)

        self.shop_money_label = tk.Label(
            header,
            text="",
            bg="#0f172a",
            fg="#e5e7eb",
            font=("Helvetica", 12, "bold"),
        )
        self.shop_money_label.pack(side=tk.RIGHT)

        # Tabs row
        tabs = tk.Frame(frame, bg="#0f172a")
        tabs.pack(fill=tk.X, padx=18, pady=(0, 10))

        self.tab_shop_btn = tk.Button(tabs, text="Shop", command=lambda: self._set_shop_tab("shop"), padx=10, pady=6)
        self.tab_shop_btn.pack(side=tk.LEFT)

        self.tab_boss_btn = tk.Button(tabs, text="Boss Weapons", command=lambda: self._set_shop_tab("boss"), padx=10, pady=6)
        self.tab_boss_btn.pack(side=tk.LEFT, padx=(10, 0))

        close_btn = tk.Button(tabs, text="Close", command=self.toggle_shop, padx=10, pady=6)
        close_btn.pack(side=tk.RIGHT)

        self.shop_subtitle = tk.Label(
            frame,
            text="Owned weapons become free forever. Buy to equip instantly.",
            bg="#0f172a",
            fg="#94a3b8",
            font=("Helvetica", 11),
        )
        self.shop_subtitle.pack(anchor="w", padx=18, pady=(0, 10))

        # Content area for two pages
        self.shop_pages = tk.Frame(frame, bg="#0f172a")
        self.shop_pages.pack(fill=tk.BOTH, expand=True, padx=18, pady=(0, 14))

        # Page: normal shop
        self.page_shop = tk.Frame(self.shop_pages, bg="#0f172a")
        self.page_shop.place(x=0, y=0, relwidth=1.0, relheight=1.0)

        # Page: boss weapons
        self.page_boss = tk.Frame(self.shop_pages, bg="#0f172a")
        self.page_boss.place(x=0, y=0, relwidth=1.0, relheight=1.0)

        # Build both pages
        self._build_shop_cards(self.page_shop, is_boss_page=False)
        self._build_shop_cards(self.page_boss, is_boss_page=True)

        # default tab
        self.current_shop_tab = "shop"
        self._set_shop_tab("shop")

        return frame

    def _set_shop_tab(self, tab: str):
        self.current_shop_tab = tab
        if tab == "shop":
            self.page_shop.lift()
            self.shop_subtitle.config(text="Owned weapons become free forever. Buy to equip instantly.")
        else:
            self.page_boss.lift()
            self.shop_subtitle.config(text="Boss weapons unlock by beating bosses in later levels.")

        self.refresh_shop_ui()
        self.refresh_boss_shop_ui()

    def _build_shop_cards(self, parent: tk.Frame, is_boss_page: bool):
        # Clear existing
        for child in parent.winfo_children():
            child.destroy()

        items_wrap = tk.Frame(parent, bg="#0f172a")
        items_wrap.pack(fill=tk.BOTH, expand=True)

        items_wrap.grid_columnconfigure(0, weight=1, uniform=("shopcol_b" if is_boss_page else "shopcol"))
        items_wrap.grid_columnconfigure(1, weight=1, uniform=("shopcol_b" if is_boss_page else "shopcol"))

        col_count = 2
        card_padx = 10
        card_pady = 10

        if is_boss_page:
            self.boss_shop_buttons = {}
            self.boss_shop_desc_labels = []
            source_items = self.boss_shop_items
        else:
            self.shop_buttons = {}
            self.shop_desc_labels = []
            source_items = self.shop_items

        for i, item in enumerate(source_items):
            r = i // col_count
            c = i % col_count

            card = tk.Frame(items_wrap, bg="#111827", padx=14, pady=12,
                            highlightthickness=1, highlightbackground="#1f2937")
            card.grid(row=r, column=c, sticky="nsew", padx=card_padx, pady=card_pady)

            name = tk.Label(card, text=item.name, bg="#111827", fg="white", font=("Helvetica", 12, "bold"))
            name.pack(anchor="w")

            desc = tk.Label(
                card,
                text=item.desc,
                bg="#111827",
                fg="#cbd5e1",
                font=("Helvetica", 10),
                wraplength=420,
                justify="left",
            )
            desc.pack(anchor="w", pady=(4, 10), fill=tk.X)

            btn = tk.Button(
                card,
                text="Buy",
                command=(lambda k=item.key: self.buy_boss_shop_item(k)) if is_boss_page else (lambda k=item.key: self.buy_shop_item(k)),
                padx=10, pady=6
            )
            btn.pack(anchor="e")

            if is_boss_page:
                self.boss_shop_buttons[item.key] = btn
                self.boss_shop_desc_labels.append(desc)
            else:
                self.shop_buttons[item.key] = btn
                self.shop_desc_labels.append(desc)

        # Resize handler to keep wraplength reasonable
        def _on_resize(_event=None):
            w = parent.winfo_width()
            per_card = max(260, (w - card_padx * 2 * 2) // 2 - 40)
            labels = self.boss_shop_desc_labels if is_boss_page else self.shop_desc_labels
            for lab in labels:
                try:
                    lab.configure(wraplength=per_card)
                except Exception:
                    pass

        parent.bind("<Configure>", _on_resize)

        # Boss page locked overlay message
        if is_boss_page:
            self.boss_locked_label = tk.Label(
                parent,
                text="",
                bg="#0f172a",
                fg="#94a3b8",
                font=("Helvetica", 14, "bold"),
                justify="center"
            )
            self.boss_locked_label.place(relx=0.5, rely=0.5, anchor="center")

    def toggle_shop(self, _e=None):
        if self.screen != "game":
                    return
        if self.game_over or self.win:
            return
        self.shop_open = not self.shop_open

        if self.shop_open:
            self.attack_held = False
            self.shop_frame.place(x=0, y=0, relwidth=1.0, relheight=1.0)
            self.refresh_shop_ui()
            self.refresh_boss_shop_ui()
        else:
            self.shop_frame.place_forget()
            self.root.after(10, self._force_focus)

    def refresh_shop_ui(self):
        if not hasattr(self, "shop_money_label") or self.player is None:
            return
        weapon_name = self.weapons[self.player.weapon_key].name
        money_text = "INF" if self.sandbox_mode else f"${self.money}"
        self.shop_money_label.config(text=f"Money: {money_text}   Weapon: {weapon_name}")

        if self.current_shop_tab != "shop":
            return

        for item in self.shop_items:
            btn = self.shop_buttons.get(item.key)
            if btn is None:
                continue

            eff_cost = 0 if self.sandbox_mode else self._effective_item_cost(item)
            cost_text = "FREE" if self.sandbox_mode else ("OWNED" if eff_cost == 0 else f"${eff_cost}")
            btn.config(text=f"Buy ({cost_text})")
            btn.config(state=tk.NORMAL if (self.sandbox_mode or self.money >= eff_cost) else tk.DISABLED)

    def refresh_boss_shop_ui(self):
        if not hasattr(self, "shop_money_label") or self.player is None:
            return
        if self.current_shop_tab != "boss":
            return

        # Boss tab remains empty (locked) until beating Level 10 boss
        if not self.unlocked_chunkier and not self.unlocked_pukeko:
            self.boss_locked_label.config(text="Boss weapons locked.\nBeat the Level 10 boss to unlock.")
            self.boss_locked_label.lift()
        else:
            self.boss_locked_label.config(text="")
            self.boss_locked_label.lower()

        for item in self.boss_shop_items:
            btn = self.boss_shop_buttons.get(item.key)
            if btn is None:
                continue

            # Gate visibility/functionality per weapon
            if item.key == "equip_chunkier_gun":
                unlocked = self.unlocked_chunkier
            elif item.key == "equip_pukeko":
                unlocked = self.unlocked_pukeko
            else:
                unlocked = False

            if not unlocked:
                btn.config(text="Locked")
                btn.config(state=tk.DISABLED)
            else:
                btn.config(text="Equip (FREE)")
                btn.config(state=tk.NORMAL)

    def buy_shop_item(self, key: str):
        item = next((it for it in self.shop_items if it.key == key), None)
        if item is None:
            return

        eff_cost = 0 if self.sandbox_mode else self._effective_item_cost(item)
        if (not self.sandbox_mode) and self.money < eff_cost:
            return

        if not self.sandbox_mode:
            self.money -= eff_cost

        wk = self._shop_weapon_key_from_item(key)
        if wk is not None:
            self.owned_weapons.add(wk)

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
        elif key == "buy_minigun":
            self.player.weapon_key = "minigun"
        elif key == "buy_railcannon":
            self.player.weapon_key = "railcannon"
        elif key == "buy_claws":
            self.player.weapon_key = "claws"
        elif key == "buy_landmine":
            self.player.weapon_key = "landmine"
            self.landmine_charges = self.landmine_max_charges
            self.landmine_recharge_queue.clear()
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

    def buy_boss_shop_item(self, key: str):
        # Equip only, free, but locked until unlocked flags are set
        if key == "equip_chunkier_gun":
            if not self.unlocked_chunkier:
                return
            self.player.weapon_key = "chunkier_gun"
            self.float_text(self.player.x, self.player.y - 36, "EQUIPPED: CHUNKIERGUN", "#fef3c7")
        elif key == "equip_pukeko":
            if not self.unlocked_pukeko:
                return
            self.player.weapon_key = "pukeko"
            self.float_text(self.player.x, self.player.y - 36, "EQUIPPED: PUKEKO", "#fef3c7")

        self.refresh_boss_shop_ui()
        self.refresh_ui()

    def _clear_landmines(self, reset_charges: bool = False):
        for m in self.landmines:
            try:
                self.canvas.delete(m.item_id)
            except Exception:
                pass
            try:
                self.canvas.delete(m.glow_id)
            except Exception:
                pass
        self.landmines.clear()
        self.landmine_recharge_queue.clear()
        if reset_charges:
            self.landmine_charges = self.landmine_max_charges

    def _place_landmine(self):
        if self.landmine_charges <= 0:
            self.float_text(self.player.x, self.player.y - 36, "NO MINES", "#fca5a5")
            return

        fx, fy = self._norm(self.player.facing_x, self.player.facing_y, fallback=(1.0, 0.0))
        px = self.player.x + fx * (self.player.r + 16)
        py = self.player.y + fy * (self.player.r + 16)
        mine_r = 12.0

        mine_rect = Rect(px - mine_r, py - mine_r, mine_r * 2, mine_r * 2)
        if self.blocked(mine_rect):
            self.float_text(self.player.x, self.player.y - 36, "BLOCKED", "#fca5a5")
            return

        for m in self.landmines:
            dx = px - m.x
            dy = py - m.y
            if dx * dx + dy * dy <= (mine_r + m.r + 6) ** 2:
                self.float_text(self.player.x, self.player.y - 36, "TOO CLOSE", "#fca5a5")
                return

        glow = self.canvas.create_oval(px - 18, py - 18, px + 18, py + 18, outline="#f59e0b", width=2)
        body = self.canvas.create_oval(px - mine_r, py - mine_r, px + mine_r, py + mine_r, fill="#f59e0b", outline="#7c2d12", width=2)
        self.landmines.append(Landmine(x=px, y=py, r=mine_r, damage=500, item_id=body, glow_id=glow))
        self.landmine_charges -= 1
        self.float_text(px, py - 26, "MINE", "#fde68a")

    def _detonate_landmine(self, mine: Landmine, hit_enemy: Optional[Enemy] = None, hit_boss: bool = False):
        if mine not in self.landmines:
            return

        self.landmines.remove(mine)
        try:
            self.canvas.delete(mine.item_id)
        except Exception:
            pass
        try:
            self.canvas.delete(mine.glow_id)
        except Exception:
            pass

        aoe_r = 84.0
        if hit_enemy is not None:
            self.apply_damage_to_enemy(hit_enemy, mine.damage)
        if hit_boss and self.boss is not None and self.boss.hp > 0:
            self.apply_damage_to_boss(mine.damage)

        for e in list(self.enemies):
            if hit_enemy is not None and e is hit_enemy:
                continue
            dx = e.x - mine.x
            dy = e.y - mine.y
            if dx * dx + dy * dy <= (aoe_r + e.r) ** 2:
                self.apply_damage_to_enemy(e, mine.damage)

        if self.boss is not None and self.boss.hp > 0 and not hit_boss:
            dx = self.boss.x - mine.x
            dy = self.boss.y - mine.y
            if dx * dx + dy * dy <= (aoe_r + self.boss.r) ** 2:
                self.apply_damage_to_boss(mine.damage)

        flash = self.weapons["rocket_launcher"]
        self.explode_at(mine.x, mine.y, flash)
        self.landmine_recharge_queue.append(time.time() + self.landmine_recharge_seconds)

    def update_landmines(self):
        now = time.time()
        keep_times = []
        gained = 0
        for t_ready in self.landmine_recharge_queue:
            if now >= t_ready and self.landmine_charges < self.landmine_max_charges:
                self.landmine_charges += 1
                gained += 1
            else:
                keep_times.append(t_ready)
        self.landmine_recharge_queue = keep_times
        if gained > 0:
            self.float_text(self.player.x, self.player.y - 56, "+MINE", "#fde68a")

        for mine in list(self.landmines):
            pulse = 1.5 + 0.5 * math.sin(now * 5.0)
            try:
                self.canvas.itemconfigure(mine.glow_id, width=max(1, int(round(pulse))))
            except Exception:
                pass

            triggered = False
            for e in list(self.enemies):
                dx = e.x - mine.x
                dy = e.y - mine.y
                if dx * dx + dy * dy <= (mine.r + e.r) ** 2:
                    self._detonate_landmine(mine, hit_enemy=e)
                    triggered = True
                    break
            if triggered:
                continue

            if self.boss is not None and self.boss.hp > 0:
                dx = self.boss.x - mine.x
                dy = self.boss.y - mine.y
                if dx * dx + dy * dy <= (mine.r + self.boss.r) ** 2:
                    self._detonate_landmine(mine, hit_boss=True)

    # -------------------------
    # Key handlers
    # -------------------------

    def on_key_down(self, e):
        k = self._normalize_bound_key(e.keysym or "")

        if self.rebinding_action is not None:
            self.set_keybind(self.rebinding_action, k)
            return

        if self.screen == "game" and k == self.keybinds["menu"]:
            self.toggle_pause_menu()
            return
        if self.screen == "pause" and k == self.keybinds["menu"]:
            self.toggle_pause_menu()
            return
        if self.screen == "settings" and k == self.keybinds["menu"]:
            self.back_from_settings()
            return

        if self.screen != "game":
            return

        if k == self.keybinds["move_up"]:
            self.keys["move_up"] = True
        elif k == self.keybinds["move_left"]:
            self.keys["move_left"] = True
        elif k == self.keybinds["move_down"]:
            self.keys["move_down"] = True
        elif k == self.keybinds["move_right"]:
            self.keys["move_right"] = True
        elif k == self.keybinds["attack"]:
            self.on_attack_press()
        elif k == self.keybinds["restart"]:
            self.restart_level()
        elif k == self.keybinds["next_level"]:
            self.next_level()

    def on_key_up(self, e):
        k = self._normalize_bound_key(e.keysym or "")

        if self.screen != "game":
            return

        if k == self.keybinds["move_up"]:
            self.keys["move_up"] = False
        elif k == self.keybinds["move_left"]:
            self.keys["move_left"] = False
        elif k == self.keybinds["move_down"]:
            self.keys["move_down"] = False
        elif k == self.keybinds["move_right"]:
            self.keys["move_right"] = False
        elif k == self.keybinds["attack"]:
            self.on_attack_release()

    def on_attack_press(self, _e=None):
        if self.screen != "game":
            return
        if self.shop_open or self.game_over or self.win:
            return
        self.attack_held = True
        self.try_player_attack()

    def on_attack_release(self, _e=None):
        if self.screen != "game":
            return
        self.attack_held = False

    def restart_level(self, _e=None):
        if self.screen != "game":
                    return
        for k in self.keys:
            self.keys[k] = False
        self.attack_held = False
        if self.sandbox_mode:
            self.load_sandbox()
        else:
            self.load_level(self.level_index, full_heal=True)
        self.canvas.focus_set()

    def next_level(self, _e=None):
        if self.screen != "game":
                    return
        if self.sandbox_mode:
            return
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
            rr = random.choice([1, 1, 2])
            self.canvas.create_oval(x - rr, y - rr, x + rr, y + rr, fill="#e5e7eb", outline="")

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
        try:
            self.canvas.itemconfigure(self.player.aim_id, state=("normal" if self.opt_show_arrow.get() else "hidden"))
        except Exception:
            pass
        self._sync_weapon_sprite(self.player)

        for e in self.enemies:
            e.item_id = self.canvas.create_oval(
                e.x - e.r, e.y - e.r,
                e.x + e.r, e.y + e.r,
                fill="#fb7185", outline="#450a0a", width=3
            )
            e.aim_id = self.canvas.create_polygon(0, 0, 0, 0, 0, 0, fill="#fecdd3", outline="")
            self._update_aim_triangle(e.x, e.y, e.r, e.facing_x, e.facing_y, e.aim_id)
            try:
                self.canvas.itemconfigure(e.aim_id, state=("normal" if self.opt_show_arrow.get() else "hidden"))
            except Exception:
                pass
            self._sync_weapon_sprite(e)

        if self.boss is not None:
            if self.boss.sprite_img is not None:
                self.boss.item_id = self.canvas.create_image(
                    self.boss.x, self.boss.y,
                    image=self.boss.sprite_img,
                    anchor="center"
                )
            else:
                self.boss.item_id = self.canvas.create_oval(
                    self.boss.x - self.boss.r, self.boss.y - self.boss.r,
                    self.boss.x + self.boss.r, self.boss.y + self.boss.r,
                    fill="#ef4444", outline="#450a0a", width=4
                )

            self.boss.aim_id = self.canvas.create_polygon(0, 0, 0, 0, 0, 0, fill="#fecdd3", outline="")
            self._update_aim_triangle(self.boss.x, self.boss.y, self.boss.r, self.boss.facing_x, self.boss.facing_y, self.boss.aim_id)
            try:
                self.canvas.itemconfigure(self.boss.aim_id, state=("normal" if self.opt_show_arrow.get() else "hidden"))
            except Exception:
                pass
            self._sync_weapon_sprite(self.boss)

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
        try:
            self.canvas.itemconfigure(self.player.aim_id, state=("normal" if self.opt_show_arrow.get() else "hidden"))
        except Exception:
            pass
        self._sync_weapon_sprite(self.player)

        for e in self.enemies:
            self.canvas.coords(e.item_id, e.x - e.r, e.y - e.r, e.x + e.r, e.y + e.r)
            self._update_aim_triangle(e.x, e.y, e.r, e.facing_x, e.facing_y, e.aim_id)
            try:
                self.canvas.itemconfigure(e.aim_id, state=("normal" if self.opt_show_arrow.get() else "hidden"))
            except Exception:
                pass
            self._sync_weapon_sprite(e)

        if self.boss is not None and self.boss.hp > 0:
            if self.boss.sprite_img is not None:
                self.canvas.coords(self.boss.item_id, self.boss.x, self.boss.y)
            else:
                self.canvas.coords(
                    self.boss.item_id,
                    self.boss.x - self.boss.r, self.boss.y - self.boss.r,
                    self.boss.x + self.boss.r, self.boss.y + self.boss.r
                )
            self._update_aim_triangle(self.boss.x, self.boss.y, self.boss.r, self.boss.facing_x, self.boss.facing_y, self.boss.aim_id)
            try:
                self.canvas.itemconfigure(self.boss.aim_id, state=("normal" if self.opt_show_arrow.get() else "hidden"))
            except Exception:
                pass
            self._sync_weapon_sprite(self.boss)

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
        if self.keys["move_left"]:
            dx -= 1.0
        if self.keys["move_right"]:
            dx += 1.0
        if self.keys["move_up"]:
            dy -= 1.0
        if self.keys["move_down"]:
            dy += 1.0

        if dx != 0.0 or dy != 0.0:
            length = math.sqrt(dx * dx + dy * dy)
            dx /= length
            dy /= length

            if not self.opt_aim_by_mouse.get():
                self.player.facing_x = dx
                self.player.facing_y = dy

            step_x = dx * self.player.speed * dt
            step_y = dy * self.player.speed * dt
            self.player.x, self.player.y = self.move_circle_with_collisions(
                self.player.x, self.player.y, self.player.r, step_x, step_y
            )

        # Mouse-aim option: facing follows cursor instead of movement direction
        if self.opt_aim_by_mouse.get():
            vx = self.mouse_x - self.player.x
            vy = self.mouse_y - self.player.y
            fx, fy = self._norm(vx, vy, fallback=(self.player.facing_x, self.player.facing_y))
            self.player.facing_x = fx
            self.player.facing_y = fy

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

    def _apply_damage_to_target(self, hp_ref: int, shield_ref: int, dmg: int) -> Tuple[int, int, int, int]:
        shield = shield_ref
        hp = hp_ref
        absorbed = 0
        applied = 0

        if shield > 0:
            absorbed = min(shield, dmg)
            shield -= absorbed
            dmg -= absorbed
        if dmg > 0:
            applied = dmg
            hp -= dmg

        return hp, shield, absorbed, applied

    def apply_damage_to_enemy(self, e: Enemy, dmg: int):
        hp, shield, absorbed, applied = self._apply_damage_to_target(e.hp, e.shield, dmg)
        if absorbed > 0:
            self.float_text(e.x, e.y - 26, f"-{absorbed} SHIELD", "#c4b5fd")
        if applied > 0:
            self.float_text(e.x, e.y - 26, f"-{applied}", "#fbbf24")
        e.hp, e.shield = hp, shield

        self.money += 2
        if e.hp <= 0:
            self.money += 40
            self.float_text(e.x, e.y - 44, "+$40", "#34d399")

    def apply_damage_to_boss(self, dmg: int):
        if self.boss is None or self.boss.hp <= 0:
            return

        b = self.boss
        hp, shield, absorbed, applied = self._apply_damage_to_target(b.hp, b.shield, dmg)
        if absorbed > 0:
            self.float_text(b.x, b.y - 32, f"-{absorbed} SHIELD", "#c4b5fd")
        if applied > 0:
            self.float_text(b.x, b.y - 32, f"-{applied}", "#fbbf24")
        b.hp, b.shield = hp, shield

        self.money += 3
        if b.hp <= 0:
            self.money += 400
            self.float_text(b.x, b.y - 52, "+$400", "#34d399")

        self._update_boss_bar()

    # -------------------------
    # AOE explosion logic
    # -------------------------

    def explode_at(self, x: float, y: float, weapon: Weapon, hit_enemy: Optional[Enemy] = None, hit_boss: bool = False):
        if weapon.aoe_radius <= 0 or weapon.aoe_damage <= 0:
            return

        rid = self.canvas.create_oval(
            x - weapon.aoe_radius, y - weapon.aoe_radius,
            x + weapon.aoe_radius, y + weapon.aoe_radius,
            outline="#fde68a", width=4
        )
        self.explosions.append((rid, time.time(), 0.18))

        r2 = weapon.aoe_radius * weapon.aoe_radius

        for e in list(self.enemies):
            if e.hp <= 0:
                continue
            dx = e.x - x
            dy = e.y - y
            if dx * dx + dy * dy <= r2:
                if hit_enemy is not None and e is hit_enemy:
                    continue
                self.apply_damage_to_enemy(e, weapon.aoe_damage)

        if self.boss is not None and self.boss.hp > 0:
            dx = self.boss.x - x
            dy = self.boss.y - y
            if dx * dx + dy * dy <= r2:
                if not hit_boss:
                    self.apply_damage_to_boss(weapon.aoe_damage)

        self.float_text(x, y - 22, "BOOM", "#fde68a")

    def update_explosions(self):
        keep = []
        for rid, t0, dur in self.explosions:
            if time.time() - t0 >= dur:
                self.canvas.delete(rid)
            else:
                keep.append((rid, t0, dur))
        self.explosions = keep

    # -------------------------
    # Railcannon laser (hitscan + visuals)
    # -------------------------

    def _clear_lasers(self):
        for beam in self.lasers:
            for cid in beam.ids:
                self.canvas.delete(cid)
        self.lasers.clear()

    def update_lasers(self):
        now = time.time()
        keep: List[LaserBeam] = []
        for beam in self.lasers:
            if now - beam.t0 >= beam.dur:
                for cid in beam.ids:
                    self.canvas.delete(cid)
            else:
                keep.append(beam)
        self.lasers = keep

    def _ray_rect_intersect_dist(self, ox: float, oy: float, dx: float, dy: float, rect: Rect) -> Optional[float]:
        eps = 1e-9

        if abs(dx) < eps:
            if ox < rect.x or ox > rect.x + rect.w:
                return None
            tx_min, tx_max = -float("inf"), float("inf")
        else:
            tx1 = (rect.x - ox) / dx
            tx2 = (rect.x + rect.w - ox) / dx
            tx_min, tx_max = (tx1, tx2) if tx1 <= tx2 else (tx2, tx1)

        if abs(dy) < eps:
            if oy < rect.y or oy > rect.y + rect.h:
                return None
            ty_min, ty_max = -float("inf"), float("inf")
        else:
            ty1 = (rect.y - oy) / dy
            ty2 = (rect.y + rect.h - oy) / dy
            ty_min, ty_max = (ty1, ty2) if ty1 <= ty2 else (ty2, ty1)

        t_enter = max(tx_min, ty_min)
        t_exit = min(tx_max, ty_max)

        if t_exit < 0:
            return None
        if t_enter > t_exit:
            return None

        return t_enter if t_enter >= 0 else t_exit

    def _raycast_walls(self, ox: float, oy: float, dx: float, dy: float, max_dist: float) -> float:
        best = max_dist
        for r, _cid in self.obstacles:
            t = self._ray_rect_intersect_dist(ox, oy, dx, dy, r)
            if t is None:
                continue
            if 0 <= t < best:
                best = t
        return best

    def _raycast_enemy(self, ox: float, oy: float, dx: float, dy: float, max_dist: float) -> Tuple[Optional[Enemy], float]:
        best_e: Optional[Enemy] = None
        best_t = max_dist

        for e in self.enemies:
            if e.hp <= 0:
                continue

            vx = e.x - ox
            vy = e.y - oy
            t = vx * dx + vy * dy
            if t < 0 or t > max_dist:
                continue

            px = ox + dx * t
            py = oy + dy * t
            ddx = e.x - px
            ddy = e.y - py
            if ddx * ddx + ddy * ddy <= e.r * e.r:
                if t < best_t:
                    best_t = t
                    best_e = e

        return best_e, best_t

    def _raycast_boss(self, ox: float, oy: float, dx: float, dy: float, max_dist: float) -> Tuple[bool, float]:
        if self.boss is None or self.boss.hp <= 0:
            return False, max_dist

        b = self.boss
        vx = b.x - ox
        vy = b.y - oy
        t = vx * dx + vy * dy
        if t < 0 or t > max_dist:
            return False, max_dist

        px = ox + dx * t
        py = oy + dy * t
        ddx = b.x - px
        ddy = b.y - py
        if ddx * ddx + ddy * ddy <= b.r * b.r:
            return True, t
        return False, max_dist

    def fire_player_railcannon(self, w: Weapon):
        fx, fy = self._norm(self.player.facing_x, self.player.facing_y, fallback=(1.0, 0.0))
        ox, oy = self._projectile_spawn_pos(self.player, w.key)

        max_dist = 1200.0
        wall_dist = self._raycast_walls(ox, oy, fx, fy, max_dist)

        hit_e, hit_t = self._raycast_enemy(ox, oy, fx, fy, wall_dist)
        hit_boss, boss_t = self._raycast_boss(ox, oy, fx, fy, wall_dist)

        end_t = wall_dist
        hit_type = None
        if hit_e is not None and hit_t < end_t:
            end_t = hit_t
            hit_type = ("enemy", hit_e)
        if hit_boss and boss_t < end_t:
            end_t = boss_t
            hit_type = ("boss", None)

        ex = ox + fx * end_t
        ey = oy + fy * end_t

        if hit_type is not None:
            if hit_type[0] == "enemy":
                he = hit_type[1]
                if he is not None:
                    self.apply_damage_to_enemy(he, w.damage)
                    if w.aoe_radius > 0 and w.aoe_damage > 0:
                        self.explode_at(ex, ey, w, hit_enemy=he)
            else:
                self.apply_damage_to_boss(w.damage)
                if w.aoe_radius > 0 and w.aoe_damage > 0:
                    self.explode_at(ex, ey, w, hit_boss=True)

        glow = self.canvas.create_line(ox, oy, ex, ey, fill="#7dd3fc", width=10)
        mid = self.canvas.create_line(ox, oy, ex, ey, fill="#38bdf8", width=6)
        core = self.canvas.create_line(ox, oy, ex, ey, fill="#e0f2fe", width=2)
        self.lasers.append(LaserBeam(ids=[glow, mid, core], t0=time.time(), dur=0.18))

    # -------------------------
    # Attacks (hold-to-fire)
    # -------------------------

    def try_player_attack(self):
        if self.shop_open or self.game_over or self.win:
            return

        now = time.time()
        w = self.weapons[self.player.weapon_key]
        if now < self.player.next_attack_time:
            return
        self.player.next_attack_time = now + w.cooldown

        if w.key == "landmine":
            self._place_landmine()
        elif w.kind == "gun":
            if w.key == "railcannon":
                self.fire_player_railcannon(w)
            else:
                self.fire_player_gun(w)
        else:
            self.player_melee_swing(w)


    def fire_player_gun(self, w: Weapon):
        fx, fy = self._norm(self.player.facing_x, self.player.facing_y, fallback=(1.0, 0.0))
        sx, sy = self._projectile_spawn_pos(self.player, w.key)

        for _ in range(w.pellet_count):
            ang = math.atan2(fy, fx)
            if w.spread_deg > 0:
                ang += math.radians(random.uniform(-w.spread_deg, w.spread_deg))

            vx = math.cos(ang) * w.bullet_speed
            vy = math.sin(ang) * w.bullet_speed

            br = 6 if w.key == "blaster" else 5
            fill = "#f59e0b" if w.key == "blaster" else "#fbbf24"

            self._spawn_bullet(
                x=sx, y=sy, vx=vx, vy=vy,
                r=br, fill=fill, from_enemy=False,
                damage=w.damage, weapon_key=w.key
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

        if self.boss is not None and self.boss.hp > 0:
            dx = self.boss.x - self.player.x
            dy = self.boss.y - self.player.y
            dist2 = dx * dx + dy * dy
            if dist2 <= (w.range + self.boss.r) ** 2:
                dist = max(1.0, math.sqrt(dist2))
                nx, ny = dx / dist, dy / dist
                if (nx * fx + ny * fy) > 0.2:
                    self.apply_damage_to_boss(w.damage)

    def enemy_attack(self, e: Enemy, now: float):
        w = self.weapons[e.weapon_key]
        if now < e.next_attack_time:
            return
        e.next_attack_time = now + w.cooldown

        dx = self.player.x - e.x
        dy = self.player.y - e.y
        fx, fy = self._norm(dx, dy, fallback=(-1.0, 0.0))
        e.facing_x, e.facing_y = fx, fy

        if w.key == "landmine":
            return

        if w.kind == "gun":
            sx, sy = self._projectile_spawn_pos(e, w.key)
            for _ in range(w.pellet_count):
                ang = math.atan2(fy, fx)
                if w.spread_deg > 0:
                    ang += math.radians(random.uniform(-w.spread_deg, w.spread_deg))
                vx = math.cos(ang) * (w.bullet_speed * 0.75)
                vy = math.sin(ang) * (w.bullet_speed * 0.75)

                self._spawn_bullet(
                    x=sx, y=sy, vx=vx, vy=vy,
                    r=4, fill="#93c5fd", from_enemy=True,
                    damage=w.damage, weapon_key=w.key
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

    def boss_attack(self, b: Boss, now: float):
        w = self.weapons[b.weapon_key]
        if now < b.next_attack_time:
            return
        b.next_attack_time = now + w.cooldown

        dx = self.player.x - b.x
        dy = self.player.y - b.y
        fx, fy = self._norm(dx, dy, fallback=(-1.0, 0.0))
        b.facing_x, b.facing_y = fx, fy

        if w.key == "landmine":
            return

        if w.kind == "gun":
            sx, sy = self._projectile_spawn_pos(b, w.key)

            salvo = 1
            if w.key == "rocket_launcher":
                salvo = 1
            elif w.key == "minigun":
                salvo = 3
            elif w.key == "shotgun":
                salvo = max(6, w.pellet_count)

            for _ in range(salvo):
                ang = math.atan2(fy, fx)
                spread = 7.0 if w.key == "rocket_launcher" else (w.spread_deg if w.spread_deg > 0 else 4.0)
                ang += math.radians(random.uniform(-spread, spread))

                spd = w.bullet_speed * 0.70 if w.bullet_speed > 0 else 520.0
                vx = math.cos(ang) * spd
                vy = math.sin(ang) * spd

                br = 7 if w.key in ("rocket_launcher", "blaster") else 5
                fill = "#60a5fa" if w.key != "rocket_launcher" else "#93c5fd"

                self._spawn_bullet(
                    x=sx, y=sy, vx=vx, vy=vy,
                    r=br, fill=fill, from_enemy=True,
                    damage=w.damage, weapon_key=w.key
                )
        else:
            dxp = self.player.x - b.x
            dyp = self.player.y - b.y
            dist2 = dxp * dxp + dyp * dyp
            if dist2 <= (w.range + self.player.r) ** 2:
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

            if self.bullet_hits_wall(b.x, b.y, b.r):
                if (not b.from_enemy) and b.weapon_key in ("blaster", "rocket_launcher"):
                    self.explode_at(b.x, b.y, self.weapons[b.weapon_key])
                if b.from_enemy and b.weapon_key in ("blaster", "rocket_launcher"):
                    self._enemy_explode_at(b.x, b.y, self.weapons[b.weapon_key])
                self.canvas.delete(b.item_id)
                continue

            if b.from_enemy:
                dx = b.x - self.player.x
                dy = b.y - self.player.y
                if dx * dx + dy * dy <= (b.r + self.player.r) ** 2:
                    self.apply_damage_to_player(b.damage)
                    if b.weapon_key in ("blaster", "rocket_launcher"):
                        self._enemy_explode_at(b.x, b.y, self.weapons[b.weapon_key])
                    self.canvas.delete(b.item_id)
                    continue
            else:
                hit_enemy: Optional[Enemy] = None
                for e in list(self.enemies):
                    dx = b.x - e.x
                    dy = b.y - e.y
                    if dx * dx + dy * dy <= (b.r + e.r) ** 2:
                        hit_enemy = e
                        break

                hit_boss = False
                if hit_enemy is None and self.boss is not None and self.boss.hp > 0:
                    dx = b.x - self.boss.x
                    dy = b.y - self.boss.y
                    if dx * dx + dy * dy <= (b.r + self.boss.r) ** 2:
                        hit_boss = True

                if hit_enemy is not None:
                    self.apply_damage_to_enemy(hit_enemy, b.damage)
                    if b.weapon_key in ("blaster", "rocket_launcher"):
                        self.explode_at(b.x, b.y, self.weapons[b.weapon_key], hit_enemy=hit_enemy)
                    self.canvas.delete(b.item_id)
                    continue

                if hit_boss:
                    self.apply_damage_to_boss(b.damage)
                    if b.weapon_key in ("blaster", "rocket_launcher"):
                        self.explode_at(b.x, b.y, self.weapons[b.weapon_key], hit_boss=True)
                    self.canvas.delete(b.item_id)
                    continue

            if -60 <= b.x <= 1040 and -60 <= b.y <= 700:
                self.canvas.coords(b.item_id, b.x - b.r, b.y - b.r, b.x + b.r, b.y + b.r)
                alive.append(b)
            else:
                self.canvas.delete(b.item_id)

        self.bullets = alive

    def _enemy_explode_at(self, x: float, y: float, weapon: Weapon):
        if weapon.aoe_radius <= 0 or weapon.aoe_damage <= 0:
            return

        rid = self.canvas.create_oval(
            x - weapon.aoe_radius, y - weapon.aoe_radius,
            x + weapon.aoe_radius, y + weapon.aoe_radius,
            outline="#93c5fd", width=4
        )
        self.explosions.append((rid, time.time(), 0.18))

        r2 = weapon.aoe_radius * weapon.aoe_radius

        dx = self.player.x - x
        dy = self.player.y - y
        if dx * dx + dy * dy <= r2:
            self.apply_damage_to_player(weapon.aoe_damage)

        self.float_text(x, y - 22, "BOOM", "#93c5fd")

    # -------------------------
    # Enemy + Boss AI
    # -------------------------

    def update_enemies(self, dt: float):
        if self.shop_open:
            return

        now = time.time()
        desired = 240.0

        for e in list(self.enemies):
            if e.hp <= 0:
                self.canvas.delete(e.item_id)
                if getattr(e, "weapon_item_id", -1) != -1:
                    self.canvas.delete(e.weapon_item_id)
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

    def update_boss(self, dt: float):
        if self.shop_open:
            return
        if self.boss is None or self.boss.hp <= 0:
            return

        b = self.boss
        now = time.time()

        dx = self.player.x - b.x
        dy = self.player.y - b.y
        dist = max(1.0, math.sqrt(dx * dx + dy * dy))

        w = self.weapons[b.weapon_key]
        desired = 300.0 if w.kind == "gun" else 140.0

        dir_x = dx / dist
        dir_y = dy / dist

        move_x = 0.0
        move_y = 0.0

        if dist > desired:
            move_x = dir_x * b.speed * dt
            move_y = dir_y * b.speed * dt
        elif dist < desired * 0.70:
            move_x = -dir_x * b.speed * dt
            move_y = -dir_y * b.speed * dt
        else:
            strafe = math.sin(time.time() * 1.2) * 1.0
            move_x = (-dir_y) * b.speed * 0.55 * dt * strafe
            move_y = (dir_x) * b.speed * 0.55 * dt * strafe

        if b.shield <= max(10, b.max_shield // 10):
            move_x += dir_x * b.speed * 0.25 * dt
            move_y += dir_y * b.speed * 0.25 * dt

        b.x, b.y = self.move_circle_with_collisions(b.x, b.y, b.r, move_x, move_y)

        fx, fy = self._norm(dx, dy, fallback=(-1.0, 0.0))
        b.facing_x, b.facing_y = fx, fy

        self.boss_attack(b, now)
        self._update_boss_bar()

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
        weapon_name = self.weapons[self.player.weapon_key].name
        enemies_count = len(self.enemies) + (1 if (self.boss is not None and self.boss.hp > 0) else 0)
        if self.sandbox_mode:
            self.level_label.config(text=f"Sandbox   (Enemies spawned: {self.sandbox_enemy_count_last})")
            money_text = "INF"
        else:
            lvl = self.levels[self.level_index]
            self.level_label.config(text=f"{lvl.name}   (Level {self.level_index + 1}/{len(self.levels)})")
            money_text = f"${self.money}"
        extra = ""
        if self.player.weapon_key == "landmine":
            recharging = len(self.landmine_recharge_queue)
            extra = f"   Mines {self.landmine_charges}/{self.landmine_max_charges}"
            if recharging > 0:
                extra += f" ({recharging} recharging)"
        self.hud_label.config(
            text=f"HP {max(0, self.player.hp)}/{self.player.max_hp}   "
                 f"Shield {max(0, self.player.shield)}/{self.player.max_shield}   "
                 f"Enemies {enemies_count}   Money {money_text}   Weapon {weapon_name}{extra}"
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
        if self._pending_unlock_message:
            self.canvas.create_text(w / 2, h / 2 + 60, text=self._pending_unlock_message,
                                    fill="#fef3c7", font=("Helvetica", 12, "bold"))

    # -------------------------
    # Unlock logic
    # -------------------------

    def _handle_boss_unlocks_on_level_clear(self):
        # Level 10 boss is level_index == 9, Level 15 boss is level_index == 14
        if self.level_index == 9 and not self.unlocked_chunkier:
            self.unlocked_chunkier = True
            self._pending_unlock_message = "Unlocked Boss Weapon: ChunkierGun (Shop → Boss Weapons)"
            self.float_text(self.player.x, self.player.y - 60, "UNLOCKED: CHUNKIERGUN", "#fef3c7")

        if self.level_index == 14 and not self.unlocked_pukeko:
            self.unlocked_pukeko = True
            self._pending_unlock_message = "Unlocked Boss Weapon: Pukeko (Shop → Boss Weapons)"
            self.float_text(self.player.x, self.player.y - 60, "UNLOCKED: PUKEKO", "#fef3c7")

    # -------------------------
    # Main loop
    # -------------------------

    def loop(self):
        now = time.time()
        dt = now - self.last_time
        self.last_time = now

        # Menu / Settings screens: keep idle
        if self.screen != "game" or self.player is None:
            self.root.after(16, self.loop)
            return

        if not self.game_over and not self.win:
            self.update_player(dt)

            if self.attack_held:
                self.try_player_attack()

            self.update_enemies(dt)
            self.update_boss(dt)
            self.update_bullets(dt)
            self.update_landmines()
            self.update_entity_draw()
            self.update_float_texts()
            self.update_explosions()
            self.update_lasers()
            self.refresh_ui()
            self.refresh_shop_ui()
            self.refresh_boss_shop_ui()
            self._update_boss_bar()

            if self.player.hp <= 0:
                self.game_over = True
                self.attack_held = False
                self.show_end_screen("YOU LOSE", "Press R to restart", "#93c5fd")
                self.canvas.focus_set()
            else:
                enemies_left = len(self.enemies)
                boss_left = 1 if (self.boss is not None and self.boss.hp > 0) else 0
                if (not self.sandbox_mode) and enemies_left + boss_left == 0:
                    self.win = True
                    self.attack_held = False

                    # Unlock boss weapons if applicable
                    self._handle_boss_unlocks_on_level_clear()

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
