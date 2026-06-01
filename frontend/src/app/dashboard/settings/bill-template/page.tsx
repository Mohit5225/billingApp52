export default function BillTemplatePage() {
  return (
    <div className="flex h-full flex-col p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-white">Configure a Bill Template</h1>
          <p className="mt-1 text-sm text-white/50">Manage your billing template settings here.</p>
        </div>
      </div>
      <div className="flex-1 rounded-[24px] border border-white/10 bg-white/5 p-8">
        <p className="text-white/70">Bill template configuration settings will go here.</p>
      </div>
    </div>
  );
}
