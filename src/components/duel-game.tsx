"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { WORLD_H, WORLD_W } from "@/games/duel/data";
import { DuelEngine, type ShopView } from "@/games/duel/engine";

type Frame = {
  hud: string;
  level: string;
  sig: string;
  shop: ShopView;
};

function snapshot(game: DuelEngine): Frame {
  return {
    hud: game.hudLine(),
    level: game.levelLine(),
    sig: game.shopSignature(),
    shop: game.shopView(),
  };
}

export function DuelGame() {
  const [game] = useState(() => new DuelEngine());
  const [frame, setFrame] = useState<Frame>(() => snapshot(game));
  const [scale, setScale] = useState(1);
  const [focused, setFocused] = useState(false);
  const outerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const shopScrollRef = useRef<HTMLDivElement>(null);

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

      const next = snapshot(game);
      setFrame((current) =>
        current.hud === next.hud &&
        current.level === next.level &&
        current.sig === next.sig
          ? current
          : next,
      );
    };

    raf = requestAnimationFrame(tick);
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [game]);

  useEffect(() => {
    if (frame.shop.open) {
      shopScrollRef.current?.scrollTo({ top: 0 });
    }
  }, [frame.shop.open]);

  const publish = () => {
    setFrame(snapshot(game));
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const scrolling =
      event.code === "ArrowLeft" ||
      event.code === "ArrowRight" ||
      event.code === "ArrowUp" ||
      event.code === "ArrowDown" ||
      event.code === "Space";
    if (
      scrolling &&
      !(
        (event.code === "Space" || event.code === "Enter") &&
        event.target instanceof HTMLButtonElement
      )
    ) {
      event.preventDefault();
    }

    switch (event.code) {
      case "ArrowLeft":
        game.setKey("left", true);
        break;
      case "ArrowRight":
        game.setKey("right", true);
        break;
      case "ArrowUp":
        game.setKey("up", true);
        break;
      case "ArrowDown":
        game.setKey("down", true);
        break;
      case "KeyF":
        game.setAttack(true);
        break;
      case "KeyS":
        if (!event.repeat) {
          game.toggleShop();
          publish();
        }
        break;
      case "KeyR":
        if (!event.repeat) {
          game.restart();
          publish();
        }
        break;
      case "KeyN":
        if (!event.repeat) {
          game.nextLevel();
          publish();
        }
        break;
      default:
        break;
    }
  };

  const onKeyUp = (event: React.KeyboardEvent<HTMLDivElement>) => {
    switch (event.code) {
      case "ArrowLeft":
        game.setKey("left", false);
        break;
      case "ArrowRight":
        game.setKey("right", false);
        break;
      case "ArrowUp":
        game.setKey("up", false);
        break;
      case "ArrowDown":
        game.setKey("down", false);
        break;
      case "KeyF":
        game.setAttack(false);
        break;
      default:
        break;
    }
  };

  const shop = frame.shop;

  return (
    <div ref={outerRef} className="w-full max-w-[980px]">
      <div style={{ width: WORLD_W * scale, height: WORLD_H * scale }}>
        <div
          ref={stageRef}
          role="application"
          tabIndex={0}
          aria-label="2D Duel. Arrow keys move, F attacks, S opens the shop, N goes to the next level after a win, R restarts."
          onKeyDown={onKeyDown}
          onKeyUp={onKeyUp}
          onFocus={() => setFocused(true)}
          onBlur={(event) => {
            const next = event.relatedTarget;
            if (next instanceof Node && event.currentTarget.contains(next)) {
              return;
            }
            game.clearKeys();
            setFocused(false);
          }}
          onPointerDown={(event) => {
            if (event.target instanceof HTMLButtonElement) {
              return;
            }
            event.currentTarget.focus({ preventScroll: true });
          }}
          className="relative origin-top-left touch-none select-none outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold"
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

          <div className="pointer-events-none absolute left-3 top-3 max-w-[600px]">
            <p className="text-sm font-bold text-white">{frame.hud}</p>
            <p className="mt-1 text-[11px] font-bold text-[#e5e7eb]">{frame.level}</p>
            <p className="mt-1 text-[10px] text-[#cbd5e1]">
              Move: Arrows | Attack: F | Shop: S | Next level: N | Restart: R
            </p>
          </div>

          {focused ? null : (
            <p className="pointer-events-none absolute bottom-6 left-0 right-0 text-center text-sm font-bold text-white">
              Click the game to use the keyboard
            </p>
          )}

          {shop.open ? (
            <div
              role="dialog"
              aria-label="Shop"
              className="absolute flex flex-col border-[3px] border-[#334155]"
              style={{
                left: 640,
                top: 60,
                width: 320,
                height: 520,
                background: "#0f172a",
              }}
            >
              <p className="px-3 pt-2.5 text-sm font-bold text-white">
                SHOP (S to close)
              </p>
              <p className="px-3 pb-2.5 text-[11px] font-bold text-[#e5e7eb]">
                {`Money: $${shop.money}   Weapon: ${shop.weaponName}`}
              </p>
              <div
                ref={shopScrollRef}
                className="min-h-0 flex-1 overflow-y-auto px-3"
                style={{ scrollbarColor: "#334155 #0f172a" }}
              >
                {shop.items.map((item) => (
                  <div key={item.key} className="mb-1.5 bg-[#111827] px-2.5 py-2">
                    <p className="text-[11px] font-bold text-white">{item.name}</p>
                    <p className="mt-0.5 text-[9px] leading-snug text-[#cbd5e1]">
                      {item.desc}
                    </p>
                    <div className="mt-1.5 flex justify-end">
                      <button
                        type="button"
                        disabled={!item.affordable}
                        onClick={() => {
                          game.buy(item.key);
                          publish();
                        }}
                        className="cursor-pointer bg-[#e5e7eb] px-2 py-1 text-[11px] font-bold text-[#0f172a] disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {item.button}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <p className="px-3 py-2.5 text-[9px] leading-snug whitespace-pre-line text-[#94a3b8]">
                {"Earn money by damaging enemies and clearing levels.\nBuy upgrades to survive tougher waves."}
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
