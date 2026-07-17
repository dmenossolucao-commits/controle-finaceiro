import { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import About from './components/About';
import Benefits from './components/Benefits';
import Services from './components/Services';
import HowItWorks from './components/HowItWorks';
import BookingSection from './components/BookingSection';
import Faqs from './components/Faqs';
import Testimonials from './components/Testimonials';
import Contact from './components/Contact';
import Footer from './components/Footer';
import WhatsAppButton from './components/WhatsAppButton';
import AdminApp from './components/AdminApp';

export default function App() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  const navigate = (to: string) => {
    window.history.pushState({}, '', to);
    setCurrentPath(to);
    window.scrollTo({ top: 0, behavior: 'instant' as any });
  };

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Determine rendering based on path
  if (currentPath.startsWith('/admin')) {
    return <AdminApp navigate={navigate} currentPath={currentPath} />;
  }

  return (
    <div className="min-h-screen flex flex-col justify-between selection:bg-softblue-200 selection:text-softblue-900 antialiased bg-sand-50">
      {/* Sticky Top Menu */}
      <Navbar />

      {/* Main Sections flow */}
      <main className="flex-1 space-y-12 sm:space-y-16">
        <Hero />
        <About />
        <Benefits />
        <Services />
        <HowItWorks />
        <Faqs />
        <Testimonials />
        <BookingSection />
        <Contact />
      </main>

      {/* Modern Footer */}
      <Footer />

      {/* Floating interactive helper elements */}
      <WhatsAppButton />
    </div>
  );
}

