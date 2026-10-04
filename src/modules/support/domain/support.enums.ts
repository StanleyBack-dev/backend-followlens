export enum SupportCategory {
  DOUBT = "doubt",
  TECHNICAL_ISSUE = "technical_issue",
  SUGGESTION = "suggestion",
  BILLING = "billing",
  OTHER = "other",
}

export enum SupportTicketStatus {
  OPEN = "open",
  /** The team replied; the ticket can now be finalized. */
  ANSWERED = "answered",
  RESOLVED = "resolved",
}

export const SUPPORT_CATEGORY_LABELS: Record<SupportCategory, string> = {
  [SupportCategory.DOUBT]: "Dúvida",
  [SupportCategory.TECHNICAL_ISSUE]: "Problema técnico / Bug",
  [SupportCategory.SUGGESTION]: "Sugestão",
  [SupportCategory.BILLING]: "Financeiro / Cobrança",
  [SupportCategory.OTHER]: "Outro",
};

/** How the protocol is written everywhere: #000042. */
export function formatProtocol(protocolNumber: number): string {
  return `#${String(protocolNumber).padStart(6, "0")}`;
}
