import { Service, BlogPost, FAQ, Testimonial } from './types';

export const PSYCHOLOGIST_INFO = {
  name: "Erica Costa",
  title: "Psicóloga",
  crp: "", // Espaço preparado para o CRP. Deixe vazio por enquanto ou preencha quando emitido.
  bioShort: "Um espaço seguro para acolher sua história, fortalecer sua saúde emocional e promover seu bem-estar.",
  bioLong: "Olá! Sou Erica Costa, psicóloga. Meu compromisso é oferecer um atendimento acolhedor, ético e humanizado, proporcionando um espaço seguro para que você possa explorar suas emoções, compreender seus desafios e trilhar um caminho de autoconhecimento e crescimento pessoal. Acredito na psicologia como uma ferramenta de transformação e acolhimento. Vamos caminhar juntos?",
  location: "Atendimento 100% Online (Para todo o Brasil e brasileiros no exterior)",
  email: "contato@ericacostapsi.com.br",
  phone: "+55 (85) 98647-1336",
  phoneFormatted: "(85) 98647-1336",
  whatsappUrl: "https://wa.me/5585986471336?text=Ol%C3%A1%2C%20Psic%C3%B3loga%20Erica%20Costa%21%20Gostaria%20de%20agendar%20uma%20consulta.",
  instagramUrl: "https://instagram.com/___________",
  linkedinUrl: "https://linkedin.com/in/ericacosta-psi",
};

export const SERVICES: Service[] = [
  {
    id: "psicoterapia-individual",
    title: "Psicoterapia Individual (Online para Jovens e Adultos)",
    description: "Um espaço individualizado e seguro para compreender sentimentos, tratar demandas emocionais e potencializar o autoconhecimento.",
    detailedDescription: "A psicoterapia individual online destina-se a jovens e adultos que buscam compreender sentimentos de ansiedade, estresse, autossabotagem ou que desejam desenvolver inteligência emocional. As sessões ocorrem por videochamada semanal em ambiente totalmente seguro e confidencial, seguindo as diretrizes de ética do Conselho Federal de Psicologia.",
    duration: "50 minutos",
    format: "100% Online",
    iconName: "User",
    targetAudience: "Jovens e Adultos",
    price: 150
  },
  {
    id: "orientacao-carreira",
    title: "Orientação de Carreira",
    description: "Processo estruturado focado no planejamento profissional, escolha profissional ou transição de carreira.",
    detailedDescription: "Para quem está escolhendo a profissão pela primeira vez ou buscando recolocação profissional e transição de carreira. Através de mapeamentos de competências, habilidades, interesses e valores de trabalho, construímos metas objetivas para uma jornada profissional mais autêntica e realizadora.",
    duration: "50 minutos (Processo breve estruturado)",
    format: "100% Online",
    iconName: "Compass",
    targetAudience: "Estudantes e Profissionais",
    price: 180
  },
  {
    id: "apoio-emocional",
    title: "Apoio Emocional / Plantão de Acolhimento",
    description: "Acolhimento focal para momentos de crise aguda, sofrimento intenso ou tomada de decisões difíceis.",
    detailedDescription: "O plantão de acolhimento é um espaço pontual voltado para momentos de sobrecarga emocional severa, luto recente, estresse agudo ou necessidade imediata de escuta ativa qualificada. Um momento seguro para organizar os pensamentos e receber suporte e regulação imediatos.",
    duration: "50 minutos",
    format: "100% Online",
    iconName: "Heart",
    targetAudience: "Pessoas em momentos de crise ou sofrimento agudo",
    price: 120
  }
];

export const PROCESS_STEPS = [
  {
    step: "01",
    title: "Primeiro Contato",
    description: "Você clica no botão do WhatsApp ou preenche o formulário do site. Conversamos brevemente para tirar dúvidas iniciais e marcar o melhor horário para você."
  },
  {
    step: "02",
    title: "Sessão Inicial (Acolhimento)",
    description: "Nosso primeiro encontro por vídeo serve para você me contar sua história e seus objetivos. É um momento de acolhimento e escuta qualificada sem julgamentos."
  },
  {
    step: "03",
    title: "Sessões Semanais",
    description: "Os atendimentos duram 50 minutos e ocorrem via plataforma segura. Trabalhamos em cima dos seus desafios, estimulando novos insights e autonomia."
  },
  {
    step: "04",
    title: "Crescimento e Alta",
    description: "Conforme você desenvolve recursos emocionais de autoconhecimento e autorregulação, espaçamos os atendimentos até a alta terapêutica de forma segura."
  }
];

