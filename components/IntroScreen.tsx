"use client";

import { useEffect, useRef, useState } from "react";
import { FaSpotify } from "react-icons/fa";
import { usePressAnimation } from "./usePressAnimation";
import Image from "next/image";

import gsap from "gsap";

type PlaylistInfo = {
  id: string;
  name: string;
  image: string | null;
  owner: string;
  totalTracks: number;
  spotifyUrl: string;
};

export default function IntroScreen({
  onStart,
}: {
  onStart: (playlist?: string) => void;
}) {
  const [playlist, setPlaylist] = useState("");

  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent));
  }, []);

  const playRef = useRef<HTMLDivElement>(null);
  const press = usePressAnimation(playRef);

  const [playlistInfo, setPlaylistInfo] = useState<PlaylistInfo | null>(null);
  const [playlistError, setPlaylistError] = useState<string | null>(null);

  function extractPlaylistId(input: string): string | null {
    const match = input.match(
      /(?:playlist\/|spotify:playlist:)([a-zA-Z0-9]+)(?:\?|$)/,
    );
    return match ? match[1] : null;
  }

  type InputMode = "idle" | "loading" | "locked";

  const [inputMode, setInputMode] = useState<InputMode>("idle");

  const iconGlowRef = useRef<HTMLDivElement>(null);
  const inputElRef = useRef<HTMLInputElement>(null);
  const iconRef = useRef<HTMLDivElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);

  const changeLabelRef = useRef<HTMLDivElement>(null);

  const pulseTweenRef = useRef<gsap.core.Tween | null>(null);
  const iconScaleTweenRef = useRef<gsap.core.Tween | null>(null);

  const playlistPreviewRef = useRef<HTMLDivElement>(null);

  function startIconPulse(glowEl: HTMLDivElement) {
    return gsap.to(glowEl, {
      opacity: 0.6,
      scale: 1.6,
      duration: 0.8,
      ease: "sine.inOut",
      repeat: -1,
      yoyo: true,
    });
  }

  useEffect(() => {
    const id = extractPlaylistId(playlist);

    // Reset state if input is empty or invalid
    if (!id) {
      setPlaylistInfo(null);
      setPlaylistError(null);
      return;
    }

    if (id && inputMode === "idle") {
      setInputMode("loading");

      const shell = shellRef.current;
      const icon = iconRef.current;
      const input = inputElRef.current;
      const glow = glowRef.current;
      const iconGlow = iconGlowRef.current;

      if (!shell || !icon || !input || !iconGlow) return;

      gsap
        .timeline()
        .to(glow, { opacity: 0, duration: 0.12, ease: "power1.out" })
        .to(input, {
          color: "transparent",
          caretColor: "transparent",
          duration: 0,
        })
        .to(
          input,
          {
            paddingLeft: 0,
            paddingRight: 0,
            paddingTop: 0,
            paddingBottom: 0,
            width: 56,
            height: 56,
            duration: 0.25,
            ease: "power3.inOut",
          },
          0,
        )
        .to(
          shell,
          {
            width: 56,
            height: 56,
            duration: 0.3,
            ease: "power3.inOut",
          },
          0,
        )

        .to(
          icon,
          {
            left: "50%",
            xPercent: -50,
            duration: 0.3,
            ease: "power3.inOut",
          },
          0,
        );

      iconScaleTweenRef.current = gsap.to(iconRef.current, {
        scale: 1.04,
        duration: 0.8,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });

      // 🔥 START PULSE (after collapse begins)
      pulseTweenRef.current = startIconPulse(iconGlow);
    }

    const timeout = setTimeout(async () => {
      try {
        setPlaylistError(null);

        const res = await fetch(`/api/playlist?playlistId=${id}`);
        if (!res.ok) {
          throw new Error("Playlist not found");
        }

        const data: PlaylistInfo = await res.json();
        setPlaylistInfo(data);
      } catch (err) {
        setPlaylistInfo(null);
        setPlaylistError("Invalid or private playlist");
        console.log("err: ", err);
      }
    }, 400); // debounce

    return () => clearTimeout(timeout);
  }, [playlist]);

  useEffect(() => {
    if (!playlistInfo || inputMode !== "loading") return;

    setInputMode("locked");

    const shell = shellRef.current;
    const icon = iconRef.current;
    const input = inputElRef.current;
    const label = changeLabelRef.current;

    if (!shell || !icon || !input || !label) return;

    // stop pulse cleanly
    if (pulseTweenRef.current) {
      pulseTweenRef.current.kill();
      pulseTweenRef.current = null;
    }

    if (iconScaleTweenRef.current) {
      iconScaleTweenRef.current.kill();
      iconScaleTweenRef.current = null;
    }

    gsap.set(iconRef.current, { scale: 1 });
    gsap.set(iconGlowRef.current, {
      opacity: 0,
      scale: 1,
    });

    const tl = gsap.timeline();

    tl
      // hide input text permanently (for locked state)
      .to(
        input,
        {
          color: "transparent",
          caretColor: "transparent",
          opacity: 0,
          pointerEvents: "none",
          duration: 0.2,
        },
        0,
      )
      // expand shell back to full width
      .to(shell, {
        width: "100%",
        height: "auto",
        borderRadius: 18,
        duration: 0.35,
        ease: "power3.out",
        clearProps: "width,height",
      })

      // move icon back to the left
      .to(
        icon,
        {
          left: "1rem",
          xPercent: 0,
          scale: 1,
          duration: 0.35,
          ease: "power3.out",
          clearProps: "left",
        },
        0,
      )

      // show "Change playlist"
      .to(
        label,
        {
          opacity: 1,
          duration: 0.25,
          ease: "power2.out",
        },
        0,
      );
  }, [playlistInfo]);

  useEffect(() => {
    if (inputMode !== "idle") return;

    const input = inputElRef.current;
    const label = changeLabelRef.current;
    const shell = shellRef.current;
    const icon = iconRef.current;

    const glow = glowRef.current;

    if (!input || !label || !shell || !icon) return;

    // Kill any leftover tweens (safety)
    pulseTweenRef.current?.kill();
    iconScaleTweenRef.current?.kill();
    pulseTweenRef.current = null;
    iconScaleTweenRef.current = null;

    const tl = gsap.timeline();

    tl
      // hide change label
      .set(label, {
        opacity: 0,
        pointerEvents: "none",
      })

      .to(glow, { opacity: 1, duration: 0.12, ease: "power1.out" })

      // restore shell
      .to(
        shell,
        {
          width: "100%",
          height: "auto",
          borderRadius: 18,
          duration: 0,
          ease: "power3.out",
          clearProps: "width,height",
        },
        0,
      )

      // restore icon position
      .to(
        icon,
        {
          left: "1rem",
          xPercent: 0,
          scale: 1,
          duration: 0.3,
          ease: "power3.out",
          clearProps: "left",
        },
        0,
      )

      // restore input visuals (THIS WAS MISSING)
      .to(
        input,
        {
          opacity: 1,
          color: "#ffffff",
          caretColor: "#ffffff",
          pointerEvents: "auto",
          paddingLeft: "3.5rem",
          paddingRight: "1rem",
          paddingTop: "1rem",
          paddingBottom: "1rem",
          width: "100%",
          height: "auto",
          duration: 0,
          ease: "power2.out",
          clearProps: "width,height",
        },
        0,
      );
  }, [inputMode]);

  useEffect(() => {
    return () => {
      pulseTweenRef.current?.kill();
      iconScaleTweenRef.current?.kill();
    };
  }, []);

  return (
    <div className="w-full max-w-md mx-auto rounded-3xl p-8">
      <div className="text-center space-y-3 mb-6">
        <h1 className="text-4xl font-bold tracking-tight text-white">
          Spotabl
        </h1>
        <p className="text-neutral-400">Spot the song in seconds.</p>
      </div>

      <div className="flex justify-center mb-4">
        <div
          ref={shellRef}
          onClick={() => {
            if (inputMode !== "locked") return;

            const preview = playlistPreviewRef.current;

            const tl = gsap.timeline({
              onComplete: () => {
                // NOW reset React state
                setPlaylist("");
                setPlaylistInfo(null);
                setInputMode("idle");
              },
            });

            if (preview) {
              tl.to(preview, {
                y: -12,
                opacity: 0,
                scale: 0.98,
                duration: 0.25,
                ease: "power2.inOut",
              });
            }
          }}
          className={`relative group w-full max-w-md cursor-pointer ${
            inputMode === "locked" ? "hover:bg-neutral-800" : ""
          }`}
        >
          <div ref={glowRef}>
            {/* Glow Outline */}
            <div
              className="
        pointer-events-none
        absolute -inset-[4px] rounded-3xl
        border-[3px] border-green-200
        opacity-0 transition-opacity duration-300
        group-focus-within:opacity-100
      "
            />

            {/* Glow Fill */}
            {isIOS ? (
              // ✅ iOS SAFE glow
              <div
                className="
      pointer-events-none
      absolute -inset-[8px] rounded-3xl
      ios-glow opacity-0
      transition-opacity duration-300
      group-focus-within:opacity-30
    "
              />
            ) : (
              // ✅ Desktop glow
              <div
                className="
      pointer-events-none
      absolute -inset-[8px] rounded-2xl
      bg-[#1DB954]
      opacity-0 blur-lg
      transition-opacity duration-300
      group-focus-within:opacity-20
    "
              />
            )}
          </div>

          {/* Icon (left by default) */}
          <div
            ref={iconRef}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20"
            style={{ willChange: "left, transform" }}
          >
            {/* Glow pulse layer */}
            <div
              ref={iconGlowRef}
              className="absolute inset-0 rounded-full bg-[#1DB954] blur-xl opacity-0"
            />

            <FaSpotify className="relative w-7 h-7 text-gray-200" />
          </div>

          <div
            ref={changeLabelRef}
            className="absolute inset-0 flex items-center bg-neutral-900 rounded-[18px] justify-center text-sm font-semibold text-white opacity-0 pointer-events-none"
          >
            Change playlist
          </div>

          {/* Input */}
          <input
            ref={inputElRef}
            value={playlist}
            onChange={(e) => setPlaylist(e.target.value)}
            placeholder="Paste Spotify playlist link"
            className="
        relative z-10 w-full
        pl-14  rounded-[18px]
        bg-neutral-900 text-white placeholder-neutral-400
        outline-none
      "
            style={{
              paddingLeft: "3.5rem", // space for icon
              paddingRight: "1rem",
              paddingTop: "1rem",
              paddingBottom: "1rem",
            }}
          />
        </div>
      </div>

      {playlistInfo && (
        <div
          ref={playlistPreviewRef}
          className="playlist-preview mt-4 flex items-center gap-4
               bg-neutral-900 rounded-3xl p-4 mb-4"
        >
          {playlistInfo.image && (
            <Image
              src={playlistInfo.image}
              alt={playlistInfo.name}
              width={56}
              height={56}
              className="w-14 h-14 rounded-lg object-cover"
            />
          )}

          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold truncate">
              {playlistInfo.name}
            </p>
            <p className="text-neutral-400 text-sm truncate">
              {playlistInfo.owner} · {playlistInfo.totalTracks} tracks
            </p>
          </div>
        </div>
      )}

      {playlistError && (
        <div className="mt-3 text-sm text-red-400">{playlistError}</div>
      )}

      <div ref={playRef} {...press} className="relative group">
        {/* Glow Outline */}
        <div
          className="
      absolute -inset-[6px] rounded-3xl border-[3px] border-green-200
      opacity-0 scale-100
      transition-all duration-300
      group-hover:opacity-100
      group-active:opacity-100
      group-focus-within:opacity-100
    "
        />

        {/* Blur Glow */}
        <div
          className="
      absolute -inset-[10px] rounded-2xl bg-[#1DB954]
      opacity-0 blur-xl
      transition-opacity duration-300
      group-hover:opacity-20
      group-active:opacity-25
      group-focus-within:opacity-25
    "
        />

        <button
          onClick={() => onStart(playlist)}
          className="
      relative z-10 w-full
      bg-[#1DB954] text-neutral-900
      font-semibold py-4 rounded-[18px]
      focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1DB954]
    "
        >
          ▶ Start Playing
        </button>
      </div>

      <div className="flex justify-center gap-6 mt-6 text-sm text-neutral-400">
        <button className="hover:text-white transition">How to Play</button>
        <button className="hover:text-white transition">Settings</button>
      </div>
    </div>
  );
}
