import {
  MessageCircle,
  FileText,
  MonitorPlay,
  Mail,
  ShoppingBag,
  Phone,
  MessageSquare,
  LifeBuoy,
  Cloud,
  Hash,
  Globe,
  Code,
  Zap,
  Smartphone,
} from "lucide-react";

type IntegrationType =
  | "widget"
  | "help_page"
  | "center_stage"
  | "messenger"
  | "whatsapp"
  | "instagram"
  | "slack"
  | "email"
  | "sms"
  | "voice"
  | "shopify"
  | "zendesk"
  | "salesforce"
  | "wordpress"
  | "zapier"
  | "api"
  | "android-sdk"
  | "ios-sdk"
  | string;

interface IntegrationIconProps {
  type: IntegrationType;
  size?: number;
  className?: string;
}

const BrandSvgs: Record<string, React.FC<{ size?: number; className?: string }>> = {
  whatsapp: ({ size = 20, className }) => (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  ),
  instagram: ({ size = 20, className }) => (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
    </svg>
  ),
  slack: ({ size = 20, className }) => (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="currentColor">
      <path d="M5.042 15.165a2.528 2.528 0 01-2.52 2.523A2.528 2.528 0 010 15.165a2.527 2.527 0 012.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 012.521-2.52 2.527 2.527 0 012.521 2.52v6.313A2.528 2.528 0 018.834 24a2.528 2.528 0 01-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 01-2.521-2.52A2.528 2.528 0 018.834 0a2.528 2.528 0 012.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 012.521 2.521 2.528 2.528 0 01-2.521 2.521H2.522A2.528 2.528 0 010 8.834a2.528 2.528 0 012.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 012.522-2.521A2.528 2.528 0 0124 8.834a2.528 2.528 0 01-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 01-2.523 2.521 2.527 2.527 0 01-2.52-2.521V2.522A2.527 2.527 0 0115.165 0a2.528 2.528 0 012.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 012.523 2.522A2.528 2.528 0 0115.165 24a2.527 2.527 0 01-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 01-2.52-2.523 2.526 2.526 0 012.52-2.52h6.313A2.527 2.527 0 0124 15.165a2.528 2.528 0 01-2.522 2.523h-6.313z" />
    </svg>
  ),
  messenger: ({ size = 20, className }) => (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="currentColor">
      <path d="M12 0C5.373 0 0 4.974 0 11.111c0 3.498 1.744 6.614 4.469 8.654V24l4.088-2.242c1.092.3 2.246.464 3.443.464 6.627 0 12-4.975 12-11.111C24 4.974 18.627 0 12 0zm1.191 14.963l-3.055-3.26-5.963 3.26L10.732 8.2l3.131 3.259L19.752 8.2l-6.561 6.763z" />
    </svg>
  ),
  shopify: ({ size = 20, className }) => (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="currentColor">
      <path d="M15.337 23.979l7.216-1.378c.576-.111 1.036-.509 1.196-1.062l3.894-14.625c.185-.689-.158-1.413-.848-1.764-.689-.352-1.533-.258-2.12.235l-5.393 4.398-5.904-4.475c-.262-.199-.574-.302-.887-.302-.547 0-1.063.317-1.312.832l-3.628 7.56-4.044-1.265c-.769-.241-1.591.169-1.97.912-.379.744-.176 1.625.487 2.102l3.155 2.292-1.143 4.352c-.134.512.071 1.048.508 1.362.204.146.436.217.666.217.281 0 .555-.105.767-.304l2.311-2.16 4.193 3.087c.258.191.556.295.859.295.073 0 .146-.006.218-.02l7.434-1.457c.509-.1.885-.539.922-1.048.037-.51-.177-.991-.561-1.284l-3.928-2.99-4.063-3.115-.003-.001-3.062-2.342 3.381-6.994 4.189 3.255 5.355 4.137c.526.407.642 1.167.262 1.724l-2.808 4.132-.762 1.122.876.667 3.633 2.789c.198.152.313.398.308.655-.005.258-.129.5-.343.664l-7.345 5.619-.038.009z" />
    </svg>
  ),
  zendesk: ({ size = 20, className }) => (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="currentColor">
      <path d="M12.7 17.5L7.2 2h4.8l3.1 10.5L17.3 2h4.8L16.6 17.5 22 22h-4.8l-3.3-11.2L10.6 22H5.8l6.9-4.5zM5.8 2l-4.8 5.5h4.6L5.8 2z" />
    </svg>
  ),
  salesforce: ({ size = 20, className }) => (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="currentColor">
      <path d="M10.006 5.415a4.195 4.195 0 013.045-1.31c1.56 0 2.954.9 3.69 2.205a4.79 4.79 0 011.95-.42c2.648 0 4.809 2.16 4.809 4.815 0 2.655-2.16 4.815-4.81 4.815-.27 0-.54-.03-.795-.075a3.555 3.555 0 01-3.195 1.98c-.57 0-1.11-.15-1.575-.405a4.47 4.47 0 01-4.11 2.685c-2.43 0-4.41-1.98-4.41-4.41 0-1.875 1.17-3.48 2.82-4.125a4.44 4.44 0 01-.63-2.58c0-2.475 2.01-4.485 4.485-4.485.87 0 1.695.255 2.385.69z" />
    </svg>
  ),
  wordpress: ({ size = 20, className }) => (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="currentColor">
      <path d="M12 2C6.486 2 2 6.486 2 12s4.486 10 10 10 10-4.486 10-10S17.514 2 12 2zM3.012 12c0-1.162.242-2.264.667-3.257L7.74 19.563A8.99 8.99 0 013.012 12zm8.988 9c-.96 0-1.89-.136-2.766-.387l2.938-8.549 3.013 8.259a.68.68 0 00.045.096A8.94 8.94 0 0112 21zm1.35-13.29l-2.74 7.577-3.034-8.358a9.02 9.02 0 015.774.781zm5.163 2.29c.24.657.374 1.358.374 2.09 0 .733-.135 1.435-.375 2.093l-3.6 10.459A8.987 8.987 0 0020.988 12c0-.693-.093-1.363-.263-2.001l-2.4-2.71.001-.001-.001.001z" />
    </svg>
  ),
  zapier: ({ size = 20, className }) => (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="currentColor">
      <path d="M12 0L4.688 8.375l3.344.063L7.063 16H16.5l-3.438-7.563h4.063L12 0zM12 24l7.313-8.375-3.344-.063L16.938 8H7.5l3.438 7.563H6.875L12 24z" />
    </svg>
  ),
};

