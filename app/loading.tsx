export default function Loading() {
  return (
    <div className="grid min-h-dvh place-items-center bg-void">
      <div className="flex flex-col items-center gap-3">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-line border-t-blurple" />
        <p className="text-xs tracking-widest text-dim uppercase">Loading BT Comms</p>
      </div>
    </div>
  );
}
