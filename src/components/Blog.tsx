import { useState } from 'react';
import { Search, BookOpen, Clock, Calendar, X, ArrowRight, User } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useSiteContent } from '../context/SiteContext';
import { BlogPost } from '../types';

export default function Blog() {
  const { blogPosts } = useSiteContent();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todos");
  const [readingPost, setReadingPost] = useState<BlogPost | null>(null);

  const categories = ["Todos", "Saúde Mental", "Desenvolvimento Pessoal", "Relacionamentos"];

  // Filters
  const filteredPosts = blogPosts.filter(post => {
    const matchesSearch = post.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          post.excerpt.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "Todos" || post.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Safe renderer for blog post content with simple markdown-like elements (subtitles and lists)
  const renderArticleContent = (content: string) => {
    const blocks = content.split('\n\n');
    return blocks.map((block, idx) => {
      // Subtitle
      if (block.startsWith('###')) {
        return (
          <h4 key={idx} className="text-xl sm:text-2xl font-serif font-bold text-sand-950 mt-8 mb-4">
            {block.replace('###', '').trim()}
          </h4>
        );
      }
      // Unordered list
      if (block.startsWith('-')) {
        const listItems = block.split('\n').map(item => item.replace('-', '').trim());
        return (
          <ul key={idx} className="list-disc pl-5 my-4 space-y-2.5 text-sand-800 text-base">
            {listItems.map((li, liIdx) => {
              // Highlight bold text inside bullet points
              const parts = li.split('**');
              if (parts.length > 2) {
                return (
                  <li key={liIdx}>
                    <strong className="text-sand-950 font-semibold">{parts[1]}</strong>
                    {parts.slice(2).join('')}
                  </li>
                );
              }
              return <li key={liIdx}>{li}</li>;
            })}
          </ul>
        );
      }
      // Ordered list numbered format
      if (/^\d\./.test(block)) {
        const listItems = block.split('\n').map(item => item.replace(/^\d\.\s*/, '').trim());
        return (
          <ol key={idx} className="list-decimal pl-5 my-4 space-y-2.5 text-sand-800 text-base">
            {listItems.map((li, liIdx) => {
              const parts = li.split('**');
              if (parts.length > 2) {
                return (
                  <li key={liIdx}>
                    <strong className="text-sand-950 font-semibold">{parts[1]}</strong>
                    {parts.slice(2).join('')}
                  </li>
                );
              }
              return <li key={liIdx}>{li}</li>;
            })}
          </ol>
        );
      }
      // Default paragraph
      return (
        <p key={idx} className="text-base text-sand-800 leading-relaxed my-4 whitespace-pre-line">
          {block}
        </p>
      );
    });
  };

  return (
    <section id="blog" className="py-20 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-12 space-y-2">
          <span className="text-xs font-semibold uppercase tracking-widest text-sage-600 font-mono">CONTEÚDO E REFLEXÕES</span>
          <h2 className="text-3xl sm:text-4xl font-serif text-sand-950 font-bold">
            Blog de Saúde Mental
          </h2>
          <p className="text-sm text-sand-800">
            Artigos, dicas práticas e reflexões sobre bem-estar de forma acessível e baseada na ciência psicológica.
          </p>
        </div>

        {/* Search and Filter Row */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-12 border-b border-sand-100 pb-8">
          {/* Categories */}
          <div className="flex flex-wrap gap-2 order-2 md:order-1">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-sage-600 text-white'
                    : 'bg-sand-50 text-sand-800 hover:bg-sand-100'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search bar */}
          <div className="relative max-w-xs w-full order-1 md:order-2">
            <input
              type="text"
              placeholder="Buscar artigo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-full border border-sand-300 focus:outline-none focus:ring-1 focus:ring-sage-400 focus:border-sage-400 bg-sand-50"
            />
            <Search size={15} className="absolute left-3 top-2.5 text-sand-700" />
          </div>
        </div>

        {/* Blog Post Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredPosts.map((post) => (
            <motion.article
              key={post.id}
              layout
              initial={{ opacity: 0, scale: 0.98 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4 }}
              className="bg-sand-50/50 border border-sand-200/40 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between"
            >
              <div>
                {/* Image header */}
                <div className="h-48 w-full overflow-hidden relative">
                  <img
                    src={post.imageUrl}
                    alt={post.title}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                  />
                  <span className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm text-sage-800 text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full border border-sand-100">
                    {post.category}
                  </span>
                </div>

                {/* Content body */}
                <div className="p-6 space-y-3">
                  <div className="flex items-center space-x-4 text-xs text-sand-700 font-medium">
                    <span className="flex items-center">
                      <Calendar size={12} className="mr-1 text-sage-400" />
                      {post.date}
                    </span>
                    <span className="flex items-center">
                      <Clock size={12} className="mr-1 text-sage-400" />
                      {post.readTime}
                    </span>
                  </div>

                  <h3 className="text-lg sm:text-xl font-serif font-bold text-sand-950 leading-snug line-clamp-2">
                    {post.title}
                  </h3>
                  
                  <p className="text-sand-850 text-sm leading-relaxed line-clamp-3">
                    {post.excerpt}
                  </p>
                </div>
              </div>

              {/* Action Footer */}
              <div className="px-6 pb-6 pt-4 border-t border-sand-100">
                <button
                  onClick={() => setReadingPost(post)}
                  className="inline-flex items-center text-xs font-semibold uppercase tracking-wider text-sage-700 hover:text-sage-800 cursor-pointer group"
                >
                  Ler Artigo Completo
                  <ArrowRight size={14} className="ml-1 transition-transform group-hover:translate-x-0.5" />
                </button>
              </div>
            </motion.article>
          ))}

          {filteredPosts.length === 0 && (
            <div className="col-span-full text-center py-16 text-sand-700">
              <BookOpen size={40} className="mx-auto mb-3 text-sand-300" />
              <p>Nenhum artigo encontrado para a busca especificada.</p>
            </div>
          )}
        </div>

      </div>

      {/* Immersive Article Modal */}
      <AnimatePresence>
        {readingPost && (
          <div className="fixed inset-0 z-50 flex justify-end">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setReadingPost(null)}
              className="absolute inset-0 bg-sand-950/40 backdrop-blur-sm"
            />

            {/* Reading Drawer */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "tween", duration: 0.4 }}
              className="relative bg-white w-full max-w-2xl h-full shadow-2xl z-10 flex flex-col"
            >
              {/* Header block */}
              <div className="flex items-center justify-between p-5 border-b border-sand-100 bg-sand-50">
                <div className="flex items-center space-x-3 text-xs text-sand-700">
                  <span className="font-semibold text-sage-700 bg-sage-100 px-2.5 py-1 rounded-md">
                    {readingPost.category}
                  </span>
                  <span>•</span>
                  <span className="flex items-center">
                    <Clock size={12} className="mr-1" />
                    {readingPost.readTime}
                  </span>
                </div>

                <button
                  onClick={() => setReadingPost(null)}
                  className="p-2 rounded-full hover:bg-sand-200 text-sand-700 hover:text-sand-950 transition-colors cursor-pointer"
                  aria-label="Fechar artigo"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Scrollable Reading Frame */}
              <div className="overflow-y-auto flex-1 p-6 sm:p-10 space-y-6">
                {/* Image Cover */}
                <div className="w-full aspect-[16/9] rounded-2xl overflow-hidden shadow-inner mb-6">
                  <img
                    src={readingPost.imageUrl}
                    alt={readingPost.title}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>

                {/* Meta details */}
                <div className="flex items-center space-x-3 text-xs text-sand-700 pb-4 border-b border-sand-100">
                  <div className="h-8 w-8 rounded-full bg-sage-100 text-sage-800 font-serif font-bold flex items-center justify-center border border-sage-200">
                    {readingPost.author.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <p className="font-semibold text-sand-950 flex items-center">
                      <User size={12} className="mr-1 text-sage-500" />
                      {readingPost.author}
                    </p>
                    <p className="text-[10px] text-sand-700 font-medium uppercase tracking-wider">{readingPost.date}</p>
                  </div>
                </div>

                {/* Article Title */}
                <h3 className="text-2xl sm:text-4xl font-serif font-bold text-sand-950 leading-tight">
                  {readingPost.title}
                </h3>

                {/* Rendered Body */}
                <div className="text-sand-800 leading-relaxed font-sans space-y-4">
                  {renderArticleContent(readingPost.content)}
                </div>

                {/* Footer Call to action inside blog */}
                <div className="mt-12 p-6 bg-sage-50 border border-sage-100 rounded-2xl space-y-3">
                  <h4 className="text-lg font-serif font-bold text-sand-950">Gostou da leitura?</h4>
                  <p className="text-sm text-sand-800">
                    Muitas dessas dinâmicas são compreendidas e ressignificadas no espaço terapêutico individual. Agende uma conversa para explorarmos suas demandas específicas.
                  </p>
                  <button
                    onClick={() => {
                      setReadingPost(null);
                      const element = document.getElementById('contato');
                      if (element) {
                        element.scrollIntoView({ behavior: 'smooth' });
                      }
                    }}
                    className="inline-flex items-center bg-sage-600 hover:bg-sage-700 text-white text-xs font-semibold uppercase tracking-wider px-5 py-2.5 rounded-lg transition-colors cursor-pointer"
                  >
                    Agendar Horário
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}
