export default function WalletLoading() {
  return (
    <div className="min-h-[50vh] flex items-center justify-center bg-[#05122a]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-2 border-[#3347ff]/30 border-t-[#3347ff] rounded-full animate-spin" />
        <span className="text-white/70 text-sm">Загрузка кошелька...</span>
      </div>
    </div>
  );
}
