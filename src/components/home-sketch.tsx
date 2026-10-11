"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

const bubbles = [
  {
    href: "/music",
    label: "musics",
    name: "Music",
    area: "area-musics",
    path: "M100 10C146 6 186 30 188 64C190 100 152 116 100 114C46 116 12 98 14 62C16 26 54 8 100 10Z",
  },
  {
    href: "/about",
    label: "ME",
    name: "About",
    area: "area-me",
    path: "M102 12C150 8 184 34 186 66C188 102 148 118 98 116C50 118 14 96 16 60C18 28 56 10 102 12Z",
  },
  {
    href: "/animations",
    label: "animation",
    name: "Animations",
    area: "area-animation",
    path: "M100 14C152 8 190 36 188 68C186 104 146 118 100 116C48 120 8 98 12 60C16 24 52 12 100 14Z",
  },
  {
    href: "/drawings",
    label: "arts",
    name: "Drawings",
    area: "area-arts",
    path: "M98 8C144 4 184 28 186 62C188 98 150 114 100 112C48 114 10 94 14 58C18 22 54 6 98 8Z",
  },
  {
    href: "/games",
    label: "games",
    name: "Games",
    area: "area-games",
    path: "M104 12C148 6 188 32 186 66C184 102 146 118 98 116C52 118 12 96 16 62C20 28 58 10 104 12Z",
  },
] as const;

export function HomeSketch() {
  return (
    <div className="home-stage">
      {bubbles.map((bubble) => (
        <Link
          key={bubble.href}
          href={bubble.href}
          aria-label={bubble.name}
          className={`home-bubble ${bubble.area}`}
        >
          <span className="home-bubble-ink">
            <svg viewBox="0 0 200 124" aria-hidden="true" className="home-bubble-shape">
              <path
                d={bubble.path}
                fill="color-mix(in srgb, var(--paper) 72%, white)"
                stroke="currentColor"
                strokeWidth="2.6"
                strokeLinejoin="round"
              />
            </svg>
            <span className="font-display">{bubble.label}</span>
          </span>
        </Link>
      ))}
      <div className="area-face">
        <div className="face-lockup">
          <SmileyFace />
          <WavingHand />
        </div>
      </div>
      <StickDoodle />
    </div>
  );
}

