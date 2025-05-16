"use client";

import { useEffect, useRef, useState } from "react";
import { Combobox } from "@headlessui/react";
import { FaPlay, FaRedo } from "react-icons/fa";
import { MdCheckCircle, MdError } from "react-icons/md";
import { FaEdit } from "react-icons/fa";

export default function SongGame() {
  const [track, setTrack] = useState<{
    previewUrl: string;
    name: string;
    artist: string;
    trackId: string;
    allTracks: { name: string; artist: string }[];
    embedHtml: string;
  } | null>(null);
  const [seconds, setSeconds] = useState(1);
  const secondsRef = useRef(seconds);
  const [score, setScore] = useState(0);
  const [guess, setGuess] = useState("");
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  const [loading, setLoading] = useState(false);

  const [playlistId, setPlaylistId] = useState("0XlOyEhV3svED5bXnbimkh");
  const [rawPlaylistInput, setRawPlaylistInput] = useState(
    "0XlOyEhV3svED5bXnbimkh",
  );

  useEffect(() => {
    const extractedId = extractPlaylistId(rawPlaylistInput);
    setPlaylistId(extractedId ?? rawPlaylistInput);
  }, [rawPlaylistInput]);

  const [showPlaylistInput, setShowPlaylistInput] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [showEmbed, setShowEmbed] = useState(false);

  const [query, setQuery] = useState("");
  const [skipStep, setSkipStep] = useState(0.4);

  const skipSeconds = () => {
    setSeconds((prev) => {
      const nextSeconds = Math.min(prev + skipStep, 30);
      return nextSeconds;
    });

    setSkipStep((prevStep) => {
      if (seconds < 0.5) return 0.5;
      if (seconds < 1) return 2; // After 0.3 + 0.7, set to +1
      if (seconds < 3) return 4;
      if (seconds >= 7) return 15;
      return prevStep * 2; // Double the step each time
    });
  };

  // Filter options based on query
  const filteredTracks =
    !track || !track.allTracks
      ? []
      : query === ""
        ? track.allTracks
        : track.allTracks.filter(({ name, artist }) =>
            `${name} ${artist}`.toLowerCase().includes(query.toLowerCase()),
          );

  const playSnippet = () => {
    if (!audioRef.current || isPlaying) return;

    audioRef.current.currentTime = 0;
    audioRef.current.play();
    setIsPlaying(true);
    setCurrentTime(0);
    updateCurrentTime(); // Starts live tracking
  };

  const animationFrameRef = useRef<number | null>(null);

  const updateCurrentTime = () => {
    if (!audioRef.current) return;

    const current = audioRef.current.currentTime;
    setCurrentTime(current);

    if (current >= secondsRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
      stopTrackingTime();
      return;
    }

    animationFrameRef.current = requestAnimationFrame(updateCurrentTime);
  };

  const stopTrackingTime = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  };

  const fetchTrack = async () => {
    setLoading(true);
    setErrorMessage("");
    try {
      const res = await fetch(`/api/track?playlistId=${playlistId}`);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to load track");
      }
      const data = await res.json();
      setTrack(data);
      setSeconds(0.1);
      setGuess("");
      setMessage("");
      setIsPlaying(false);
      setSkipStep(0.4); // reset for new track
      setCurrentTime(0);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to fetch track";
      console.log(error);
      setErrorMessage(errorMessage);
      // Optionally reset to default playlist if the current one fails
      if (errorMessage.includes("not found")) {
        setPlaylistId("37i9dQZF1DX4WYQ3aQLD4K"); // reset to default
      }
    } finally {
      setLoading(false);
    }
  };

  const checkGuess = () => {
    if (!track) return;

    if (guess.toLowerCase() === track.name.toLowerCase()) {
      setScore((s) => s + (10 - seconds));
      setMessage("Correct! 🎉");
      setShowEmbed(true);
    } else {
      skipSeconds();
      setMessage("Try again!");
    }
  };

  function extractPlaylistId(input: string): string | null {
    const match = input.match(
      /(?:playlist\/|spotify:playlist:)([a-zA-Z0-9]+)(?:\?|$)/,
    );
    return match ? match[1] : null;
  }

  useEffect(() => {
    fetchTrack();
  }, []);

  useEffect(() => {
    secondsRef.current = seconds;
  }, [seconds]);

  return (
    <div className="w-1/2 mx-auto p-6 bg-neutral-900 rounded-lg shadow-lg text-gray-100 font-sans min-h-[600px]">
      {/* Floating Playlist Button */}
      <div className="fixed bottom-6 right-6 z-50">
        {showPlaylistInput ? (
          <div className="flex flex-col items-end gap-2">
            <input
              value={rawPlaylistInput}
              onChange={(e) => setRawPlaylistInput(e.target.value)}
              placeholder="Paste Spotify link or ID"
              className="px-4 py-2 rounded-md bg-neutral-800 text-white border border-neutral-700 focus:ring-2 focus:ring-[#1DB954] outline-none w-96"
            />
            <button
              onClick={() => setShowPlaylistInput(false)}
              className="bg-[#1DB954] text-neutral-900 font-semibold px-4 py-2 rounded-md hover:bg-[#1ed760] transition"
            >
              Done
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowPlaylistInput(true)}
            className="w-12 h-12 rounded-full bg-[#1DB954] text-neutral-900 flex items-center justify-center shadow-lg hover:bg-[#1ed760] transition"
            title="Set Playlist ID"
          >
            <FaEdit size={20} />
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[300px]">
          {/* Minimalist loading animation with Spotify/Epic Games aesthetic */}
          <div className="flex space-x-2 mb-4">
            <div
              className="w-3 h-3 bg-[#1DB954] rounded-full animate-bounce"
              style={{ animationDelay: "0ms" }}
            />
            <div
              className="w-3 h-3 bg-[#1DB954] rounded-full animate-bounce"
              style={{ animationDelay: "150ms" }}
            />
            <div
              className="w-3 h-3 bg-[#1DB954] rounded-full animate-bounce"
              style={{ animationDelay: "300ms" }}
            />
          </div>
          <div className="text-sm font-medium text-gray-400 tracking-wider">
            LOADING
          </div>
        </div>
      ) : errorMessage ? (
        // Error view
        <div className="flex flex-col items-center justify-center min-h-[300px] text-center px-6">
          <MdError size={48} className="text-red-500 mb-4" />
          <h2 className="text-2xl font-bold text-red-400 mb-2">
            Something went wrong
          </h2>
          <p className="text-red-300 text-md mb-6">{errorMessage}</p>
          <button
            onClick={() => {
              setErrorMessage("");
              fetchTrack();
            }}
            className="bg-[#1DB954] text-neutral-900 font-semibold px-6 py-3 rounded-md hover:bg-[#1ed760] transition"
          >
            Try Again
          </button>
        </div>
      ) : showEmbed && track ? (
        // New embed display section
        <div className="flex flex-col items-center gap-6">
          <div dangerouslySetInnerHTML={{ __html: track.embedHtml }} />
          <div className="text-center w-full space-y-4">
            <p className="text-2xl font-bold text-[#1DB954]">
              Correct! +{10 - seconds} points
            </p>
            <p className="text-xl">Total Score: {score}</p>
            <button
              onClick={() => {
                setShowEmbed(false);
                fetchTrack();
              }}
              className="bg-[#1DB954] text-neutral-900 font-semibold px-6 py-3 rounded-md hover:bg-[#1ed760] transition flex items-center gap-2 mx-auto"
            >
              <FaPlay /> Next Song
            </button>
          </div>
        </div>
      ) : (
        track && (
          <div className="space-y-8 flex flex-col items-center">
            {/* Hidden audio element */}
            <audio ref={audioRef} src={track.previewUrl} preload="auto" />

            <div className="relative w-full bg-neutral-800 rounded-full h-4 overflow-hidden shadow-inner">
              {/* Green progress fill */}
              <div
                className="h-full bg-[#1DB954] transition-all duration-300"
                style={{
                  width: `${Math.min((seconds / 30) * 100, 100)}%`,
                }}
              />

              {/* Segment markers */}
              {([0.1, 0.5, 1, 3, 7, 15] as const).map((time, index) => (
                <div
                  key={index}
                  className="absolute top-0 bottom-0 w-px bg-neutral-600 opacity-60"
                  style={{ left: `${(time / 30) * 100}%` }}
                />
              ))}

              {/* White playback marker */}
              <div
                className="absolute top-0 bottom-0 w-[2px] bg-white"
                style={{ left: `${(currentTime / 30) * 100}%` }}
              />
            </div>
            <p className="text-sm text-neutral-500 text-center w-full">
              {seconds} / 30 seconds
            </p>

            {/* Play and Skip buttons side by side */}
            <div className="relative group w-20 h-20">
              {/* Hover Glow */}
              {!isPlaying && (
                <div className="absolute inset-0 rounded-full bg-[#1DB954] blur-lg opacity-0 group-hover:opacity-20 transition-opacity duration-300 pointer-events-none z-0 scale-[1.1]" />
              )}

              {/* Play Button */}
              <button
                onClick={playSnippet}
                disabled={isPlaying}
                aria-label={`Play ${seconds} second${seconds > 1 ? "s" : ""}`}
                className={`relative z-10 flex items-center justify-center bg-[#1DB954] hover:bg-[#1ed760] active:bg-[#17c54d] transition-colors text-white w-20 h-20 rounded-full shadow-lg ${
                  isPlaying ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                }`}
              >
                <FaPlay size={28} />
              </button>
            </div>

            {/* Dark themed Combobox */}
            <Combobox value={guess} onChange={(val) => setGuess(val ?? "")}>
              <div className="relative">
                <div className="flex-col space-y-2">
                  <Combobox.Input
                    className="flex-1 px-4 py-3 rounded-md border border-neutral-700 bg-neutral-800 text-white text-lg font-medium outline-none focus:ring-2 focus:ring-[#1DB954]"
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setGuess(e.target.value);
                    }}
                    placeholder="Guess the song..."
                    autoComplete="off"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        checkGuess();
                        e.preventDefault();
                      }
                    }}
                  />

                  <div className="flex items-center justify-between w-full gap-4">
                    <button
                      onClick={skipSeconds}
                      className="text-[#1DB954] font-semibold text-lg px-4 py-2 border border-[#1DB954] rounded-md hover:bg-[#1DB954] hover:text-neutral-900 transition-colors select-none"
                    >
                      Skip +{skipStep}s
                    </button>

                    <button
                      onClick={checkGuess}
                      className="px-4 py-3 bg-[#1DB954] text-neutral-900 font-semibold rounded-md hover:bg-[#1ed760] active:bg-[#17c54d] transition-colors"
                    >
                      Guess
                    </button>
                  </div>
                </div>
                <Combobox.Options className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-md border border-neutral-700 bg-neutral-800 shadow-lg text-white">
                  {filteredTracks.length === 0 && query !== "" ? (
                    <div className="p-4 text-neutral-500">No songs found.</div>
                  ) : (
                    filteredTracks.map(({ name, artist }, index) => (
                      <Combobox.Option
                        key={`${name}-${index}`}
                        value={name}
                        className={({ active }) =>
                          `cursor-pointer select-none px-4 py-2 ${
                            active
                              ? "bg-[#1DB954] text-neutral-900"
                              : "text-white"
                          }`
                        }
                      >
                        {name} — {artist}
                      </Combobox.Option>
                    ))
                  )}
                </Combobox.Options>
              </div>
            </Combobox>

            {/* Message */}
            <div
              className={`flex items-center gap-2 justify-center text-lg font-semibold ${
                message === "Correct! 🎉"
                  ? "text-green-500"
                  : message === "Try again!"
                    ? "text-red-500"
                    : "text-neutral-400"
              }`}
            >
              {message === "Correct! 🎉" && <MdCheckCircle size={24} />}
              {message === "Try again!" && <MdError size={24} />}
              <span>{message}</span>
            </div>

            {/* Score */}
            <p className="text-center text-neutral-400 text-lg font-semibold">
              Score: {score}
            </p>

            <button
              onClick={fetchTrack}
              className="flex items-center justify-center gap-2 bg-neutral-700 hover:bg-neutral-800 transition-colors text-white text-lg font-semibold px-6 py-3 rounded-md shadow-md mb-6 "
            >
              <FaRedo size={18} />
              New Song
            </button>
          </div>
        )
      )}
    </div>
  );
}
