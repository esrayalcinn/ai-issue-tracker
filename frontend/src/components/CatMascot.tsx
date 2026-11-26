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
  idle: "/mascot/cat-idle.jpg",
  urgent: "/mascot/cat-idle.jpg",
  happy: "/mascot/cat-happy.jpg",
  sleeping: "/mascot/cat-sleep.jpg",
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
  title = "Click to talk or pet",
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
        alt="Fluffy blue-point cat mascot"
        draggable={false}
        className={`${SIZE_CLASSES[size]} select-none object-contain mix-blend-multiply transition-transform duration-200 group-hover:scale-[1.04] ${
          activeMood === "happy" ? "animate-cat-purr" : ""
        }`}
      />
    </button>
  );
}
