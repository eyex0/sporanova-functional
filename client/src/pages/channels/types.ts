export interface ChannelConfigField {
  key: string;
  label: string;
  type: "text" | "password" | "number" | "select" | "textarea" | "toggle";
  placeholder?: string;
  required?: boolean;
  options?: Array<{ label: string; value: string }>;
  description?: string;
}

export interface ChannelDefinition {
  id: string;
  name: string;
  description: string;
  category: "featured" | "messaging" | "support" | "integration" | "development" | "ecommerce";
  icon: string;
  accent: string;
  available: boolean;
  requiresConnection: boolean;
  isClientSide: boolean;
  configFields: ChannelConfigField[];
  actions: {
    connect?: boolean;
    disconnect?: boolean;
    configure?: boolean;
    send?: boolean;
    test?: boolean;
  };
  status: "available" | "coming_soon" | "beta";
  badge?: string;
  docsUrl?: string;
}

export interface ChannelWithState extends ChannelDefinition {
  configured: boolean;
  config: Record<string, unknown> | null;
  channelStatus: string;
  channelDbId: number | null;
  agentId: number | null;
  agent?: { id: number; name: string; status: string } | null;
}

export interface ChannelConfigDialogProps {
  channel: ChannelWithState;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export type ChannelActionState = "idle" | "loading" | "success" | "error" | "unauthorized";
