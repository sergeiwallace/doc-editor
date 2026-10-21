export declare const CLAUDE_FLOOR: string;

export interface ClaudeStatus {
  usable: boolean;
  reason?: string;
  version?: string;
}

export declare function claudeStatus(): ClaudeStatus;

export declare function requireClaude(gate: string, what: string): ClaudeStatus;