export const BLOG_POSTS: BlogPost[] = [
  {
    id: "compreendendo-a-ansiedade",
    title: "Ansiedade: Como compreender e lidar com ela no dia a dia",
    excerpt: "A ansiedade não é sua inimiga, mas sim um sinal de alerta do corpo. Aprenda a reconhecer os gatilhos e a acalmar sua mente com técnicas práticas.",
    content: "A ansiedade é uma emoção natural e necessária. Ela funciona como um mecanismo de defesa, nos preparando para lidar com situações de risco. O problema surge quando esse alarme toca em momentos em que não há perigo real, de forma constante e desproporcional, gerando sofrimento.\n\n### Como a Ansiedade se manifesta?\n- **Fisicamente**: Taquicardia, respiração ofegante, tensão muscular, tremores e suor frio.\n- **Cognitivamente**: Pensamentos catastróficos ('e se tudo der errado?', 'não vou conseguir'), preocupação constante com o futuro e dificuldade de concentração.\n- **Comportamentalmente**: Evitação de situações desconfortáveis ou de socialização.\n\n### 3 Técnicas Simples para Controlar Crises no Cotidiano\n1. **Respiração Quadrada**: Inspire pelo nariz contando até 4, segure o ar por 4 segundos, expire pela boca em 4 segundos e mantenha-se sem ar por mais 4 segundos. Repita o ciclo cinco vezes.\n2. **Técnica do Aterramento (5-4-3-2-1)**: Olhe ao seu redor e identifique 5 coisas que pode ver, 4 coisas que pode tocar, 3 coisas que pode ouvir, 2 coisas que pode cheirar e 1 coisa que pode saborear. Isso traz sua mente de volta ao momento presente.\n3. **Questione seus Pensamentos**: Pergunte a si mesmo: 'Qual a probabilidade real de isso acontecer?' ou 'O que eu diria a um amigo se ele estivesse passando por isso agora?'. Muitas vezes, nossos pensamentos não representam fatos reais.\n\nA psicoterapia online é uma excelente aliada para compreender a raiz das suas preocupações e desenvolver formas saudáveis de lidar com a ansiedade de maneira duradoura.",
    category: "Saúde Mental",
    readTime: "5 min de leitura",
    date: "10 de Julho de 2026",
    imageUrl: "https://images.unsplash.com/photo-1518495973542-4542c06a5843?auto=format&fit=crop&q=80&w=800",
    author: "Erica Costa"
  },
  {
    id: "fortalecendo-a-autoestima",
    title: "A importância do Autoconhecimento no fortalecimento da Autoestima",
    excerpt: "Ter uma boa autoestima vai muito além de se olhar no espelho e se sentir bonito. Trata-se de autocompaixão, reconhecimento de limites e autoaceitação.",
    content: "Muitos acreditam que ter autoestima elevada é estar sempre confiante e feliz com a própria aparência. Na verdade, a psicologia define a autoestima como a avaliação subjetiva que fazemos de nós mesmos. Ela está ligada ao quanto nos respeitamos, nos acolhemos em nossas falhas e confiamos em nossa capacidade de lidar com a vida.\n\n### Os Três Pilares da Autoestima\n- **Autoaceitação**: Aceitar tanto as suas qualidades quanto as suas vulnerabilidades. Não significa conformismo, mas sim partir de um ponto de honestidade consigo mesmo.\n- **Autorespeito**: Saber colocar limites nas relações e dizer 'não' quando necessário para preservar seus valores e seu bem-estar.\n- **Autoconfiança**: Acreditar na sua capacidade de fazer escolhas, resolver problemas e superar obstáculos.\n\n### Como o Autoconhecimento ajuda?\nAtravés do autoconhecimento, conseguimos entender a origem da nossa autocrítica severa. Muitas vezes, carregamos vozes e cobranças da nossa infância ou de relações passadas que não nos pertencem. Ao identificá-las, podemos escolher tratá-las com mais autocompaixão.\n\nLembre-se: você não precisa ser perfeito para ser digno do seu próprio amor e respeito.",
    category: "Desenvolvimento Pessoal",
    readTime: "4 min de leitura",
    date: "28 de Junho de 2026",
    imageUrl: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&q=80&w=800",
    author: "Erica Costa"
  },
  {
    id: "limites-saudaveis-relacoes",
    title: "Como estabelecer limites saudáveis nas suas relações pessoais",
    excerpt: "Dizer não é um ato de amor-próprio e saúde emocional. Entenda por que temos tanta dificuldade em impor barreiras e como fazer isso com leveza.",
    content: "Você tem dificuldade em dizer 'não'? Costuma assumir mais responsabilidades do que consegue dar conta apenas para agradar aos outros? Se a resposta for sim, você pode estar precisando desenvolver a habilidade de impor limites saudáveis.\n\nLimites são as regras invisíveis que estabelecemos para que as pessoas saibam como nos tratar. Sem eles, nos sentimos sobrecarregados, ressentidos e cansados emocionalmente.\n\n### Por que é tão difícil dizer não?\n- **Medo da rejeição**: O receio de que as pessoas se afastem ou deixem de gostar de nós.\n- **Necessidade de agradar**: Associar o nosso valor pessoal à utilidade que temos para os outros.\n- **Culpa**: Sentir que estamos sendo egoístas por priorizar nossas necessidades.\n- **Desconforto**: Lidar com a reação inicial das pessoas.\n\n### Dicas Práticas para Começar a Impor Limites\n1. **Identifique seus limites**: Preste atenção ao seu corpo e sentimentos. Se uma situação causa irritação crônica ou esgotamento, ali existe um limite sendo ultrapassado.\n2. **Seja direto, claro e gentil**: Você não precisa dar desculpas longas e complexas. Um simples 'Gostaria muito de ajudar, mas no momento estou sobrecarregada e não poderei assumir esse compromisso' é suficiente.\n3. **Tolere o desconforto inicial**: Sentir um pouco de culpa no começo é normal. Lembre-se de que cada vez que você diz um 'sim' forçado para o outro, está dizendo um 'não' doloroso para si mesma.\n\nA terapia nos ajuda a desenvolver a assertividade para comunicar nossos limites com segurança e empatia.",
    category: "Relacionamentos",
    readTime: "6 min de leitura",
    date: "15 de Junho de 2026",
    imageUrl: "https://images.unsplash.com/photo-1490730141103-6cac27aaab94?auto=format&fit=crop&q=80&w=800",
    author: "Erica Costa"
  }
];

