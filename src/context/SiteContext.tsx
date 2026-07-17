import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { contentService, SiteContent, logAuditAction } from '../services/contentService';
import { BlogPost } from '../types';
import { PSYCHOLOGIST_INFO, SERVICES, PROCESS_STEPS, FAQS, TESTIMONIALS, BLOG_POSTS } from '../data';

interface SiteContextType {
  siteContent: SiteContent;
  blogPosts: BlogPost[];
  loading: boolean;
  user: User | null;
  refreshContent: () => Promise<void>;
  refreshBlog: () => Promise<void>;
  updateSiteContent: (content: Partial<SiteContent>) => Promise<void>;
  updateBlogPosts: (posts: BlogPost[]) => Promise<void>;
  logout: () => Promise<void>;
}

const DEFAULT_CONTENT: SiteContent = {
  psychologist_info: {
    ...PSYCHOLOGIST_INFO,
    facebookUrl: "https://facebook.com/___________",
    officeHours: "Segunda a Sexta, das 08:00 às 20:00",
    footerText: "Psicoterapia online ética, sigilosa e acolhedora. Regulamentada pelo CFP.",
    whatsappMessage: "Olá, Psicóloga Erica Costa! Gostaria de agendar uma consulta.",
    heroImageUrl: "",
    aboutImageUrl: "",
    logoUrl: ""
  },
  services: SERVICES,
  process_steps: PROCESS_STEPS,
  faqs: FAQS,
  testimonials: TESTIMONIALS,
  appearance: {
    primaryColor: "#5c6f68", // sage-600
    backgroundColor: "#fcfaf7", // sand-50
    backgroundImageUrl: "",
    logoUrl: ""
  },
  seo: {
    title: "Erica Costa | Psicologia Clínica & Orientação de Carreira",
    description: "Espaço seguro de acolhimento e escuta qualificada. Psicoterapia online para jovens e adultos. Orientação de carreira e plantão de acolhimento emocional.",
    keywords: "psicóloga, terapia online, psicoterapia, ansiedade, autoconhecimento, orientação de carreira, Erica Costa, ceára"
  }
};

const SiteContext = createContext<SiteContextType | undefined>(undefined);

export const SiteProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [siteContent, setSiteContent] = useState<SiteContent>(DEFAULT_CONTENT);
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>(BLOG_POSTS);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  const refreshContent = async () => {
    try {
      const data = await contentService.getSiteContent();
      setSiteContent(data);
      
      // Update dynamic document head attributes on the fly
      if (data.seo?.title) {
        document.title = data.seo.title;
      }
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc && data.seo?.description) {
        metaDesc.setAttribute('content', data.seo.description);
      }
      
      // Update favicon on the fly
      const faviconUrl = (data.appearance as any)?.faviconUrl || (data.psychologist_info as any)?.faviconUrl;
      if (faviconUrl) {
        let link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
        if (!link) {
          link = document.createElement('link');
          link.rel = 'icon';
          document.head.appendChild(link);
        }
        link.href = faviconUrl;
      }
    } catch (err) {
      console.error("Error refreshing site content:", err);
    }
  };

  const refreshBlog = async () => {
    try {
      const data = await contentService.getBlogPosts();
      setBlogPosts(data);
    } catch (err) {
      console.error("Error refreshing blog posts:", err);
    }
  };

  const prevUserRef = useRef<User | null>(null);

  useEffect(() => {
    // Load initial data from Firebase in parallel
    Promise.all([refreshContent(), refreshBlog()]).finally(() => {
      setLoading(false);
    });

    // Subscribe to Firebase Auth state changes
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      const prevUser = prevUserRef.current;
      setUser(currentUser);
      prevUserRef.current = currentUser;

      if (currentUser && !prevUser) {
        await logAuditAction('LOGIN', `Usuário ${currentUser.email || currentUser.uid} realizou login no painel administrativo.`);
      } else if (!currentUser && prevUser) {
        await logAuditAction('LOGOUT', `Usuário ${prevUser.email || prevUser.uid} encerrou a sessão.`);
      }
    });

    return () => unsubscribe();
  }, []);

  const logout = async () => {
    await signOut(auth);
  };

  const updateSiteContent = async (content: Partial<SiteContent>) => {
    await contentService.updateSiteContent(content);
    await refreshContent();
  };

  const updateBlogPosts = async (posts: BlogPost[]) => {
    await contentService.updateBlogPostsList(posts);
    await refreshBlog();
  };

  return (
    <SiteContext.Provider value={{
      siteContent,
      blogPosts,
      loading,
      user,
      refreshContent,
      refreshBlog,
      updateSiteContent,
      updateBlogPosts,
      logout
    }}>
      {children}
    </SiteContext.Provider>
  );
};

export const useSiteContent = () => {
  const context = useContext(SiteContext);
  if (context === undefined) {
    throw new Error('useSiteContent must be used within a SiteProvider');
  }
  return context;
};
