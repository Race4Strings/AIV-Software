export interface DiscoveryStepProps {
  discoveryInput: string;
  setDiscoveryInput: (v: string) => void;
  loading: boolean;
  isManager: boolean;
  startDiscovery: () => void;
}

export interface ReviewStepProps {
  sessionId: string;
  twinId: string;
  discoveryInput: string;
  discoveryResults: Record<string, unknown> | null;
  discoveryPolling: boolean;
  discoveryStage: number;
  isMockData: boolean;
  profileDraft: { display_name: string; bio: string };
  loading: boolean;
  setStep: (step: number) => void;
  setLoading: (v: boolean) => void;
  setProfileDraft: (v: { display_name: string; bio: string }) => void;
  setDiscoveryResults: (v: Record<string, unknown> | null) => void;
  onSkipDiscovery?: () => void;
}

export interface AssetsStepProps {
  sessionId: string;
  files: File[];
  setFiles: (v: File[] | ((prev: File[]) => File[])) => void;
  setStep: (step: number) => void;
}

export interface ConsentsStepProps {
  sessionId: string;
  discoveryResults: Record<string, unknown> | null;
  selectedCategories: string[];
  setSelectedCategories: (v: string[] | ((prev: string[]) => string[])) => void;
  cloneType: string;
  setCloneType: (v: string) => void;
  consents: Record<string, boolean>;
  setConsents: (v: Record<string, boolean> | ((prev: Record<string, boolean>) => Record<string, boolean>)) => void;
  profileDraft: { display_name: string; bio: string };
  isManager: boolean;
  loading: boolean;
  setLoading: (v: boolean) => void;
  setStep: (step: number) => void;
}

export interface AuthorizeStepProps {
  sessionId: string;
  profileDraft: { display_name: string; bio: string };
  cloneType: string;
  consents: Record<string, boolean>;
  files: File[];
  discoveryResults: Record<string, unknown> | null;
  isMockData: boolean;
  isManager: boolean;
  loading: boolean;
  setLoading: (v: boolean) => void;
  setStep: (step: number) => void;
  setAuthorized: (v: boolean) => void;
  setShowButtons: (v: boolean) => void;
}

export interface CompleteStepProps {
  isManager: boolean;
  showButtons: boolean;
  profileDraft: { display_name: string; bio: string };
}
