import SongGame from "@/components/SongGame";

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden p-4 flex items-center justify-center bg-neutral-900 bg-[radial-gradient(ellipse_at_50%_30%,_rgba(29,185,84,0.08)_0%,_transparent_70%)]">
      <SongGame />
    </main>
  );
}
