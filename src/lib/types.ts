export const EXPENSE_CATEGORIES = [
  "casa",
  "svago",
  "uscite",
  "cibo",
  "trasporti",
  "salute",
  "altro",
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const PRIORITIES = ["bassa", "media", "alta"] as const;
export type Priority = (typeof PRIORITIES)[number];

export const RISKS = ["basso", "medio", "alto"] as const;
export type Risk = (typeof RISKS)[number];

export type DebtDirection = "debito" | "credito";
export type AmountKind = "stimato" | "attuale";

export type LedgerEntry = {
  id: string;
  direction: DebtDirection;
  person: string;
  amount: number;
  dueDate?: string;
  notes?: string;
  settled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Expense = {
  id: string;
  amount: number;
  category: ExpenseCategory;
  date: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type InvestmentIdea = {
  id: string;
  title: string;
  amount: number;
  amountKind: AmountKind;
  priority: Priority;
  risk: Risk;
  notes?: string;
  link?: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
};

export type PiggyBank = {
  id: string;
  name: string;
  target: number;
  current: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type UserAccount = {
  id: string;
  name: string;
  username: string;
  createdAt: string;
};

export type AppData = {
  version: 1;
  ledger: LedgerEntry[];
  expenses: Expense[];
  ideas: InvestmentIdea[];
  piggyBanks: PiggyBank[];
};

export type ListKind = "tutti" | "debiti" | "crediti" | "spese" | "idee";
export type StatusFilter = "aperti" | "chiusi" | "tutti";

export const STORAGE_KEY = "expnstracker.v1";
export const SESSION_KEY = "expnstracker.session";
export const INSTALL_DISMISS_KEY = "expnstracker.install-dismissed";

export const emptyData = (): AppData => ({
  version: 1,
  ledger: [],
  expenses: [],
  ideas: [],
  piggyBanks: [],
});
