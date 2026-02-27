import { LucideIcon } from 'lucide-react';

export interface NavItem {
  label: string;
  href: string;
}

export enum PlanType {
  B2C = 'B2C',
  B2B = 'B2B',
}

export interface Feature {
  text: string;
  included: boolean;
}

export interface PricingPlan {
  id: string;
  name: string;
  price: string;
  period: string;
  description: string;
  features: Feature[];
  recommended?: boolean;
  buttonText: string;
}

export interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

export interface ChartDataPoint {
  month: string;
  actual: number;
  projected: number | null;
  range: [number, number];
}