export const FAQS: FAQ[] = [
  {
    id: "primeira-consulta",
    question: "Como funciona a primeira consulta de terapia?",
    answer: "A primeira sessão é um momento de acolhimento e avaliação inicial. Conversaremos sobre suas principais queixas, sua história e seus objetivos com a psicoterapia. Também é uma oportunidade para tirar suas dúvidas sobre o meu método de trabalho e as diretrizes do processo.",
    category: "Geral"
  },
  {
    id: "duracao-sessao",
    question: "Qual é o tempo de duração e a frequência das sessões?",
    answer: "As sessões de psicoterapia têm duração média de 50 minutos. A frequência padrão é de uma sessão por semana, o que permite o desenvolvimento do vínculo terapêutico e a constância no processo de autoconhecimento.",
    category: "Geral"
  },
  {
    id: "sigilo-terapeutico",
    question: "Tudo o que eu disser na sessão realmente fica em sigilo?",
    answer: "Sim, absolutamente. O sigilo profissional é um dever ético fundamental garantido pelo Código de Ética do Psicólogo. Tudo o que é conversado durante a consulta é confidencial e tratado com máximo respeito e privacidade.",
    category: "Ética e Segurança"
  },
  {
    id: "atendimento-online",
    question: "Como funciona o atendimento online? É eficaz?",
    answer: "O atendimento é realizado por meio de videochamadas individuais em uma plataforma que atende aos padrões de segurança e criptografia de dados. Diversos estudos científicos comprovam que a psicoterapia online possui a mesma eficácia que a presencial, com o benefício extra de maior comodidade e eliminação de deslocamentos.",
    category: "Atendimento"
  },
  {
    id: "convenio-particular",
    question: "Você atende convênios médicos?",
    answer: "Os atendimentos são realizados exclusivamente de forma particular. Entretanto, emito o recibo de atendimento com todas as informações necessárias para que você possa solicitar o reembolso integral ou parcial junto ao seu plano de saúde (modalidade de livre escolha).",
    category: "Financeiro"
  },
  {
    id: "registro-crp",
    question: "Qual a situação do seu registro profissional?",
    answer: "Estou em processo final de registro junto ao Conselho Regional de Psicologia (CRP). Todos os meus atendimentos são supervisionados, garantindo o máximo rigor técnico, científico, ético e profissional a todos os pacientes.",
    category: "Ética e Segurança"
  }
];

export const TESTIMONIALS: Testimonial[] = [
  {
    id: "t1",
    name: "Mariana Costa",
    role: "Paciente de Psicoterapia Individual (Online)",
    text: "Iniciar a terapia com a Erica foi maravilhoso. Ela tem uma escuta extremamente acolhedora e atenta. Sinto que encontrei um espaço verdadeiramente seguro para falar sobre minhas fragilidades e ansiedades.",
    stars: 5
  },
  {
    id: "t2",
    name: "Rodrigo Almeida",
    role: "Paciente de Orientação de Carreira",
    text: "Estava em um momento de profunda indecisão profissional. O processo estruturado com a Erica me ajudou a reconhecer minhas competências e a traçar um plano seguro e pé no chão de transição profissional.",
    stars: 5
  },
  {
    id: "t3",
    name: "Gabriela Mendes",
    role: "Paciente de Psicoterapia (Online)",
    text: "O atendimento online da Erica superou todas as minhas expectativas. Me sinto acolhida mesmo à distância, as sessões têm me ajudado muito a impor limites saudáveis nas minhas relações diárias.",
    stars: 5
  }
];
