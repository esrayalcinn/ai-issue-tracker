"use client";

export type CatMood = "idle" | "happy" | "urgent" | "sleeping";

interface CatMascotProps {
  mood?: CatMood;
  size?: "sm" | "md" | "lg" | "xl";
  celebrating?: boolean;
  onClick?: () => void;
  title?: string;
}

const SPRITE_BY_MOOD: Record<CatMood, string> = {
  idle: "/mascot/cat-idle.png",
  urgent: "/mascot/cat-idle.png",
  happy: "/mascot/cat-happy.png",
  sleeping: "/mascot/cat-sleep.png",
};

const SIZE_CLASSES = {
  sm: "h-16 w-16",
  md: "h-28 w-28",
  lg: "h-36 w-36",
  xl: "h-44 w-44",
};

export function CatMascot({
  mood = "idle",
  size = "lg",
  celebrating = false,
  onClick,
  title = "Click to wake Maviş",
}: CatMascotProps) {
  const activeMood: CatMood = celebrating ? "happy" : mood;
  const src = SPRITE_BY_MOOD[activeMood];

  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="group relative inline-flex cursor-pointer items-center justify-center focus:outline-none"
    >
      <img
        src={src}
        alt="Maviş the blue-point cat mascot"
        draggable={false}
        className={`${SIZE_CLASSES[size]} select-none object-contain drop-shadow-[0_6px_12px_rgba(43,38,35,0.18)] transition-transform duration-200 group-hover:scale-[1.04] ${
          activeMood === "happy" ? "animate-cat-purr" : ""
        }`}
      />
    </button>
  );
}
