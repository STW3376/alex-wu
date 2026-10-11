"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  ASSET_BASE,
  BOSS_SPRITE_FILE,
  KEY_ACTIONS,
  MUSIC_FILE,
  SANDBOX_WEAPON_CHOICES,
  WEAPON_SPRITE_FILES,
  WORLD_H,
  WORLD_W,
  type KeyAction,
} from "@/games/duel/data";
import { DuelEngine, type GameView, type ShopButtonView } from "@/games/duel/engine";

type Frame = {
  sig: string;
  view: GameView;
};

const BTN =
  "cursor-pointer bg-[#e5e7eb] px-3 py-1.5 text-center text-sm text-black disabled:cursor-not-allowed disabled:opacity-40";

function isTypingTarget(target: EventTarget | null) {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  );
}

function normalizeKey(event: { key: string }) {
  const key = event.key;
  if (key === " ") return "space";
  if (key === "Escape") return "escape";
  if (key === "ArrowLeft") return "left";
  if (key === "ArrowRight") return "right";
  if (key === "ArrowUp") return "up";
  if (key === "ArrowDown") return "down";
  if (key === "Enter") return "return";
  if (key === "Backspace") return "backspace";
  if (key === "Tab") return "tab";
  if (key === "CapsLock") return "caps_lock";
  if (key === "Shift") return "shift_l";
  if (key === "Control") return "control_l";
  if (key === "Alt") return "alt_l";
  if (key === "Meta") return "super_l";
  return key.toLowerCase();
}

