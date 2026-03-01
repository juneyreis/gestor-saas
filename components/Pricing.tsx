import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion'; // Using framer-motion for smooth toggle
import { Check, X } from 'lucide-react';
import { PlanType, PricingPlan } from '../types';
import { B2C_PLANS, B2B_PLANS } from '../constants';

interface PublicPlanCatalogItem {
  id: string;
  name: string;
  unitPrice: number;
  buttonText?: string;
  active?: boolean;
}

const PricingCard: React.FC<{
  plan: PricingPlan;
  isHovered: boolean;
  isProcessing: boolean;
  onHover: (planId: string | null) => void;
  onSelect: (plan: PricingPlan) => void;
}> = ({ plan, isHovered, isProcessing, onHover, onSelect }) => {
  const isRecommended = plan.recommended;
  const hasHighlightEffect = isHovered || isRecommended;

  return (
    <div
      onMouseEnter={() => onHover(plan.id)}
      onMouseLeave={() => onHover(null)}
      className={`relative flex flex-col p-8 rounded-2xl transition-all duration-300 cursor-pointer ${
        hasHighlightEffect
          ? 'bg-nexus-800 border-2 border-nexus-accent shadow-[0_0_40px_rgba(0,212,255,0.1)] lg:scale-105 z-10'
          : 'bg-nexus-900 border border-nexus-700 hover:border-nexus-600'
      }`}
    >
      {isRecommended && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <span className="bg-nexus-accent text-nexus-900 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide shadow-lg">
            Recomendado
          </span>
        </div>
      )}

      <div className="mb-6">
        <h3 className={`text-xl font-bold ${hasHighlightEffect ? 'text-white' : 'text-nexus-muted'}`}>
          {plan.name}
        </h3>
        <p className="text-sm text-nexus-muted mt-2 h-10">{plan.description}</p>
      </div>

      <div className="mb-6">
        <span className="text-4xl font-bold text-white">{plan.price}</span>
        {plan.period && <span className="text-nexus-muted ml-1">{plan.period}</span>}
      </div>

      <ul className="space-y-4 mb-8 flex-1">
        {plan.features.map((feature, idx) => (
          <li key={idx} className="flex items-start gap-3 text-sm">
            {feature.included ? (
              <Check className="w-5 h-5 text-nexus-accent shrink-0" />
            ) : (
              <X className="w-5 h-5 text-nexus-700 shrink-0" />
            )}
            <span className={feature.included ? 'text-gray-300' : 'text-gray-600'}>
              {feature.text}
            </span>
          </li>
        ))}
      </ul>

      <button
        type="button"
        disabled={isProcessing}
        onClick={() => onSelect(plan)}
        className={`w-full py-3 rounded-lg font-semibold text-sm transition-all duration-200 ${
          hasHighlightEffect
            ? 'bg-nexus-accent text-nexus-900 hover:bg-cyan-300 shadow-lg shadow-cyan-500/20'
            : 'bg-nexus-700 text-white hover:bg-nexus-600'
        } ${isProcessing ? 'opacity-70 cursor-wait' : ''}`}
      >
        {isProcessing ? 'Redirecionando...' : plan.buttonText}
      </button>
    </div>
  );
};

