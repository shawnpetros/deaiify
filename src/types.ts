export interface DeAIifyConfig {
  enabled: boolean;
  maxRetries: number;
  channels: string[];
  correctionPrompt: string;
}

export interface DeAIifyState {
  retryCount: number;
  pendingCorrection: boolean;
}