const LucideFallbacks: Record<string, React.FC<{ size?: number; className?: string }>> = {
  widget: MessageCircle,
  help_page: FileText,
  center_stage: MonitorPlay,
  email: Mail,
  sms: MessageSquare,
  voice: Phone,
  api: Code,
  "android-sdk": Smartphone,
  "ios-sdk": Smartphone,
};

const ColorMap: Record<string, string> = {
  whatsapp: "#25D366",
  instagram: "#E1306C",
  messenger: "#0084FF",
  slack: "#4A154B",
  shopify: "#96BF48",
  zendesk: "#03363D",
  salesforce: "#00A1E0",
  wordpress: "#21759B",
  zapier: "#FF4A00",
  email: "#3B82F6",
  sms: "#F97316",
  voice: "#8B5CF6",
  widget: "#3446DF",
  help_page: "#6366F1",
  center_stage: "#059669",
  api: "#6366F1",
  "android-sdk": "#3DDC84",
  "ios-sdk": "#007AFF",
};

export function IntegrationIcon({ type, size = 20, className = "" }: IntegrationIconProps) {
  const BrandSvg = BrandSvgs[type];
  const LucideIcon = LucideFallbacks[type];
  const color = ColorMap[type] || "#6B7280";

  if (BrandSvg) {
    return <span style={{ color, display: "inline-flex", alignItems: "center" }} className={className}><BrandSvg size={size} /></span>;
  }
  if (LucideIcon) {
    return <span style={{ color, display: "inline-flex", alignItems: "center" }} className={className}><LucideIcon size={size} /></span>;
  }
  return <span style={{ color, display: "inline-flex", alignItems: "center" }} className={className}><Globe size={size} /></span>;
}

export function getIntegrationColor(type: string): string {
  return ColorMap[type] || "#6B7280";
}