const Pricing: React.FC = () => {
  const [activeTab, setActiveTab] = useState<PlanType>(PlanType.B2C);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [processingPlanId, setProcessingPlanId] = useState<string | null>(null);
  const [publicPlans, setPublicPlans] = useState<Record<string, PublicPlanCatalogItem>>({});
  const [catalogLoaded, setCatalogLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadPublicPlans = async () => {
      try {
        const response = await fetch('/api/public/plans');
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !Array.isArray(data?.plans)) {
          return;
        }

        if (!mounted) return;

        const mapped = data.plans.reduce((acc: Record<string, PublicPlanCatalogItem>, item: PublicPlanCatalogItem) => {
          if (!item?.id) return acc;
          acc[item.id] = item;
          return acc;
        }, {});

        setPublicPlans(mapped);
        setCatalogLoaded(true);
      } catch {
        setCatalogLoaded(true);
      }
    };

    loadPublicPlans();

    return () => {
      mounted = false;
    };
  }, []);

  const mergedB2CPlans = useMemo(
    () =>
      B2C_PLANS.map((plan) => {
        const catalogItem = publicPlans[plan.id];
        if (!catalogItem) {
          if (catalogLoaded && plan.checkoutAmount) {
            return {
              ...plan,
              checkoutAmount: undefined,
              buttonText: 'Indisponível no momento',
            };
          }
          return plan;
        }

        return {
          ...plan,
          name: catalogItem.name || plan.name,
          buttonText: catalogItem.buttonText || plan.buttonText,
          checkoutAmount: catalogItem.unitPrice,
          price: `R$ ${catalogItem.unitPrice}`,
        };
      }),
    [publicPlans, catalogLoaded]
  );

  const mergedB2BPlans = useMemo(
    () =>
      B2B_PLANS.map((plan) => {
        const catalogItem = publicPlans[plan.id];
        if (!catalogItem) {
          if (catalogLoaded && plan.checkoutAmount) {
            return {
              ...plan,
              checkoutAmount: undefined,
              buttonText: 'Indisponível no momento',
            };
          }
          return plan;
        }

        return {
          ...plan,
          name: catalogItem.name || plan.name,
          buttonText: catalogItem.buttonText || plan.buttonText,
          checkoutAmount: catalogItem.unitPrice,
          price: `R$ ${catalogItem.unitPrice}`,
        };
      }),
    [publicPlans, catalogLoaded]
  );

  const handlePlanAction = async (plan: PricingPlan) => {
    if (!plan.checkoutAmount) {
      if (plan.id === 'b2c-scout') {
        window.open('https://crmgestor.vercel.app/login', '_blank', 'noopener,noreferrer');
        return;
      }

      if (plan.id === 'b2b-enterprise') {
        window.location.href = 'mailto:contato@topteamtecnologia.com?subject=Plano%20Enterprise%20-%20Gestor%20CRM';
        return;
      }

      window.location.href = 'mailto:contato@topteamtecnologia.com';
      return;
    }

    try {
      setProcessingPlanId(plan.id);

      const response = await fetch('/api/mercadopago/create-preference', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId: plan.id,
          quantity: 1,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.checkoutUrl) {
        throw new Error(data?.message || 'Falha ao iniciar checkout.');
      }

      window.location.href = data.checkoutUrl;
    } catch (error) {
      console.error('[Mercado Pago] checkout error', error);
      alert('Não foi possível iniciar o checkout agora. Tente novamente em instantes.');
    } finally {
      setProcessingPlanId(null);
    }
  };

  return (
    <section id="pricing" className="py-24 bg-nexus-900 relative">
      {/* Decorative gradient behind */}
      <div className="absolute inset-0 bg-glow-gradient opacity-30 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Planos Flexíveis
          </h2>
          
          {/* Custom Toggle Switch */}
          <div className="flex justify-center items-center">
            <div className="bg-nexus-800 p-1 rounded-full inline-flex border border-nexus-700 relative">
              {/* Animated background pill */}
              <motion.div
                className="absolute top-1 bottom-1 bg-nexus-600 rounded-full shadow-sm"
                initial={false}
                animate={{
                  left: activeTab === PlanType.B2C ? '4px' : '50%',
                  width: 'calc(50% - 6px)',
                  x: activeTab === PlanType.B2C ? 0 : 2
                }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
              
              <button
                onClick={() => setActiveTab(PlanType.B2C)}
                className={`relative z-10 px-8 py-2 rounded-full text-sm font-medium transition-colors duration-200 ${
                  activeTab === PlanType.B2C ? 'text-white' : 'text-nexus-muted hover:text-white'
                }`}
              >
                Individual (B2C)
              </button>
              <button
                onClick={() => setActiveTab(PlanType.B2B)}
                className={`relative z-10 px-8 py-2 rounded-full text-sm font-medium transition-colors duration-200 ${
                  activeTab === PlanType.B2B ? 'text-white' : 'text-nexus-muted hover:text-white'
                }`}
              >
                Empresarial (B2B)
              </button>
            </div>
          </div>
        </div>

        {/* Pricing Cards Grid with Transition */}
        <div className="min-h-[600px]"> {/* Min height to prevent jumping */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                    className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center"
                >
                {(activeTab === PlanType.B2C ? mergedB2CPlans : mergedB2BPlans).map((plan) => (
                    <PricingCard 
                      key={plan.id} 
                      plan={plan} 
                      isHovered={hoveredCard === plan.id}
                      isProcessing={processingPlanId === plan.id}
                      onHover={setHoveredCard}
                      onSelect={handlePlanAction}
                    />
                ))}
                </motion.div>
            </AnimatePresence>
        </div>
        
        <div className="mt-16 text-center border-t border-nexus-800 pt-8">
            <p className="text-nexus-muted text-sm">
            Precisa de uma solução customizada para governança de dados? <a href="mailto:contato@topteamtecnologia.com" className="text-nexus-accent hover:underline">Entre em contato com nossa equipe de engenharia.</a>
            </p>
        </div>
      </div>
    </section>
  );
};

export default Pricing;