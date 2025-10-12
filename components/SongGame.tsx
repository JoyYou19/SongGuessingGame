"use client";

import { useEffect, useRef, useState } from "react";
import { FaPlay, FaRedo } from "react-icons/fa";
import { MdCheckCircle, MdError } from "react-icons/md";
import { FaEdit } from "react-icons/fa";
import { SongPicker } from "./SongPicker";

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
  const [didFail, setDidFail] = useState(false);

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
    if (seconds >= 30) {
      setMessage("You failed! ❌");
      setShowEmbed(true);
      setDidFail(true);
      return;
    }

    setSeconds((prev) => {
      const nextSeconds = Math.min(prev + skipStep, 30);
      return nextSeconds;
    });

    setSkipStep((prevStep) => {
      if (seconds < 0.5) return 1.5;
      if (seconds < 2) return 2;
      if (seconds < 4) return 4;
      if (seconds >= 8) return 16;
      return prevStep * 2;
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

  const [clientId, setClientId] = useState<string | null>(null);

  useEffect(() => {
    let existingId = localStorage.getItem("spotify-client-id");
    if (!existingId) {
      existingId = crypto.randomUUID();
      localStorage.setItem("spotify-client-id", existingId);
    }
    setClientId(existingId);
  }, []);

  const fetchTrack = async () => {
    if (!clientId) return;
    setLoading(true);
    setErrorMessage("");
    try {
      const res = await fetch(
        `/api/track?clientId=${clientId}&playlistId=${playlistId}`,
      );
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to load track");
      }
      const data = await res.json();
      setTrack(data);
      setSeconds(0.1);
      setGuess("");
      setMessage("");
      setDidFail(false);
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

  const checkGuess = (selected?: string) => {
    if (!track) return;

    // prefer passed-in selection, fall back to state 'guess'
    const guessToCheck = selected ?? guess;

    if (guessToCheck.trim().toLowerCase() === track.name.toLowerCase()) {
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
    if (clientId) {
      fetchTrack();
    }
  }, [clientId]);

  useEffect(() => {
    secondsRef.current = seconds;
  }, [seconds]);

  return (
    <div className="sm:w-1/2 w-full mx-auto p-6 bg-neutral-900 rounded-2xl shadow-lg text-gray-100 font-sans min-h-[600px]">
      {/* Floating Playlist Button */}
      <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50">
        {showPlaylistInput ? (
          <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50">
            <div className="bg-neutral-800 rounded-xl p-6 w-full max-w-md mx-auto shadow-2xl">
              <h3 className="text-xl font-bold text-white mb-4 text-center">
                Set Playlist
              </h3>
              <input
                value={rawPlaylistInput}
                onChange={(e) => setRawPlaylistInput(e.target.value)}
                placeholder="Paste Spotify playlist link or ID"
                className="w-full px-4 py-3 rounded-lg bg-neutral-700 text-white  focus:ring-2 focus:ring-[#1DB954] focus:border-transparent outline-none text-base mb-4"
                autoFocus
              />
              <div className="flex gap-3">
                <button
                  onClick={() => setShowPlaylistInput(false)}
                  className="flex-1 px-4 py-3 rounded-lg bg-neutral-600 text-white font-semibold hover:bg-neutral-500 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowPlaylistInput(false);
                    fetchTrack(); // Refresh with new playlist
                  }}
                  className="flex-1 px-4 py-3 bg-[#1DB954] text-neutral-900 font-semibold rounded-lg hover:bg-[#1ed760] transition"
                >
                  Save
                </button>
              </div>
              <p className="text-xs text-neutral-400 mt-3 text-center">
                Paste a Spotify playlist URL or ID
              </p>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowPlaylistInput(true)}
            className="w-14 h-14 rounded-full bg-[#1DB954] text-neutral-900 flex items-center justify-center shadow-lg hover:bg-[#1ed760] transition active:scale-95"
            title="Set Playlist ID"
          >
            <FaEdit size={24} className="sm:w-5 sm:h-5" />
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
            className="bg-[#1DB954] text-neutral-900 font-semibold px-6 py-3 rounded-lg hover:bg-[#1ed760] transition"
          >
            Try Again
          </button>
        </div>
      ) : showEmbed && track ? (
        // New embed display section
        <div className="flex flex-col items-center gap-6">
          {/* Responsive embed container */}
          <div className="w-full mx-auto">
            <div
              className="spotify-embed-mobile"
              dangerouslySetInnerHTML={{ __html: track.embedHtml }}
            />
          </div>
          <div className="text-center w-full space-y-4">
            {didFail ? (
              <>
                <p className="text-2xl font-bold text-red-400">
                  You failed! ❌
                </p>
                <p className="text-xl text-gray-300">No points this round.</p>
              </>
            ) : (
              <>
                <p className="text-2xl font-bold text-[#1DB954]">
                  Correct! +{10 - seconds} points
                </p>
                <p className="text-xl">Total Score: {score}</p>
              </>
            )}
            <button
              onClick={() => {
                setShowEmbed(false);
                fetchTrack();
              }}
              className="bg-[#1DB954] text-neutral-900 font-semibold px-6 py-3 rounded-lg hover:bg-[#1ed760] transition flex items-center gap-2 mx-auto"
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
              {([0.1, 0.5, 2, 4, 8, 16] as const).map((time, index) => (
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

            <SongPicker
              guess={guess}
              setGuess={setGuess}
              filteredTracks={filteredTracks}
              query={query}
              setQuery={setQuery}
              checkGuess={checkGuess}
              skipSeconds={skipSeconds}
              seconds={seconds}
              skipStep={skipStep}
            />

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
              className="flex items-center justify-center gap-2 bg-neutral-700 hover:bg-neutral-800 transition-colors text-white text-lg font-semibold px-6 py-3 rounded-lg shadow-md mb-6 "
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
