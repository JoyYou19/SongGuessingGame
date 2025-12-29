"use client";

import { useEffect, useState } from "react";
import SongGame from "@/components/SongGame";
import IntroScreen from "@/components/IntroScreen";

export default function HomeClient() {
  const [started, setStarted] = useState(false);
  const [playlist, setPlaylist] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (localStorage.getItem("spotabl-has-played")) {
      setStarted(true);
    }
  }, []);

  const startGame = (playlistInput?: string) => {
    localStorage.setItem("spotabl-has-played", "true");
    setPlaylist(playlistInput);
    setStarted(true);
  };

  return started ? (
    <SongGame initialPlaylist={playlist} />
  ) : (
    <IntroScreen onStart={startGame} />
  );
}
