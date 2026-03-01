import { PlanType, PricingPlan, ChartDataPoint } from './types';

export const NAV_ITEMS = [
  { label: 'Plataforma', href: '#platform' },
  { label: 'Soluções', href: '#solutions' },
  { label: 'Preços', href: '#pricing' },
  { label: 'Sobre', href: '#about' },
];

export const HERO_CHART_DATA: ChartDataPoint[] = [
  { month: 'Jan', actual: 120, projected: 120, range: [100, 140] },
  { month: 'Fev', actual: 150, projected: 150, range: [130, 170] },
  { month: 'Mar', actual: 140, projected: 140, range: [120, 160] },
  { month: 'Abr', actual: 180, projected: 180, range: [160, 200] },
  { month: 'Mai', actual: 220, projected: 220, range: [200, 240] },
  { month: 'Jun', actual: 250, projected: 250, range: [230, 270] },
  { month: 'Jul', actual: 240, projected: 240, range: [220, 260] },
  { month: 'Ago', actual: 300, projected: 300, range: [280, 320] },
  { month: 'Set', actual: 350, projected: 350, range: [330, 370] },
  { month: 'Out', actual: 410, projected: 410, range: [390, 430] },
  { month: 'Nov', actual: 0, projected: 480, range: [450, 510] }, // Future
  { month: 'Dez', actual: 0, projected: 550, range: [520, 580] }, // Future
];

export const B2C_PLANS: PricingPlan[] = [
  {
    id: 'b2c-card1',
    name: 'Trial',
    price: 'R$ 0',
    period: '/mês',
    description: 'Para vendedores organizarem sua carteira pessoal.',
    buttonText: 'Começar Agora',
    features: [
      { text: 'Até 50 Prospects Mapeados', included: true },
      { text: 'Agenda de Visitas Básica', included: true },
      { text: 'Histórico de Contatos', included: true },
      { text: 'Roteirização Inteligente', included: false },
      { text: 'Integração WhatsApp', included: false },
    ],
  },
  {
    id: 'b2c-card2',
    name: 'Hunter Pro',
    price: 'R$ 49',
    period: '/mês',
    description: 'Potência máxima para quem vive de fechar negócios.',
    recommended: true,
    buttonText: 'Assinar Pro',
    features: [
      { text: 'Prospects e Contatos Ilimitados', included: true },
      { text: 'Roteirização Otimizada', included: true },
      { text: 'Check-in/out de Visitas', included: true },
      { text: 'Enriquecimento de Dados', included: true },
      { text: 'Funil de Vendas Pessoal', included: true },
    ],
    checkoutAmount: 49,
  },
  {
    id: 'b2c-card3',
    name: 'Elite',
    price: 'R$ 99',
    period: '/mês',
    description: 'Automação para prospecção de alto volume.',
    buttonText: 'Assinar Elite',
    features: [
      { text: 'Tudo do Hunter Pro', included: true },
      { text: 'Lead Scoring (AI)', included: true },
      { text: 'Automação de Follow-up', included: true },
      { text: 'Análise de Território', included: true },
      { text: 'Exportação Avançada', included: true },
    ],
    checkoutAmount: 99,
  },
];

export const B2B_PLANS: PricingPlan[] = [
  {
    id: 'b2b-card1',
    name: 'Trial',
    price: 'R$ 490',
    period: '/mês',
    description: 'Gestão de território para pequenas equipes externas.',
    buttonText: 'Teste Grátis',
    features: [
      { text: '5 Usuários de Campo', included: true },
      { text: 'Gestão de Territórios', included: true },
      { text: 'Relatórios de Visitas', included: true },
      { text: 'Distribuição de Prospects', included: true },
      { text: 'Tracking em Tempo Real', included: false },
    ],
    checkoutAmount: 490,
  },
  {
    id: 'b2b-card2',
    name: 'Field Ops',
    price: 'R$ 1.200',
    period: '/mês',
    description: 'Comando central para operações de vendas complexas.',
    recommended: true,
    buttonText: 'Falar com Vendas',
    features: [
      { text: '20 Usuários Conectados', included: true },
      { text: 'Tracking de Rota em Real-Time', included: true },
      { text: 'Mapa de Calor de Vendas', included: true },
      { text: 'Integração CRM (Salesforce/Hubspot)', included: true },
      { text: 'Gamificação de Metas', included: true },
    ],
    checkoutAmount: 1200,
  },
  {
    id: 'b2b-card3',
    name: 'Enterprise',
    price: 'Sob Consulta',
    period: '',
    description: 'Escala global e inteligência de mercado customizada.',
    buttonText: 'Contatar',
    features: [
      { text: 'Usuários Ilimitados', included: true },
      { text: 'API de Geolocalização Dedicada', included: true },
      { text: 'Suporte Gerencial 24/7', included: true },
      { text: 'Onboarding Presencial', included: true },
      { text: 'SLA de Alta Disponibilidade', included: true },
    ],
  },
];