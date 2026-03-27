export interface User {
  id: string;
  email: string;
  full_name: string;
  date_of_birth: string;
  created_at: string;
}

export interface Token {
  access_token: string;
  token_type: string;
}

export interface FinancialProfile {
  id: string;
  user_id: string;
  monthly_income: number;
  monthly_expenses: number;
  monthly_savings: number;
  total_liabilities: number;
  emergency_fund_months: number;
  existing_investments: Record<string, boolean>;
  life_stage: string;
  dependents_count: number;
  investment_horizon_years: number;
  investment_experience: string;
  loss_tolerance: string;
  created_at: string;
  updated_at: string;
}

export interface RiskAssessment {
  id: string;
  user_id: string;
  financial_profile_id: string;
  overall_score: number;
  risk_category: string;
  spending_ratio_score: number;
  savings_consistency_score: number;
  investment_discipline_score: number;
  liability_burden_score: number;
  life_stage_modifier: number;
  score_breakdown: {
    weights: Record<string, number>;
    raw_weighted_score: number;
    life_stage: string;
    investment_horizon_years: number;
    sub_scores: Record<string, number>;
  };
  created_at: string;
}

export interface PortfolioAllocation {
  id: string;
  asset_class: string;
  allocation_pct: number;
  expected_return_min: number | null;
  expected_return_max: number | null;
  rationale: string | null;
}

export interface Portfolio {
  id: string;
  user_id: string;
  risk_assessment_id: string;
  name: string;
  expected_return_min: number;
  expected_return_max: number;
  allocations: PortfolioAllocation[];
  created_at: string;
}

export interface QuestionOption {
  value: string;
  label: string;
}

export interface Question {
  id: string;
  step: number;
  text: string;
  type: string;
  options: QuestionOption[];
  required: boolean;
  show_if: Record<string, string> | null;
}
