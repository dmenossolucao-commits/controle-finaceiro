import { Heart, Instagram, Linkedin, Mail } from 'lucide-react';
import { useSiteContent } from '../context/SiteContext';

export default function Footer() {
  const { siteContent } = useSiteContent();
  const { name, bioShort, crp, instagramUrl, linkedinUrl, email, footerText } = siteContent.psychologist_info;
  const currentYear = new Date().getFullYear();

  const handleNavClick = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const offset = 80;
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = element.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      });
    }
  };

  return (
    <footer className="bg-sand-950 text-sand-200 pt-16 pb-8 border-t border-sand-900">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 pb-12 border-b border-sand-900">
          
          {/* Identity column */}
          <div className="lg:col-span-4 space-y-4">
            <button
              onClick={() => handleNavClick('home')}
              className="flex items-center space-x-2 text-white font-serif font-bold text-xl cursor-pointer"
            >
              <Heart className="h-5 w-5 text-dusty-400 fill-dusty-950" />
              <span>{name}</span>
            </button>
            <p className="text-xs text-sand-400 leading-relaxed max-w-xs">
              {footerText || bioShort}
            </p>
            {crp && (
              <p className="text-xs font-mono text-dusty-400">
                {crp}
              </p>
            )}
          </div>

          {/* Quick links column */}
          <div className="lg:col-span-3 space-y-4 text-left">
            <h4 className="text-sm font-serif font-bold text-white uppercase tracking-wider">Acesso Rápido</h4>
            <ul className="space-y-2.5 text-xs">
              {[
                { id: 'home', label: 'Início' },
                { id: 'sobre', label: 'Sobre Mim' },
                { id: 'servicos', label: 'Serviços' },
                { id: 'como-funciona', label: 'Como Funciona' },
                { id: 'faq', label: 'Dúvidas Frequentes' },
                { id: 'blog', label: 'Blog & Artigos' },
                { id: 'contato', label: 'Contato & Atendimento' },
              ].map((link) => (
                <li key={link.id}>
                  <button
                    onClick={() => handleNavClick(link.id)}
                    className="text-sand-400 hover:text-white transition-colors cursor-pointer"
                  >
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal / CFP Guidance */}
          <div className="lg:col-span-3 space-y-4 text-left">
            <h4 className="text-sm font-serif font-bold text-white uppercase tracking-wider">Conselho Federal</h4>
            <p className="text-[11px] text-sand-400 leading-relaxed">
              Atendimento em conformidade total com o Código de Ética do Psicólogo e com a Resolução CFP nº 11/2018 para prestação de serviços psicológicos por meio de tecnologias de informação e comunicação.
            </p>
            <div className="pt-2">
              <span className="inline-flex items-center text-[10px] font-mono uppercase bg-sand-900 border border-sand-800 text-sand-400 px-2.5 py-1 rounded">
                E-PSI Cadastrado
              </span>
            </div>
          </div>

          {/* Social column */}
          <div className="lg:col-span-2 space-y-4 text-left">
            <h4 className="text-sm font-serif font-bold text-white uppercase tracking-wider">Redes e Contato</h4>
            <div className="flex space-x-3.5 pt-1">
              <a
                href={instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-sand-900 hover:bg-dusty-600 text-sand-300 hover:text-white rounded-lg transition-all"
                aria-label="Instagram"
              >
                <Instagram size={18} />
              </a>
              <a
                href={linkedinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-sand-900 hover:bg-dusty-600 text-sand-300 hover:text-white rounded-lg transition-all"
                aria-label="LinkedIn"
              >
                <Linkedin size={18} />
              </a>
              <a
                href={`mailto:${email}`}
                className="p-2 bg-sand-900 hover:bg-dusty-600 text-sand-300 hover:text-white rounded-lg transition-all"
                aria-label="E-mail"
              >
                <Mail size={18} />
              </a>
            </div>
          </div>

        </div>

        {/* Bottom meta row */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-sand-500">
          <p>© {currentYear} {name}. Todos os direitos reservados.</p>
        </div>

      </div>
    </footer>
  );
}
