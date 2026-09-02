import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { channelsApi } from "@/lib/trpc";
import type { ChannelConfigDialogProps, ChannelConfigField } from "./types";
import { X, CheckCircle, AlertCircle, Loader2, Copy, ExternalLink } from "lucide-react";

export function ChannelConfigDialog({ channel, open, onClose, onSaved }: ChannelConfigDialogProps) {
  const { workspaceId } = useAuth();
  const queryClient = useQueryClient();

  // State
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedAgentId, setSelectedAgentId] = useState<number | null>(channel.agentId ?? null);
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [saveState, setSaveState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [copied, setCopied] = useState(false);

  // Fetch agents
  const { data: agents } = useQuery({
    queryKey: ["channels.agents", workspaceId],
    queryFn: () => channelsApi.agents({ workspaceId: workspaceId! }),
    enabled: !!workspaceId && open,
  });

  // Fetch embed code (for client-side and API channels)
  const showEmbedStep = channel.isClientSide || channel.id === "api";
  const { data: embedData } = useQuery({
    queryKey: ["channels.getEmbedCode", workspaceId, channel.id],
    queryFn: () => channelsApi.getEmbedCode({ workspaceId: workspaceId!, type: channel.id }),
    enabled: !!workspaceId && open && showEmbedStep && step === 3,
  });

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: channelsApi.configure,
    onSuccess: () => {
      setSaveState("success");
      queryClient.invalidateQueries({ queryKey: ["channels.list"] });
      setTimeout(() => {
        onSaved();
      }, 1500);
    },
    onError: (err: Error) => {
      setSaveState("error");
      setErrorMsg(err.message || "Failed to save configuration");
    },
  });

  // Disable mutation
  const disableMutation = useMutation({
    mutationFn: channelsApi.disable,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["channels.list"] });
      onSaved();
    },
  });

  // Initialize form data from existing config
  useEffect(() => {
    if (channel.config) {
      setFormData(channel.config);
      if (channel.agentId) setSelectedAgentId(channel.agentId);
    }
  }, [channel.config, channel.agentId]);

  // Reset step on open
  useEffect(() => {
    if (open) {
      setStep(1);
      setSaveState("idle");
    }
  }, [open]);

  if (!open) return null;

  const handleSave = () => {
    setSaveState("loading");
    saveMutation.mutate({
      workspaceId: workspaceId!,
      type: channel.id,
      agentId: selectedAgentId ?? undefined,
      configuration: formData,
      status: "active",
    });
  };

  const handleDisable = () => {
    disableMutation.mutate({
      workspaceId: workspaceId!,
      type: channel.id,
    });
  };

  const updateField = (key: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const copyEmbedCode = () => {
    const textToCopy = channel.id === "api" && embedData?.exampleCurl
      ? embedData.exampleCurl
      : embedData?.embedCode;
    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const agentList = (agents ?? []) as Array<{ id: number; name: string; status: string }>;
  const configFields = channel.configFields.filter((f) => f.key !== "agentId");
  const totalSteps = showEmbedStep ? 3 : 2;

  return (
    <div className="ch-dialog-overlay" onClick={onClose}>
      <div className="ch-dialog" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="ch-dialog-header">
          <h2>{channel.name} Configuration</h2>
          <button className="ch-dialog-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Steps indicator */}
        <div className="ch-dialog-steps">
          <div className={`ch-step ${step >= 1 ? "active" : ""}`}>
            <span>1</span> Agent
          </div>
          <div className={`ch-step ${step >= 2 ? "active" : ""}`}>
            <span>2</span> Configuration
          </div>
          <div className={`ch-step ${step >= totalSteps ? "active" : ""}`}>
            <span>3</span> {channel.id === "api" ? "API Endpoint" : "Embed"}
          </div>
        </div>

        {/* Step 1: Agent Selection */}
        {step === 1 && (
          <div className="ch-dialog-body">
            <h3>Select Agent</h3>
            <p className="ch-dialog-hint">Choose which AI agent will handle conversations on this channel.</p>
            <div className="ch-agent-list">
              {agentList.length === 0 ? (
                <div className="ch-no-agents">
                  <AlertCircle size={20} />
                  <p>No agents found. Create an agent first.</p>
                </div>
              ) : (
                agentList.map((agent) => (
                  <button
                    key={agent.id}
                    className={`ch-agent-option ${selectedAgentId === agent.id ? "selected" : ""}`}
                    onClick={() => setSelectedAgentId(agent.id)}
                  >
                    <div className="ch-agent-info">
                      <span className="ch-agent-name">{agent.name}</span>
                      <span className={`ch-agent-status ${agent.status}`}>{agent.status}</span>
                    </div>
                    {selectedAgentId === agent.id && <CheckCircle size={16} className="ch-agent-check" />}
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {/* Step 2: Configuration */}
        {step === 2 && (
          <div className="ch-dialog-body">
            <h3>Configure</h3>
            <p className="ch-dialog-hint">Customize how {channel.name} appears to your users.</p>
            <div className="ch-form">
              {configFields.map((field) => (
                <FormField
                  key={field.key}
                  field={field}
                  value={formData[field.key]}
                  onChange={(val) => updateField(field.key, val)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Embed / API Endpoint */}
        {step === 3 && showEmbedStep && (
          <div className="ch-dialog-body">
            <h3>{channel.id === "api" ? "API Endpoint" : "Embed Code"}</h3>
            <p className="ch-dialog-hint">
              {channel.id === "api"
                ? "Use this REST endpoint with your API key to send messages to your agent."
                : "Copy this code and paste it into your website."}
            </p>
            {channel.id === "api" && embedData?.endpoint ? (
              <div className="ch-api-info">
                <div className="ch-api-field">
                  <label>Endpoint</label>
                  <div className="ch-api-value"><code>{embedData.endpoint}</code></div>
                </div>
                <div className="ch-api-field">
                  <label>Method</label>
                  <div className="ch-api-value"><code>{embedData.method}</code></div>
                </div>
                <div className="ch-api-field">
                  <label>Headers</label>
                  <div className="ch-api-value"><code>{JSON.stringify(embedData.headers, null, 2)}</code></div>
                </div>
                <div className="ch-api-field">
                  <label>Body</label>
                  <div className="ch-api-value"><code>{JSON.stringify(embedData.body, null, 2)}</code></div>
                </div>
                <div className="ch-api-field">
                  <label>Example (cURL)</label>
                  <div className="ch-embed-code">
                    <pre>{embedData.exampleCurl}</pre>
                    <button className="ch-copy-btn" onClick={copyEmbedCode}>
                      <Copy size={14} /> {copied ? "Copied!" : "Copy"}
                    </button>
                  </div>
                </div>
              </div>
            ) : embedData?.embedCode ? (
              <div className="ch-embed-code">
                <pre>{embedData.embedCode}</pre>
                <button className="ch-copy-btn" onClick={copyEmbedCode}>
                  <Copy size={14} /> {copied ? "Copied!" : "Copy"}
                </button>
              </div>
            ) : (
              <p className="ch-no-embed">Save the configuration first to generate the embed code.</p>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="ch-dialog-footer">
          {step > 1 && (
            <button className="ch-btn ch-btn-back" onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3)}>
              Back
            </button>
          )}

          {channel.channelStatus === "active" && (
            <button
              className="ch-btn ch-btn-disable"
              onClick={handleDisable}
              disabled={disableMutation.isPending}
            >
              Disconnect
            </button>
          )}

          <div className="ch-dialog-footer-right">
            {step < totalSteps ? (
              <button
                className="ch-btn ch-btn-next"
                onClick={() => setStep((s) => (s + 1) as 1 | 2 | 3)}
                disabled={step === 1 && !selectedAgentId}
              >
                Next
              </button>
            ) : (
              <button
                className="ch-btn ch-btn-save"
                onClick={handleSave}
                disabled={saveState === "loading" || saveState === "success"}
              >
                {saveState === "loading" && <Loader2 size={14} className="spin" />}
                {saveState === "success" && <CheckCircle size={14} />}
                {saveState === "idle" && "Save Configuration"}
                {saveState === "loading" && "Saving..."}
                {saveState === "success" && "Saved!"}
                {saveState === "error" && "Retry"}
              </button>
            )}
          </div>
        </div>

        {/* Error state */}
        {saveState === "error" && (
          <div className="ch-dialog-error">
            <AlertCircle size={14} />
            {errorMsg}
          </div>
        )}
      </div>
    </div>
  );
}

/* ──────── Form Field Component ──────── */

function FormField({
  field,
  value,
  onChange,
}: {
  field: ChannelConfigField;
  value: unknown;
  onChange: (val: unknown) => void;
}) {
  const strValue = value != null ? String(value) : "";

  if (field.type === "select" && field.options) {
    return (
      <div className="ch-form-field">
        <label>
          {field.label}
          {field.required && <span className="ch-required">*</span>}
        </label>
        {field.description && <p className="ch-field-desc">{field.description}</p>}
        <select value={strValue} onChange={(e) => onChange(e.target.value)}>
          <option value="">Select...</option>
          {field.options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    );
  }

  if (field.type === "textarea") {
    return (
      <div className="ch-form-field">
        <label>
          {field.label}
          {field.required && <span className="ch-required">*</span>}
        </label>
        {field.description && <p className="ch-field-desc">{field.description}</p>}
        <textarea
          value={strValue}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
        />
      </div>
    );
  }

  return (
    <div className="ch-form-field">
      <label>
        {field.label}
        {field.required && <span className="ch-required">*</span>}
      </label>
      {field.description && <p className="ch-field-desc">{field.description}</p>}
      <input
        type={field.type === "password" ? "password" : field.type === "number" ? "number" : "text"}
        value={strValue}
        placeholder={field.placeholder}
        onChange={(e) => onChange(field.type === "number" ? Number(e.target.value) : e.target.value)}
      />
    </div>
  );
}
