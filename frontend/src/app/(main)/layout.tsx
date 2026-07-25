import Navbar from "@/components/layout/Navbar";
import BottomBar from "@/components/layout/BottomBar";

interface MainLayoutProps {
  children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      {/* Bottom padding clears the floating mobile nav (and the iOS safe area). */}
      <div className="flex-1 w-full max-w-4xl mx-auto pb-[calc(7rem+env(safe-area-inset-bottom))] md:pb-10 pt-20">
        {children}
      </div>

      <BottomBar />
    </div>
  );
}