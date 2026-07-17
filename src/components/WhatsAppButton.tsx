import { MessageCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { useSiteContent } from '../context/SiteContext';

export default function WhatsAppButton() {
  const { siteContent } = useSiteContent();
  const { whatsappUrl } = siteContent.psychologist_info;
  return (
    <motion.a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg hover:bg-emerald-600 transition-colors duration-300"
      aria-label="Fale comigo no WhatsApp"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: [0, 1.1, 1], opacity: 1 }}
      transition={{ delay: 1, duration: 0.5 }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
    >
      {/* Ripple Effect Animation */}
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-25"></span>
      <MessageCircle size={28} className="relative z-10" />
    </motion.a>
  );
}
