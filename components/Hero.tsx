import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { HERO_CHART_DATA } from '../constants';
import { ArrowRight, Map, Crosshair, Zap } from 'lucide-react';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const isProjected = label === 'Nov' || label === 'Dez';
    return (
      <div className="bg-nexus-800 border border-nexus-600 p-3 rounded-lg shadow-xl backdrop-blur-sm">
        <p className="text-nexus-muted text-xs mb-1 font-mono">{label}</p>
        <p className="text-nexus-accent font-bold text-sm">
          {isProjected ? `Proj: ${payload[0].value} Prospects` : `Volume: ${payload[0].value} Prospects`}
        </p>
        {isProjected && (
            <p className="text-xs text-nexus-muted mt-1">Margem de erro: ±5%</p>
        )}
      </div>
    );
  }
  return null;
};

const Hero: React.FC = () => {
  return (
    <div id="platform" className="relative min-h-screen flex items-center justify-center pt-20 overflow-hidden bg-nexus-900">
      {/* Background Elements */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-nexus-accent/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-indigo-900/10 rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full grid lg:grid-cols-2 gap-12 items-center">
        
        {/* Left Column: Text */}
        <div className="text-center lg:text-left space-y-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-nexus-600 bg-nexus-800/50 backdrop-blur-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-nexus-accent opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-nexus-accent"></span>
            </span>
            <span className="text-xs font-mono text-nexus-muted uppercase tracking-wider">
              Active V2.0
            </span>
          </div>

          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-white leading-tight">
            Controle Absoluto <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-nexus-accent to-blue-600">
              da Prospecção
            </span>
          </h1>
          
          <p className="text-lg md:text-xl text-nexus-muted max-w-2xl mx-auto lg:mx-0 font-light leading-relaxed">
            Mapeie prospects, gerencie visitas e domine cada interação. A plataforma definitiva para transformar contatos em contratos com precisão cirúrgica.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
            <a href="https://crmgestor.vercel.app/login" className="group relative px-8 py-4 bg-nexus-accent text-nexus-900 font-bold text-sm rounded-lg overflow-hidden transition-all hover:shadow-[0_0_20px_rgba(0,212,255,0.4)]">
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"></div>
              <span className="relative flex items-center gap-2">
                COMECE AGORA (7 dias FREE)! <ArrowRight className="w-4 h-4" />
              </span>
            </a>
            <a href="#pricing" className="group relative px-8 py-4 bg-blue-500 text-white font-bold text-sm rounded-lg overflow-hidden transition-all hover:shadow-[0_0_20px_rgba(59,130,246,0.4)]">
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"></div>
              <span className="relative flex items-center gap-2">
                Planos e Preços
              </span>
            </a>
          </div>

          <div className="pt-8 flex items-center justify-center lg:justify-start gap-8 text-nexus-muted/60">
             <div className="flex items-center gap-2">
                <Map className="w-5 h-5" />
                <span className="text-xs font-mono uppercase">Field Ops</span>
             </div>
             <div className="flex items-center gap-2">
                <Crosshair className="w-5 h-5" />
                <span className="text-xs font-mono uppercase">Lead Intel</span>
             </div>
             <div className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                <span className="text-xs font-mono uppercase">Real-time Sync</span>
             </div>
          </div>
        </div>

        {/* Right Column: Graphic */}
        <div className="relative h-[400px] lg:h-[500px] w-full bg-nexus-800/30 rounded-2xl border border-nexus-600/50 backdrop-blur-md p-6 shadow-2xl overflow-hidden group">
            <div className="absolute inset-0 bg-grid-slate-800/[0.1] -z-10" />
            
            {/* Header of the chart card */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-sm font-semibold text-white">Volume de Prospecção</h3>
                    <p className="text-xs text-nexus-muted">Prospects Mapeados & Ativos (Q4)</p>
                </div>
                <div className="flex gap-2">
                     <span className="h-2 w-2 rounded-full bg-nexus-muted/30"></span>
                     <span className="h-2 w-2 rounded-full bg-nexus-muted/30"></span>
                </div>
            </div>

            {/* The Chart */}
            <ResponsiveContainer width="100%" height="85%">
              <AreaChart data={HERO_CHART_DATA}>
                <defs>
                  <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00D4FF" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#00D4FF" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorProjected" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#94A3B8" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#94A3B8" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1C2B45" vertical={false} />
                <XAxis 
                    dataKey="month" 
                    stroke="#475569" 
                    tick={{fill: '#64748B', fontSize: 12}} 
                    tickLine={false}
                    axisLine={false}
                />
                <YAxis 
                    stroke="#475569" 
                    tick={{fill: '#64748B', fontSize: 12}} 
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `${value}`}
                />
                <Tooltip content={<CustomTooltip />} cursor={{stroke: '#1C2B45', strokeWidth: 2}} />
                
                {/* Historical Data Area */}
                <Area 
                    type="monotone" 
                    dataKey="actual" 
                    stroke="#00D4FF" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorActual)" 
                />
                
                {/* Projected Data Area (Using a separate data key logic visually) */}
                {/* We map projections to connect from the last actual point */}
                <Area 
                    type="monotone" 
                    dataKey="projected" 
                    stroke="#94A3B8" 
                    strokeDasharray="5 5"
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorProjected)" 
                    connectNulls
                />
                
                <ReferenceLine x="Out" stroke="#475569" strokeDasharray="3 3" label={{ position: 'top',  value: 'Hoje', fill: '#94A3B8', fontSize: 10 }} />
              </AreaChart>
            </ResponsiveContainer>
            
            {/* Overlay detail */}
            <div className="absolute bottom-6 right-6 bg-nexus-900/90 border border-nexus-600 p-3 rounded-lg shadow-lg">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                    <span className="text-xs font-mono text-green-400">+32 Novos Prospects Hoje</span>
                </div>
            </div>
        </div>

      </div>
    </div>
  );
};

export default Hero;