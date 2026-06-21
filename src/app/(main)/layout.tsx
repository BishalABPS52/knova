import Navbar from '@/components/layout/Navbar';
import BottomBar from '@/components/layout/BottomBar';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <div className="flex-1 w-full max-w-4xl mx-auto pb-24 md:pb-10 pt-20">
        {children}
      </div>
      <BottomBar />
    </div>
  );
}
