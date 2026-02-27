import React from 'react';
import { MapPin, Users, CalendarCheck, Route, BarChart2, ShieldCheck } from 'lucide-react';
import { FeatureCardProps } from '../types';

const features: FeatureCardProps[] = [
  {
    icon: MapPin,
    title: 'Mapeamento de Território',
    description: 'Visualize oportunidades em mapas de calor. Defina zonas de atuação e distribua prospects geograficamente.',
  },
  {
    icon: CalendarCheck,
    title: 'Gestão de Visitas',
    description: 'Check-in e check-out via mobile, relatórios de campo em tempo real e histórico de interações presenciais.',
  },
  {
    icon: Users,
    title: 'Central de Contatos',
    description: 'Um CRM ágil focado em relacionamento. Unifique WhatsApp, e-mail e notas de reunião em uma timeline única.',
  },
  {
    icon: Route,
    title: 'Roteirização Inteligente',
    description: 'Algoritmos que traçam a rota mais eficiente para visitar mais clientes, gastando menos tempo no trânsito.',
  },
  {
    icon: BarChart2,
    title: 'Funil de Prospecção',
    description: 'Acompanhe a conversão de prospects frios em oportunidades reais com métricas claras de cada etapa.',
  },
  {
    icon: ShieldCheck,
    title: 'Auditoria & Compliance',
    description: 'Garanta que cada visita foi realizada com validação por geolocalização e carimbo de tempo inviolável.',
  },
];

const FeatureCard: React.FC<FeatureCardProps> = ({ icon: Icon, title, description }) => (
  <div className="p-6 rounded-xl bg-nexus-800/40 border border-nexus-700 hover:border-nexus-500 transition-all duration-300 hover:shadow-lg hover:shadow-nexus-accent/5 group">
    <div className="w-12 h-12 bg-nexus-700 rounded-lg flex items-center justify-center mb-4 group-hover:bg-nexus-600 transition-colors">
      <Icon className="w-6 h-6 text-nexus-accent" />
    </div>
    <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
    <p className="text-nexus-muted text-sm leading-relaxed">{description}</p>
  </div>
);

const Features: React.FC = () => {
  return (
    <section id="solutions" className="py-24 bg-nexus-900 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            A Nova Era da Prospecção
          </h2>
          <p className="text-nexus-muted max-w-2xl mx-auto">
            Ferramentas de precisão para quem precisa mapear o mercado e garantir a execução impecável em campo.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <FeatureCard key={index} {...feature} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;