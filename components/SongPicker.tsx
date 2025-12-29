import { useRef, useState } from "react";
import { useIsMobile } from "./useIsMobile";
import { Combobox } from "@headlessui/react";
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

  const guessSongRef = useRef<HTMLButtonElement>(null);
  const guessSongPress = usePressAnimation(guessSongRef);

  return (
    <>
      {/* Main collapsed state */}
      {!open && (
        <div className="w-full flex flex-col space-y-3">
          <button
            onClick={() => setOpen(true)}
            className="w-full bg-neutral-800 py-3 rounded-xl text-center text-gray-300"
          >
            {guess || "Tap to guess..."}
          </button>

          {/* Controls same as Desktop */}
          <div className="flex items-center justify-between mt-4 w-full gap-4">
            <button
              ref={skipSongRef}
              {...skipSongPress}
              onClick={skipSeconds}
              className="text-[#1DB954] font-semibold text-lg px-4 py-2 border-2 border-[#1DB954] rounded-xl active:bg-[#1DB954] active:text-neutral-900 transition-colors select-none"
            >
              {seconds >= 30 ? "Give Up" : `Skip +${skipStep}s`}
            </button>

            <button
              ref={guessSongRef}
              {...guessSongPress}
              onClick={() => checkGuess()}
              className="px-4 py-3 bg-[#1DB954] text-neutral-900 font-semibold rounded-xl hover:bg-[#1ed760] active:bg-[#17c54d] transition-colors"
            >
              Guess
            </button>
          </div>
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

  return (
    <Combobox value={guess} onChange={(val: string) => setGuess(val ?? "")}>
      <div className="relative">
        <div className="flex-col space-y-2">
          <Combobox.Input
            className="flex-1 px-4 py-3 rounded-xl border border-neutral-700 bg-neutral-800 text-white text-lg font-medium outline-none focus:ring-2 focus:ring-[#1DB954]"
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
              ref={skipSongRef}
              {...skipSongPress}
              onClick={skipSeconds}
              className="text-[#1DB954] font-semibold text-lg px-4 py-2 border-2 border-[#1DB954] rounded-xl hover:bg-[#1DB954] hover:text-neutral-900 transition-colors select-none"
            >
              {seconds >= 30 ? "Give Up" : `Skip +${skipStep}s`}
            </button>

            <button
              onClick={() => checkGuess()}
              className="px-4 py-3 bg-[#1DB954] text-neutral-900 font-semibold rounded-xl hover:bg-[#1ed760] active:bg-[#17c54d] transition-colors"
            >
              Guess
            </button>
          </div>
        </div>

        <Combobox.Options className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-xl border border-neutral-700 bg-neutral-800 shadow-lg text-white">
          {filteredTracks.length === 0 && query !== "" ? (
            <div className="p-4 text-neutral-500">No songs found.</div>
          ) : (
            filteredTracks.map(({ name, artist }, index) => (
              <Combobox.Option
                key={`${name}-${index}`}
                value={name}
                className={({ active }) =>
                  `cursor-pointer select-none px-4 py-2 ${
                    active ? "bg-[#1DB954] text-neutral-900" : "text-white"
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
  );
}
