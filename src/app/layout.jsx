import "./globals.css";
import Navbar from '@/components/layout/Navbar';
import BottomBar from '@/components/layout/BottomBar';

export const metadata = {
  title: "Knova – Learning Platform for you all.",
  description: "A telemetry-driven educational platform applying social media engagement mechanics to personalize learning content.",
  icons: {
    icon: '/Knova.png',
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Load Material Symbols */}
        <link 
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" 
          rel="stylesheet" 
        />
        {/* Load other fonts */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <div className="flex flex-col min-h-screen">
          <Navbar />
          <div className="flex-1 w-full max-w-4xl mx-auto pb-24 md:pb-10 pt-20">
            {children}
          </div>
          <BottomBar />
        </div>
      </body>
    </html>
  );
}