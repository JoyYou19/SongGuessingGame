import { useRef, useState } from "react";
import { useIsMobile } from "./useIsMobile";
import {
  Combobox,
  ComboboxInput,
  ComboboxOption,
  ComboboxOptions,
} from "@headlessui/react";
import { usePressAnimation } from "./usePressAnimation";

// Define the structure of a track
export interface Track {
  name: string;
  artist: string;
}

// Props shared across components
interface SongPickerProps {
  guess: string;
  setGuess: (value: string) => void;
  filteredTracks: Track[];
  query: string;
  setQuery: (value: string) => void;
  checkGuess: (selected?: string) => void;
  skipSeconds: () => void;
  seconds: number;
  skipStep: number;
}

type MobileSongPickerProps = Omit<
  SongPickerProps,
  "skipSeconds" | "seconds" | "skipStep"
>;

type DesktopSongPickerProps = SongPickerProps;

export const SongPicker = (props: SongPickerProps) => {
  const isMobile = useIsMobile();

  return isMobile ? (
    <MobileSongPicker {...props} />
  ) : (
    <DesktopSongPicker {...props} />
  );
};

function MobileSongPicker({
  guess,
  setGuess,
  filteredTracks,
  query,
  setQuery,
  checkGuess,
  skipSeconds,
  seconds,
  skipStep,
}: MobileSongPickerProps & {
  skipSeconds: () => void;
  seconds: number;
  skipStep: number;
}) {
  const [open, setOpen] = useState(false);

  const skipSongRef = useRef<HTMLButtonElement>(null);
  const skipSongPress = usePressAnimation(skipSongRef);

  return (
    <>
      {/* Main collapsed state */}
      {!open && (
        <div className="w-full flex flex-col space-y-3 items-center">
          <button
            onClick={() => setOpen(true)}
            className="w-full bg-neutral-800 py-3 rounded-xl text-center text-gray-300"
          >
            {guess || "Tap to guess..."}
          </button>

          {/* Controls same as Desktop */}
          <button
            ref={skipSongRef}
            {...skipSongPress}
            onClick={skipSeconds}
            className="text-[#1DB954] font-semibold w-1/2 text-lg px-4 py-2 border-2 border-[#1DB954] rounded-xl active:bg-[#1DB954] active:text-neutral-900 transition-colors select-none"
          >
            {seconds >= 30 ? "Give Up" : `Skip +${skipStep}s`}
          </button>
        </div>
      )}

      {/* Full-screen picker */}
      {open && (
        <div className="fixed inset-0 bg-neutral-900 h-full z-50 flex flex-col p-6">
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setGuess(e.target.value);
            }}
            className="px-4 py-3 rounded-xl border border-neutral-700 bg-neutral-800 text-white mb-4"
            placeholder="Search song..."
            autoFocus
          />

          <div className="flex-1 overflow-auto">
            {filteredTracks.map(({ name, artist }, index) => (
              <div
                key={`${name}-${index}`}
                className="py-3 px-2 border-b border-neutral-700 text-white"
                onClick={() => {
                  setGuess(name);
                  setQuery(name);
                  setOpen(false);
                  checkGuess(name);
                }}
              >
                {name} — {artist}
              </div>
            ))}
          </div>

          <button
            onClick={() => setOpen(false)}
            className="mt-4 py-3 text-center bg-neutral-700 rounded-xl"
          >
            Cancel
          </button>
        </div>
      )}
    </>
  );
}

function DesktopSongPicker({
  guess,
  setGuess,
  filteredTracks,
  query,
  setQuery,
  checkGuess,
  skipSeconds,
  seconds,
  skipStep,
}: DesktopSongPickerProps) {
  const skipSongRef = useRef<HTMLButtonElement>(null);
  const skipSongPress = usePressAnimation(skipSongRef);

  const hasText = guess.trim().length > 0;

  return (
    <Combobox value={guess} onChange={(val: string) => setGuess(val ?? "")}>
      <div className="relative flex flex-col gap-3 items-center">
        <div className="relative flex items-center">
          <ComboboxInput
            className={`
      flex-1 px-4 py-3 rounded-2xl bg-neutral-800 shadow-lg
      text-white text-lg font-medium outline-none
      focus:ring-2 focus:ring-[#1DB954]
      transition-all
      ${hasText ? "pr-24" : "pr-4"}
    `}
            onChange={(e) => {
              setQuery(e.target.value);
              setGuess(e.target.value);
            }}
            placeholder="Guess the song..."
            autoComplete="off"
            onKeyDown={(e) => {
              if (e.key === "Enter" && hasText) {
                checkGuess();
                e.preventDefault();
              }
            }}
          />

          <button
            onClick={() => checkGuess()}
            disabled={!hasText}
            className={`
      absolute right-2
      px-4 py-2 rounded-xl font-semibold
      bg-[#1DB954] text-neutral-900
      transition-all duration-200 ease-out
      ${
        hasText
          ? "opacity-100 translate-x-0 pointer-events-auto"
          : "opacity-0 translate-x-2 pointer-events-none"
      }
      hover:bg-[#1ed760]
      active:bg-[#17c54d]
    `}
          >
            Guess
          </button>
        </div>

        <button
          ref={skipSongRef}
          {...skipSongPress}
          onClick={skipSeconds}
          className="text-[#1DB954] font-semibold text-lg px-4 py-2 border-2 border-[#1DB954] rounded-xl hover:bg-[#1DB954] hover:text-neutral-900 transition-colors select-none"
        >
          {seconds >= 30 ? "Give Up" : `Skip +${skipStep}s`}
        </button>

        <ComboboxOptions className="absolute z-10 mt-16 max-h-48 w-full overflow-auto rounded-2xl border border-neutral-700 bg-neutral-800 shadow-lg text-white">
          {filteredTracks.length === 0 && query !== "" ? (
            <div className="p-4 text-neutral-500">No songs found.</div>
          ) : (
            filteredTracks.map(({ name, artist }, index) => (
              <ComboboxOption
                key={`${name}-${index}`}
                value={name}
                className={({ active }) =>
                  `cursor-pointer select-none px-4 py-2 ${
                    active ? "bg-[#1DB954] text-neutral-900" : "text-white"
                  }`
                }
              >
                {name} — {artist}
              </ComboboxOption>
            ))
          )}
        </ComboboxOptions>
      </div>
    </Combobox>
  );
}
