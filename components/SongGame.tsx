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
    allTracks: { name: string; artist: string }[];
  } | null>(null);
  const [seconds, setSeconds] = useState(1);
  const [score, setScore] = useState(0);
  const [guess, setGuess] = useState("");
  const [message, setMessage] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);

  const [playlistId, setPlaylistId] = useState("0XlOyEhV3svED5bXnbimkh");
  const [showPlaylistInput, setShowPlaylistInput] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [query, setQuery] = useState("");

  const skipSeconds = () => {
    setSeconds((s) => Math.min(s + 1, 10));
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
    if (!audioRef.current) return;
    if (isPlaying) return; // Prevent multiple clicks

    audioRef.current.currentTime = 0; // Reset to start
    audioRef.current.play();
    setIsPlaying(true);

    clearTimeoutIfAny();
    timeoutRef.current = setTimeout(() => {
      audioRef.current?.pause();
      audioRef.current!.currentTime = 0; // Reset to start after pause
      setIsPlaying(false);
    }, seconds * 1000);
  };

  const clearTimeoutIfAny = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const onAudioPlay = () => {
    clearTimeoutIfAny();
    timeoutRef.current = setTimeout(() => {
      audioRef.current?.pause();
    }, seconds * 1000);
  };

  // Clean up on unmount or when seconds change
  useEffect(() => {
    return () => clearTimeoutIfAny();
  }, [seconds]);

  const fetchTrack = async () => {
    const res = await fetch(`/api/track?playlistId=${playlistId}`);
    const data = await res.json();
    setTrack(data);
    setSeconds(0.3);
    setGuess("");
    setMessage("");
    setIsPlaying(false);
  };

  const checkGuess = () => {
    if (!track) return;

    if (guess.toLowerCase() === track.name.toLowerCase()) {
      setScore((s) => s + (10 - seconds));
      setMessage("Correct! 🎉");
      setTimeout(fetchTrack, 1500);
    } else {
      setSeconds((s) => Math.min(s + 1, 10));
      setMessage("Try again!");
    }
  };

  useEffect(() => {
    fetchTrack();
  }, []);

  return (
    <div className="max-w-md mx-auto p-6 bg-neutral-900 rounded-lg shadow-lg text-gray-100 font-sans min-h-[600px]">
      {/* Floating Playlist Button */}
      <div className="fixed bottom-6 right-6 z-50">
        {showPlaylistInput ? (
          <div className="flex flex-col items-end gap-2">
            <input
              value={playlistId}
              onChange={(e) => setPlaylistId(e.target.value)}
              placeholder="Playlist ID"
              className="px-4 py-2 rounded-md bg-neutral-800 text-white border border-neutral-700 focus:ring-2 focus:ring-[#1DB954] outline-none w-64"
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
      <button
        onClick={fetchTrack}
        className="flex items-center justify-center gap-2 bg-neutral-700 hover:bg-neutral-700 transition-colors text-white text-lg font-semibold px-6 py-3 rounded-md shadow-md mb-6 w-full"
      >
        <FaRedo size={18} />
        New Song
      </button>

      {track && (
        <div className="space-y-8 flex flex-col items-center">
          {/* Hidden audio element */}
          <audio ref={audioRef} src={track.previewUrl} preload="auto" />

          {/* Play and Skip buttons side by side */}
          <div className="flex items-center space-x-6">
            <button
              onClick={playSnippet}
              disabled={isPlaying}
              aria-label={`Play ${seconds} second${seconds > 1 ? "s" : ""}`}
              className={`flex items-center justify-center bg-[#1DB954] hover:bg-[#1ed760] active:bg-[#17c54d] transition-colors text-white w-20 h-20 rounded-full shadow-lg ${
                isPlaying ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
              }`}
            >
              <FaPlay size={28} />
            </button>

            <button
              onClick={skipSeconds}
              className="text-[#1DB954] font-semibold text-lg px-4 py-2 border border-[#1DB954] rounded-md hover:bg-[#1DB954] hover:text-neutral-900 transition-colors select-none"
            >
              Skip +1s
            </button>
          </div>

          <span className="mt-2 text-sm font-medium text-neutral-400">
            {seconds} second{seconds > 1 ? "s" : ""}
          </span>

          <p className="text-center text-neutral-400 text-lg font-medium">
            Heard: {seconds}s
          </p>

          <div className="w-full bg-neutral-800 rounded-full h-4 overflow-hidden shadow-inner">
            <div
              className="h-full bg-[#1DB954] transition-all duration-300"
              style={{ width: `${(seconds / 30) * 100}%` }}
            />
          </div>
          <p className="text-sm text-neutral-500 text-center w-full">
            {seconds} / 30 seconds
          </p>

          {/* Dark themed Combobox */}
          <Combobox value={guess} onChange={setGuess}>
            <div className="relative flex w-full gap-4">
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
              <button
                onClick={checkGuess}
                className="px-4 py-3 bg-[#1DB954] text-neutral-900 font-semibold rounded-md hover:bg-[#1ed760] active:bg-[#17c54d] transition-colors"
              >
                Guess
              </button>
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
        </div>
      )}
    </div>
  );
}
