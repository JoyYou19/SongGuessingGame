import SongGame from "@/components/SongGame";
import Image from "next/image";

export default function Home() {
  return (
    <main className="min-h-screen bg-neutral-900 p-4 flex items-center justify-center">
      <SongGame />
    </main>
  );
}
