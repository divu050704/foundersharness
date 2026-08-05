import Navbar from "@/components/layout/Navbar";
import Sidebar from "@/components/layout/Sidebar";

export default function DashboardLayout({ children }) {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
      {/* Sidebar is persistent on desktop */}
      <div className="hidden md:flex md:flex-shrink-0">
        <Sidebar />
      </div>
      <div className="flex flex-col flex-1 overflow-hidden">
        <Navbar />
        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto bg-accent/20 p-6 md:p-8">
          <div className="mx-auto max-w-7xl space-y-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
