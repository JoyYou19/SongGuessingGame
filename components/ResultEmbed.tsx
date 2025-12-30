"use client";

import { FaPlay, FaFire } from "react-icons/fa";
import { useEffect } from "react";
import gsap from "gsap";

type StreakEntry = {
  tier: string;
  points: number;
  dots: number;
};

type Props = {
  track: { embedHtml: string };
  didFail: boolean;
  streakHistory: StreakEntry[];
  score: number;
  fireColorByTier: Record<string, string>;
  onNext: () => void;
  AttemptDots: ({ filled }: { filled: number }) => JSX.Element;
  nextSongRef: React.RefObject<HTMLButtonElement>;
  nextSongPress: any;
};

export default function ResultEmbed({
  track,
  didFail,
  streakHistory,
  score,
  fireColorByTier,
  onNext,
  AttemptDots,
  nextSongRef,
  nextSongPress,
}: Props) {
  useEffect(() => {
    if (!didFail && streakHistory.length > 0) {
      gsap.fromTo(
        ".streak-fire",
        { scale: 0, opacity: 0 },
        {
          scale: 1,
          opacity: 1,
          stagger: 0.06,
          ease: "back.out(1.8)",
        },
      );
    }
  }, [streakHistory, didFail]);

  const last = streakHistory[streakHistory.length - 1];

  return (
    <div className="flex flex-col items-center gap-6 w-full">
      {/* Spotify Embed */}
      <div className="w-full max-w-md mx-auto">
        <div
          className="spotify-embed-mobile rounded-xl overflow-hidden"
          dangerouslySetInnerHTML={{ __html: track.embedHtml }}
        />
      </div>

      {/* Score + Feedback */}
      <div className="flex flex-col items-center w-full text-center gap-5">
        {!didFail && last && (
          <div className="flex flex-col items-center gap-3">
            {/* 🔥 Streak */}
            <div className="flex items-center justify-center gap-1.5">
              {streakHistory.map((entry, i) => (
                <FaFire
                  key={i}
                  className={`streak-fire text-xl ${fireColorByTier[entry.tier]}`}
                />
              ))}
            </div>

            {/* + Points */}
            <p className="text-5xl font-bold tracking-tight text-white">
              +{last.points}
              <span className="ml-1 text-lg font-medium text-neutral-400">
                pts
              </span>
            </p>

            {/* Attempts */}
            <AttemptDots filled={last.dots} />

            {/* Tier */}
            <span className="text-sm font-medium capitalize text-neutral-300">
              {last.tier}
            </span>
          </div>
        )}

        {/* Global Score */}
        <div className="flex items-center gap-2 mt-2">
          <p className="text-2xl font-semibold text-neutral-100">{score}</p>
          <span className="text-sm font-medium text-neutral-400">pts</span>
        </div>

        {/* Next Button */}
        <button
          ref={nextSongRef}
          {...nextSongPress}
          onClick={onNext}
          className="mt-2 bg-[#1DB954] text-neutral-900 font-semibold px-6 py-3 rounded-xl hover:bg-[#1ed760] transition flex items-center gap-2"
        >
          <FaPlay /> Next Song
        </button>
      </div>
    </div>
  );
}