function SmileyFace() {
  const svgRef = useRef<SVGSVGElement>(null);
  const faceRef = useRef<SVGGElement>(null);
  const leftRef = useRef<SVGGElement>(null);
  const rightRef = useRef<SVGGElement>(null);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) {
      return;
    }

    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reduced = motion.matches;
    const onMotion = () => {
      reduced = motion.matches;
    };
    motion.addEventListener("change", onMotion);

    const target = { x: 0, y: 0, tilt: 0, at: 0 };
    const current = { x: 0, y: 0, tilt: 0 };
    let frame = 0;

    const aim = (clientX: number, clientY: number) => {
      const rect = svg.getBoundingClientRect();
      const dx = clientX - (rect.left + rect.width / 2);
      const dy = clientY - (rect.top + rect.height * 0.46);
      const dist = Math.hypot(dx, dy) || 1;
      const strength = Math.min(1, dist / (rect.width * 0.42));
      target.x = (dx / dist) * strength;
      target.y = (dy / dist) * strength;
      target.tilt = Math.max(-1, Math.min(1, dx / (rect.width * 0.55)));
      target.at = performance.now();
    };

    const onPointer = (event: PointerEvent) => {
      if (event.pointerType === "touch" && event.type === "pointermove") {
        return;
      }
      aim(event.clientX, event.clientY);
    };

    window.addEventListener("pointermove", onPointer);
    window.addEventListener("pointerdown", onPointer);

    const tick = (now: number) => {
      let goalX = target.x;
      let goalY = target.y;
      let goalTilt = target.tilt;
      const idle = target.at === 0 || now - target.at > 2400;
      if (!reduced && idle) {
        const seconds = now / 1000;
        goalX = Math.sin(seconds * 0.55) * 0.62;
        goalY = Math.cos(seconds * 0.42) * 0.32;
        goalTilt = Math.sin(seconds * 0.33) * 0.22;
      } else if (reduced && idle) {
        goalX = 0;
        goalY = 0;
        goalTilt = 0;
      }

      current.x += (goalX - current.x) * 0.14;
      current.y += (goalY - current.y) * 0.14;
      current.tilt += (goalTilt - current.tilt) * 0.12;

      const maxX = 16;
      const maxY = 10;
      let px = current.x * maxX;
      let py = current.y * maxY;
      const mag = Math.hypot(px / maxX, py / maxY);
      if (mag > 1) {
        px /= mag;
        py /= mag;
      }

      leftRef.current?.setAttribute("transform", `translate(${px} ${py})`);
      rightRef.current?.setAttribute("transform", `translate(${px} ${py})`);
      faceRef.current?.setAttribute(
        "transform",
        `translate(${current.tilt * 5} ${current.y * 3}) rotate(${current.tilt * 6} 180 188)`,
      );
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      motion.removeEventListener("change", onMotion);
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("pointerdown", onPointer);
    };
  }, []);

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 360 400"
      aria-hidden="true"
      className="face-svg"
    >
        <g ref={faceRef} fill="none" stroke="currentColor" strokeLinecap="round">
          <path
            d="M180 36C246 28 308 72 326 138C346 210 328 292 268 338C214 380 118 372 68 312C16 250 24 142 78 84C114 46 132 40 180 36Z"
            fill="#f4efe2"
            strokeWidth="3"
          />
          <path
            d="M128 140C150 136 166 150 164 166C162 184 148 196 128 194C106 192 92 176 94 160C96 144 108 140 128 140Z"
            fill="#fffdf8"
            strokeWidth="2.5"
          />
          <path
            d="M234 138C256 136 272 150 270 168C268 186 252 198 232 194C210 190 198 174 200 158C202 142 214 136 234 138Z"
            fill="#fffdf8"
            strokeWidth="2.5"
          />
          <g ref={leftRef}>
            <circle cx="128" cy="166" r="10" fill="#161310" stroke="none" />
            <circle cx="124" cy="162" r="3" fill="#f4efe2" stroke="none" />
          </g>
          <g ref={rightRef}>
            <circle cx="232" cy="166" r="10" fill="#161310" stroke="none" />
            <circle cx="228" cy="162" r="3" fill="#f4efe2" stroke="none" />
          </g>
          <path d="M112 214C142 272 226 270 252 208" strokeWidth="3.2" />
      </g>
    </svg>
  );
}

function WavingHand() {
  const ink = {
    fill: "#f4efe2",
    stroke: "currentColor",
    strokeWidth: 2.7,
    strokeLinejoin: "round" as const,
    strokeLinecap: "round" as const,
  };

  return (
    <div className="area-hand" aria-hidden="true">
      <svg viewBox="0 0 240 310" className="home-hand">
        <path
          d="M72 188C56 206 50 242 68 268C88 296 156 302 184 274C206 250 208 210 192 186C174 164 98 162 72 188Z"
          {...ink}
        />
        <path
          d="M88 258C84 278 92 300 120 304C148 300 156 278 152 258"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.7"
          strokeLinecap="round"
        />
        <path
          d="M64 198C40 186 22 164 28 146C34 128 54 126 68 146C78 160 80 184 70 200Z"
          {...ink}
        />
        <path
          d="M58 176C50 148 46 108 56 86C64 68 82 70 86 90C90 114 84 152 78 176Z"
          {...ink}
        />
        <path
          d="M90 170C84 128 86 74 100 52C112 34 130 40 130 60C130 92 122 142 116 172Z"
          {...ink}
        />
        <path
          d="M124 168C120 112 126 52 142 30C156 12 174 20 172 44C170 80 160 136 154 170Z"
          {...ink}
        />
        <path
          d="M162 172C166 128 178 78 194 58C206 42 224 52 218 74C210 106 196 148 188 174Z"
          {...ink}
        />
      </svg>
    </div>
  );
}

function StickDoodle() {
  return (
    <svg viewBox="0 0 64 88" aria-hidden="true" className="home-doodle">
      <g
        className="home-doodle-sway"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.7"
      >
        <path d="M32 2v5M20 8l4 4M44 8l-4 4M16 16h5M43 16h5" stroke="var(--gold)" />
        <circle cx="32" cy="18" r="8" />
        <path d="M32 26v24M32 34L18 46M32 34l14 10M32 50L20 70M32 50l12 18" />
      </g>
    </svg>
  );
}
