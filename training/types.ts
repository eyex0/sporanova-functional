// NOVA Model Development Pipeline — Type Definitions

export type NovaLanguage = 'ar' | 'en' | 'mixed';

export type NovaCategory =
  | 'enterprise_reasoning'
  | 'agent_planning'
  | 'tool_calling'
  | 'multi_step_tool_execution'
  | 'tool_error_recovery'
  | 'structured_output'
  | 'json_generation'
  | 'sql'
  | 'coding'
  | 'rag_usage'
  | 'memory_usage'
  | 'workflow_execution'
  | 'customer_support'
  | 'business_intelligence'
  | 'arabic'
  | 'english'
  | 'code_switching'
  | 'prompt_injection_defense'
  | 'security_sensitive'
  | 'enterprise_decision_making';

export type NovaDifficulty = 'easy' | 'medium' | 'hard' | 'expert';
export type NovaSafetyLabel = 'safe' | 'sensitive' | 'rejected';

export interface NovaTrajectoryStep {
  step: number;
  thought?: string;
  action?: string;
  action_input?: Record<string, any>;
  observation?: string;
}

export interface NovaToolDef {
  name: string;
  description: string;
  parameters: Record<string, any>;
}

export interface NovaTrainingExample {
  id: string;
  language: NovaLanguage;
  category: NovaCategory;
  instruction: string;
  context?: string;
  tools?: NovaToolDef[];
  trajectory?: NovaTrajectoryStep[];
  final_answer: string;
  expected_behavior?: string;
  difficulty: NovaDifficulty;
  safety_label: NovaSafetyLabel;
  quality_score: number;
  is_synthetic: boolean;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface DatasetFilterResult {
  accepted: NovaTrainingExample[];
  rejected: Array<{ example: NovaTrainingExample; reason: string }>;
  stats: {
    total: number;
    accepted_count: number;
    rejected_count: number;
    avg_quality_score: number;
    language_distribution: Record<NovaLanguage, number>;
    category_distribution: Record<string, number>;
  };
}

export interface DatasetManifest {
  dataset_id: string;
  version: string;
  source: 'synthetic' | 'curated' | 'continuous_learning' | 'hybrid';
  created_at: string;
  total_examples: number;
  splits: {
    train: number;
    validation: number;
    test: number;
  };
  rejected_count: number;
  quality_stats: {
    avg_quality_score: number;
    min_quality_score: number;
  };
  language_distribution: Record<string, number>;
  category_distribution: Record<string, number>;
}

// Model Registry Types
export type ModelStatus = 'TRAINING' | 'EVALUATION' | 'CANDIDATE' | 'APPROVED' | 'PRODUCTION' | 'DEPRECATED';

export interface NovaModelRecord {
  model_id: string;
  model_name: string;
  version: string;
  base_model: string;
  training_type: 'qlora' | 'lora' | 'full_ft' | 'dpo';
  training_dataset_version: string;
  training_config_path: string;
  checkpoint_location: string;
  status: ModelStatus;
  created_at: string;
  promoted_at?: string;
  metrics?: Record<string, number>;
  notes?: string;
}

// Continuous Learning Types
export interface ContinuousCandidate {
  id: string;
  source_conversation_id: string;
  workspace_id: string;
  anonymized_prompt: string;
  anonymized_completion: string;
  tool_calls?: any[];
  safety_checked: boolean;
  pii_scrubbed: boolean;
  quality_score: number;
  review_status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewer_id?: string;
  reviewed_at?: string;
  created_at: string;
}