function ShopCard({
  item,
  onBuy,
}: {
  item: ShopButtonView;
  onBuy: (key: string) => void;
}) {
  return (
    <div className="bg-[#111827] px-3.5 py-3 outline outline-1 outline-[#1f2937]">
      <p className="text-xs font-bold text-white">{item.name}</p>
      <p className="mt-1 text-[10px] leading-snug text-[#cbd5e1]">{item.desc}</p>
      <div className="mt-2.5 flex justify-end">
        <button
          type="button"
          disabled={!item.enabled}
          aria-label={`${item.name}: ${item.button}`}
          onClick={() => onBuy(item.key)}
          className={BTN}
        >
          {item.button}
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const id = `sandbox-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return (
    <label htmlFor={id} className="flex items-center gap-2 py-0.5 text-[11px] text-white">
      <span className="w-40 shrink-0">{label}</span>
      <input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-20 border border-[#334155] bg-white px-1 py-0.5 text-black"
      />
    </label>
  );
}

export function DuelGame() {
  const [game] = useState(() => new DuelEngine());
  const [frame, setFrame] = useState<Frame>(() => game.snapshot());
  const [scale, setScale] = useState(1);
  const [focused, setFocused] = useState(false);
  const outerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const musicBroken = useRef(false);
  const gestured = useRef(false);

  const publish = () => {
    setFrame(game.snapshot());
  };

  const tryMusic = () => {
    if (!game.musicEnabled || musicBroken.current || !gestured.current) {
      return;
    }
    if (!audioRef.current) {
      const audio = new Audio(`${ASSET_BASE}/${MUSIC_FILE}`);
      audio.loop = true;
      audio.preload = "auto";
      audio.addEventListener("error", () => {
        musicBroken.current = true;
      });
      audioRef.current = audio;
    }
    const audio = audioRef.current;
    if (!audio.paused) {
      return;
    }
    void audio.play().catch(() => {
      // A missing file or a rejected play leaves the game silent, like pygame failing to start.
    });
  };

  const noteGesture = () => {
    gestured.current = true;
    tryMusic();
  };

  useLayoutEffect(() => {
    const outer = outerRef.current;
    if (!outer) {
      return;
    }
    const apply = () => {
      const width = outer.clientWidth;
      if (width > 0) {
        setScale(Math.min(1, width / WORLD_W));
      }
    };
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(outer);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    for (const [key, file] of Object.entries(WEAPON_SPRITE_FILES)) {
      const image = new Image();
      image.onload = () => {
        if (!cancelled) {
          game.setWeaponSprite(key, image);
        }
      };
      image.src = `${ASSET_BASE}/${file}`;
    }
    const boss = new Image();
    boss.onload = () => {
      if (!cancelled) {
        game.setBossSprite(boss);
      }
    };
    boss.src = `${ASSET_BASE}/${BOSS_SPRITE_FILE}`;
    return () => {
      cancelled = true;
    };
  }, [game]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const stage = stageRef.current;
    if (!canvas || !stage) {
      return;
    }

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(WORLD_W * dpr);
    canvas.height = Math.round(WORLD_H * dpr);
    stage.focus({ preventScroll: true });

    let alive = true;
    let last = performance.now();
    let raf = 0;

    const onVisibility = () => {
      last = performance.now();
    };
    document.addEventListener("visibilitychange", onVisibility);

    const tick = (now: number) => {
      if (!alive) {
        return;
      }
      raf = requestAnimationFrame(tick);
      if (document.hidden) {
        last = now;
        return;
      }
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      game.update(dt);

      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        game.render(ctx);
      }

      const next = game.snapshot();
      setFrame((current) => (current.sig === next.sig ? current : next));
    };

    raf = requestAnimationFrame(tick);
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [game]);

  useEffect(() => {
    if (frame.view.screen === "game" && !frame.view.shopOpen) {
      stageRef.current?.focus({ preventScroll: true });
    }
  }, [frame.view.screen, frame.view.shopOpen]);

  const view = frame.view;

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (isTypingTarget(event.target)) {
      return;
    }
    noteGesture();
    const key = normalizeKey(event);
    if (
      event.key === " " ||
      event.key.startsWith("Arrow") ||
      KEY_ACTIONS.some((action) => game.keybinds[action] === key)
    ) {
      event.preventDefault();
    }
    game.handleKeyDown(key, event.repeat);
    publish();
  };

  const onKeyUp = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (isTypingTarget(event.target)) {
      return;
    }
    game.handleKeyUp(normalizeKey(event));
  };

  const setOption = (apply: () => void) => {
    apply();
    publish();
  };

  const sandbox = view.sandbox;

  return (
    <div ref={outerRef} className="w-full max-w-[980px]">
      <div style={{ width: WORLD_W * scale, height: WORLD_H * scale }}>
        <div
          ref={stageRef}
          role="application"
          tabIndex={0}
          aria-label="2D Duel. W A S D move, hold Space to attack, the Shop button opens the shop, N goes to the next level after a win, R restarts, Escape pauses."
          onKeyDown={onKeyDown}
          onKeyUp={onKeyUp}
          onFocus={() => setFocused(true)}
          onBlur={(event) => {
            const next = event.relatedTarget;
            if (next instanceof Node && event.currentTarget.contains(next)) {
              return;
            }
            game.clearMoveKeys();
            setFocused(false);
          }}
          onPointerDown={(event) => {
            noteGesture();
            if (
              event.target instanceof HTMLButtonElement ||
              event.target instanceof HTMLInputElement ||
              event.target instanceof HTMLSelectElement ||
              event.target instanceof HTMLAnchorElement ||
              event.target instanceof HTMLTextAreaElement ||
              event.target instanceof HTMLLabelElement
            ) {
              return;
            }
            event.currentTarget.focus({ preventScroll: true });
          }}
          onPointerMove={(event) => {
            const rect = event.currentTarget.getBoundingClientRect();
            if (rect.width <= 0 || rect.height <= 0) {
              return;
            }
            game.setMouse(
              ((event.clientX - rect.left) / rect.width) * WORLD_W,
              ((event.clientY - rect.top) / rect.height) * WORLD_H,
            );
          }}
          className="relative origin-top-left touch-none overflow-hidden select-none outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold"
          style={{
            width: WORLD_W,
            height: WORLD_H,
            transform: `scale(${scale})`,
            background: "#0b1020",
            fontFamily: "Helvetica, Arial, sans-serif",
          }}
        >
          <canvas
            ref={canvasRef}
            width={WORLD_W}
            height={WORLD_H}
            aria-hidden="true"
            className="block h-[640px] w-[980px]"
          />

          {view.showHud ? (
            <div className="pointer-events-none absolute top-3 left-3 max-w-[760px]">
              <p className="text-sm font-bold text-white">{view.hud}</p>
              <p className="mt-1 text-[11px] font-bold text-[#e5e7eb]">{view.level}</p>
              <p className="mt-1 text-[10px] text-[#cbd5e1]">{view.tip}</p>
            </div>
          ) : null}

          {view.bossBar.visible ? (
            <div className="pointer-events-none absolute top-3 left-1/2 w-[520px] -translate-x-1/2">
              <p className="text-xs font-bold text-[#fecdd3]">{view.bossBar.name}</p>
              <div className="mt-1 h-[18px] w-[520px] border-2 border-[#334155] bg-[#111827]">
                <div
                  className="mt-px ml-px h-2.5 bg-[#fb7185]"
                  style={{ width: `${Math.max(0, view.bossBar.frac) * 508}px` }}
                />
              </div>
            </div>
          ) : null}

          {view.showShopButton ? (
            <button
              type="button"
              onClick={() => {
                game.toggleShop();
                publish();
              }}
              className={`${BTN} absolute top-2.5 right-2.5 px-3 py-1.5`}
            >
              Shop
            </button>
          ) : null}

          {focused ? null : (
            <p className="pointer-events-none absolute right-0 bottom-6 left-0 text-center text-sm font-bold text-white">
              Click the game to use the keyboard
            </p>
          )}

          {view.screen === "menu" ? (
            <div className="absolute inset-0 flex items-center justify-center bg-[#0b1020]">
              <div className="w-56">
                <p className="mb-[18px] text-center text-[28px] font-bold text-white">2D DUEL</p>
                <div className="flex flex-col gap-1.5">
                  <button type="button" onClick={() => { game.startGame(); publish(); }} className={`${BTN} py-2.5`}>
                    Play
                  </button>
                  <button type="button" onClick={() => { game.showSandboxBuilder(); publish(); }} className={`${BTN} py-2.5`}>
                    Sandbox
                  </button>
                  <button type="button" onClick={() => { game.showSettings("menu"); publish(); }} className={`${BTN} py-2.5`}>
                    Settings
                  </button>
                  <Link href="/games" className={`${BTN} mt-3 block py-2.5`}>
                    Quit
                  </Link>
                </div>
              </div>
            </div>
          ) : null}

          {view.screen === "settings" ? (
            <div className="absolute inset-0 overflow-y-auto bg-[#0b1020]" style={{ touchAction: "auto" }}>
              <div className="mx-auto w-[420px] py-8">
                <p className="mb-3.5 text-[22px] font-bold text-white">Settings</p>
                <label className="flex items-center gap-2 py-1.5 text-sm text-white">
                  <input
                    type="checkbox"
                    checked={view.aimByMouse}
                    onChange={(event) => setOption(() => { game.setAimByMouse(event.target.checked); })}
                  />
                  Aim follows mouse
                </label>
                <label className="flex items-center gap-2 py-1.5 text-sm text-white">
                  <input
                    type="checkbox"
                    checked={view.showArrow}
                    onChange={(event) => setOption(() => { game.setShowArrow(event.target.checked); })}
                  />
                  Show direction arrow
                </label>
                <label className="flex items-center gap-2 py-1.5 text-sm text-white">
                  <input
                    type="checkbox"
                    checked={view.showWeaponSprites}
                    onChange={(event) => setOption(() => { game.setShowWeaponSprites(event.target.checked); })}
                  />
                  Show weapon sprites
                </label>
                <label className="flex items-center gap-2 py-1.5 text-sm text-white">
                  <input
                    type="checkbox"
                    checked={view.musicEnabled}
                    onChange={(event) => {
                      game.setMusicEnabled(event.target.checked);
                      if (!event.target.checked) {
                        audioRef.current?.pause();
                      } else {
                        noteGesture();
                      }
                      publish();
                    }}
                  />
                  Music
                </label>
                <p className="mt-4 text-sm font-bold text-white">Controls</p>
                <div className="mt-2">
                  {view.keybinds.map((row) => (
                    <div key={row.action} className="flex items-center justify-between py-0.5">
                      <span className="text-[11px] text-white">{row.label}</span>
                      <button
                        type="button"
                        onClick={() => {
                          game.startRebind(row.action as KeyAction);
                          publish();
                        }}
                        className={`${BTN} w-28`}
                      >
                        {row.keyLabel}
                      </button>
                    </div>
                  ))}
                </div>
                <p className="mt-2.5 text-[10px] text-[#94a3b8]">
                  Music: assets/music.mp3 (auto-plays if pygame is installed).
                </p>
                <button
                  type="button"
                  onClick={() => {
                    game.backFromSettings();
                    publish();
                  }}
                  className={`${BTN} mt-4 w-full py-2.5`}
                >
                  Back
                </button>
              </div>
            </div>
          ) : null}

          {view.screen === "sandbox" ? (
            <div className="absolute inset-0 overflow-y-auto bg-[#0b1020]" style={{ touchAction: "auto" }}>
              <div className="mx-auto w-[760px] py-6">
                <p className="mb-3 text-[22px] font-bold text-white">Sandbox</p>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="mb-1.5 text-sm font-bold text-white">Player</p>
                    <Field label="Player HP" value={sandbox.playerHp} onChange={(value) => { game.setSandboxField("playerHp", value); publish(); }} />
                    <Field label="Player Shield" value={sandbox.playerShield} onChange={(value) => { game.setSandboxField("playerShield", value); publish(); }} />
                    <Field label="Player Speed" value={sandbox.playerSpeed} onChange={(value) => { game.setSandboxField("playerSpeed", value); publish(); }} />
                    <Field label="Enemy Count (0-8)" value={sandbox.enemyCount} onChange={(value) => { game.setSandboxField("enemyCount", value); publish(); }} />
                    <Field label="Enemy HP" value={sandbox.enemyHp} onChange={(value) => { game.setSandboxField("enemyHp", value); publish(); }} />
                    <Field label="Enemy Shield" value={sandbox.enemyShield} onChange={(value) => { game.setSandboxField("enemyShield", value); publish(); }} />
                    <Field label="Enemy Speed" value={sandbox.enemySpeed} onChange={(value) => { game.setSandboxField("enemySpeed", value); publish(); }} />
                    <p className="mt-4 mb-1.5 text-sm font-bold text-white">Custom Weapon</p>
                    <label className="flex items-center gap-2 py-0.5 text-[11px] text-white">
                      <span className="w-40">Weapon Type</span>
                      <select
                        aria-label="Weapon Type"
                        value={sandbox.weaponKind}
                        onChange={(event) => { game.setSandboxField("weaponKind", event.target.value); publish(); }}
                        className="bg-white px-1 py-0.5 text-black"
                      >
                        <option value="gun">gun</option>
                        <option value="melee">melee</option>
                      </select>
                    </label>
                    <Field label="Damage" value={sandbox.weaponDamage} onChange={(value) => { game.setSandboxField("weaponDamage", value); publish(); }} />
                    <Field label="Cooldown" value={sandbox.weaponCooldown} onChange={(value) => { game.setSandboxField("weaponCooldown", value); publish(); }} />
                    <Field label="Bullet Speed" value={sandbox.weaponBulletSpeed} onChange={(value) => { game.setSandboxField("weaponBulletSpeed", value); publish(); }} />
                    <Field label="Melee Range" value={sandbox.weaponRange} onChange={(value) => { game.setSandboxField("weaponRange", value); publish(); }} />
                    <Field label="Pellet Count" value={sandbox.weaponPellets} onChange={(value) => { game.setSandboxField("weaponPellets", value); publish(); }} />
                    <Field label="Spread Degrees" value={sandbox.weaponSpread} onChange={(value) => { game.setSandboxField("weaponSpread", value); publish(); }} />
                    <Field label="AOE Radius" value={sandbox.weaponAoeRadius} onChange={(value) => { game.setSandboxField("weaponAoeRadius", value); publish(); }} />
                    <Field label="AOE Damage" value={sandbox.weaponAoeDamage} onChange={(value) => { game.setSandboxField("weaponAoeDamage", value); publish(); }} />
                  </div>
                  <div>
                    <p className="mb-1 text-sm font-bold text-white">Enemy Weapons</p>
                    <p className="mb-2 text-[10px] text-[#94a3b8]">Only the first N rows are used.</p>
                    {sandbox.enemyWeapons.map((weapon, index) => (
                      <label key={index} className="flex items-center gap-2 py-0.5 text-[11px] text-white">
                        <span className="w-16">{`Enemy ${index + 1}`}</span>
                        <select
                          aria-label={`Enemy ${index + 1} weapon`}
                          value={weapon}
                          onChange={(event) => { game.setEnemyWeapon(index, event.target.value); publish(); }}
                          className="bg-white px-1 py-0.5 text-black"
                        >
                          {SANDBOX_WEAPON_CHOICES.map((choice) => (
                            <option key={choice} value={choice}>{choice}</option>
                          ))}
                        </select>
                      </label>
                    ))}
                    <p className="mt-4 mb-1.5 text-sm font-bold text-white">Rectangles</p>
                    <div className="mt-1 flex flex-wrap gap-2">
                      <label className="flex items-center gap-1 text-[11px] text-white">
                        X
                        <input aria-label="Rectangle X" value={sandbox.rectX} onChange={(event) => { game.setSandboxField("rectX", valueFrom(event)); publish(); }} className="w-14 bg-white px-1 text-black" />
                      </label>
                      <label className="flex items-center gap-1 text-[11px] text-white">
                        Y
                        <input aria-label="Rectangle Y" value={sandbox.rectY} onChange={(event) => { game.setSandboxField("rectY", valueFrom(event)); publish(); }} className="w-14 bg-white px-1 text-black" />
                      </label>
                      <label className="flex items-center gap-1 text-[11px] text-white">
                        W
                        <input aria-label="Rectangle W" value={sandbox.rectW} onChange={(event) => { game.setSandboxField("rectW", valueFrom(event)); publish(); }} className="w-14 bg-white px-1 text-black" />
                      </label>
                      <label className="flex items-center gap-1 text-[11px] text-white">
                        H
                        <input aria-label="Rectangle H" value={sandbox.rectH} onChange={(event) => { game.setSandboxField("rectH", valueFrom(event)); publish(); }} className="w-14 bg-white px-1 text-black" />
                      </label>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button type="button" className={BTN} onClick={() => { game.addSandboxRectangle(); publish(); }}>Add Rectangle</button>
                      <button type="button" className={BTN} onClick={() => { game.removeSandboxRectangle(); publish(); }}>Remove Selected</button>
                      <button type="button" className={BTN} onClick={() => { game.clearSandboxRectangles(); publish(); }}>Clear Walls</button>
                    </div>
                    <div role="listbox" aria-label="Sandbox walls" className="mt-2 h-28 overflow-y-auto border border-[#334155] bg-white text-black">
                      {sandbox.rects.length === 0 ? (
                        <p className="px-2 py-1 text-[11px] text-[#64748b]">No rectangles</p>
                      ) : (
                        sandbox.rects.map((label, index) => (
                          <button
                            key={`${label}-${index}`}
                            type="button"
                            role="option"
                            aria-selected={sandbox.selectedRect === index}
                            onClick={() => { game.selectSandboxRect(index); publish(); }}
                            className={`block w-full px-2 py-0.5 text-left text-[11px] ${sandbox.selectedRect === index ? "bg-[#2563eb] text-white" : ""}`}
                          >
                            {label}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                </div>
                <p className="mt-3 text-[10px] text-[#94a3b8]">
                  Sandbox gives infinite money, equips your custom weapon, and uses your wall list.
                </p>
                <div className="mt-3 flex gap-2.5">
                  <button type="button" className={`${BTN} py-2.5`} onClick={() => { game.startSandbox(); publish(); }}>
                    Start Sandbox
                  </button>
                  <button type="button" className={`${BTN} py-2.5`} onClick={() => { game.showMenu(); publish(); }}>
                    Back
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {view.screen === "pause" ? (
            <div className="absolute inset-0 flex items-center justify-center bg-[#0b1020]">
              <div className="w-56">
                <p className="mb-3.5 text-center text-[22px] font-bold text-white">Menu</p>
                <div className="flex flex-col gap-1.5">
                  <button type="button" className={`${BTN} py-2.5`} onClick={() => { game.resumeGame(); publish(); }}>
                    Resume
                  </button>
                  <button type="button" className={`${BTN} py-2.5`} onClick={() => { game.showSettings("pause"); publish(); }}>
                    Settings
                  </button>
                  <button type="button" className={`${BTN} py-2.5`} onClick={() => { game.gotoMainMenuFromGame(); publish(); }}>
                    Main Menu
                  </button>
                  <Link href="/games" className={`${BTN} mt-3 block py-2.5`}>
                    Quit
                  </Link>
                </div>
              </div>
            </div>
          ) : null}

          {view.shopOpen ? (
            <div
              role="dialog"
              aria-label="Shop"
              className="absolute inset-0 z-20 flex flex-col bg-[#0f172a]"
            >
              <div className="flex items-center justify-between px-[18px] pt-3.5">
                <p className="text-lg font-bold text-white">SHOP</p>
                <p className="text-xs font-bold text-[#e5e7eb]">{view.shopMoneyLine}</p>
              </div>
              <div className="flex items-center gap-2.5 px-[18px] py-2.5">
                <button type="button" className={BTN} onClick={() => { game.setShopTab("shop"); publish(); }}>
                  Shop
                </button>
                <button type="button" className={BTN} onClick={() => { game.setShopTab("boss"); publish(); }}>
                  Boss Weapons
                </button>
                <button type="button" className={`${BTN} ml-auto`} onClick={() => { game.toggleShop(); publish(); }}>
                  Close
                </button>
              </div>
              <p className="px-[18px] pb-2.5 text-[11px] text-[#94a3b8]">{view.shopSubtitle}</p>
              <div className="min-h-0 flex-1 overflow-y-auto px-[18px] pb-3.5" style={{ touchAction: "auto" }}>
                {view.shopTab === "shop" ? (
                  <div className="grid grid-cols-2 gap-5">
                    {view.shopItems.map((item) => (
                      <ShopCard
                        key={item.key}
                        item={item}
                        onBuy={(key) => {
                          game.buyShopItem(key);
                          publish();
                        }}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="relative">
                    <div className="grid grid-cols-2 gap-5">
                      {view.bossItems.map((item) => (
                        <ShopCard
                          key={item.key}
                          item={item}
                          onBuy={(key) => {
                            game.buyBossItem(key);
                            publish();
                          }}
                        />
                      ))}
                    </div>
                    {view.bossLocked ? (
                      <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-center text-sm font-bold whitespace-pre-line text-[#94a3b8]">
                        {view.bossLocked}
                      </p>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function valueFrom(event: { target: EventTarget }) {
  return event.target instanceof HTMLInputElement ? event.target.value : "";
}
