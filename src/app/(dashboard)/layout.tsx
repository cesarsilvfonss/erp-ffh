import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { MobileMenuProvider } from "@/components/layout/MobileMenuContext";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <MobileMenuProvider>
      <div className="flex h-screen overflow-hidden print:h-auto print:overflow-visible print:block bg-zinc-950 text-zinc-100 font-sans selection:bg-emerald-500/30">
        <div className="print:hidden h-full">
          <Sidebar />
        </div>
        <div className="flex-1 flex flex-col h-screen overflow-hidden relative print:h-auto print:overflow-visible print:block">
          <div className="print:hidden">
            <Header />
          </div>
          <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-zinc-950/50 print:overflow-visible print:p-0 print:bg-white print:m-0">
            <div className="mx-auto max-w-7xl print:max-w-none print:w-full print:m-0">
              {children}
            </div>
          </main>
        </div>
      </div>
    </MobileMenuProvider>
  );
}
