import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { apiKeysApi } from "@/lib/trpc";
import { Key, Plus, Trash2, Copy, Eye, EyeOff, Clock, Shield } from "lucide-react";
import { toast } from "sonner";
import "./ApiKeys.css";

type ApiKey = {
  id: number;
  name: string;
  keyPrefix: string;
  scopes: string[];
  rateLimit: number;
  expiresAt: string | null;
  lastUsedAt: string | null;
  isActive: boolean;
  createdAt: string;
};

export default function ApiKeys() {
  const { workspaceId } = useAuth();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newExpiry, setNewExpiry] = useState<string>("never");
  const [newRateLimit, setNewRateLimit] = useState("60");
  const [revealedKey, setRevealedKey] = useState<string | null>(null);

  const { data: keys, isLoading } = useQuery({
    queryKey: ["apiKeys.list", workspaceId],
    queryFn: () => apiKeysApi.list(),
    enabled: !!workspaceId,
  });

  const create = useMutation({
    mutationFn: apiKeysApi.create,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["apiKeys.list"] });
      setRevealedKey(data.key);
      setShowCreate(false);
      setNewName("");
      toast.success("API key created — copy it now, it won't be shown again");
    },
    onError: () => toast.error("Failed to create API key"),
  });

  const revoke = useMutation({
    mutationFn: apiKeysApi.revoke,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["apiKeys.list"] });
      toast.success("API key revoked");
    },
    onError: () => toast.error("Failed to revoke API key"),
  });

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const handleCreate = () => {
    if (!newName.trim()) return;
    create.mutate({
      name: newName.trim(),
      expiresInDays: newExpiry === "never" ? undefined : Number(newExpiry),
      rateLimit: Number(newRateLimit),
    });
  };

  const keyList = (keys as ApiKey[] | undefined) ?? [];

  return (
    <div className="apikeys-page">
      <header className="apikeys-header">
        <div>
          <h1>API Keys</h1>
          <p>Manage API keys for external integrations and SDK access</p>
        </div>
        <button className="ak-btn ak-btn-primary" onClick={() => setShowCreate(true)}>
          <Plus size={14} /> Create Key
        </button>
      </header>

      {/* Reveal banner */}
      {revealedKey && (
        <div className="ak-reveal-banner">
          <div className="ak-reveal-content">
            <Key size={16} />
            <div>
              <strong>Your new API key</strong>
              <p>Copy this key now. You won't be able to see it again.</p>
            </div>
            <code className="ak-reveal-key">{revealedKey}</code>
            <button className="ak-btn ak-btn-ghost" onClick={() => handleCopy(revealedKey)}>
              <Copy size={12} /> Copy
            </button>
            <button className="ak-btn ak-btn-ghost" onClick={() => setRevealedKey(null)}>
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Key list */}
      <div className="ak-table-wrapper">
        {isLoading ? (
          <div className="ak-empty">Loading API keys...</div>
        ) : keyList.length === 0 ? (
          <div className="ak-empty-state">
            <Key size={40} />
            <h3>No API keys yet</h3>
            <p>Create an API key to access SOPRANOVA from external services.</p>
          </div>
        ) : (
          <table className="ak-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Key</th>
                <th>Scopes</th>
                <th>Rate Limit</th>
                <th>Expires</th>
                <th>Last Used</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {keyList.map((k) => (
                <tr key={k.id}>
                  <td>
                    <div className="ak-name">
                      <Shield size={14} />
                      {k.name}
                    </div>
                  </td>
                  <td>
                    <code className="ak-prefix">{k.keyPrefix}...</code>
                  </td>
                  <td>
                    <span className="ak-scopes">{k.scopes?.join(", ") ?? "*"}</span>
                  </td>
                  <td>{k.rateLimit}/min</td>
                  <td>
                    {k.expiresAt ? (
                      <span className="ak-expiry">
                        <Clock size={12} />
                        {new Date(k.expiresAt).toLocaleDateString()}
                      </span>
                    ) : (
                      <span className="ak-never">Never</span>
                    )}
                  </td>
                  <td>
                    {k.lastUsedAt ? (
                      new Date(k.lastUsedAt).toLocaleDateString()
                    ) : (
                      <span className="ak-never">Never</span>
                    )}
                  </td>
                  <td>
                    <button
                      className="ak-btn ak-btn-danger"
                      onClick={() => {
                        if (confirm(`Revoke key "${k.name}"?`)) {
                          revoke.mutate({ keyId: k.id });
                        }
                      }}
                    >
                      <Trash2 size={12} /> Revoke
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="ak-modal-backdrop" onClick={() => setShowCreate(false)}>
          <div className="ak-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Create API Key</h2>
            <div className="ak-form">
              <div className="ak-form-row">
                <label>Name</label>
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Production Backend"
                  autoFocus
                />
              </div>
              <div className="ak-form-row">
                <label>Expiration</label>
                <select value={newExpiry} onChange={(e) => setNewExpiry(e.target.value)}>
                  <option value="never">Never</option>
                  <option value="30">30 days</option>
                  <option value="90">90 days</option>
                  <option value="180">180 days</option>
                  <option value="365">1 year</option>
                </select>
              </div>
              <div className="ak-form-row">
                <label>Rate Limit (requests/min)</label>
                <input
                  type="number"
                  value={newRateLimit}
                  onChange={(e) => setNewRateLimit(e.target.value)}
                  min="1"
                  max="10000"
                />
              </div>
            </div>
            <div className="ak-modal-actions">
              <button className="ak-btn ak-btn-cancel" onClick={() => setShowCreate(false)}>Cancel</button>
              <button
                className="ak-btn ak-btn-primary"
                disabled={!newName.trim() || create.isPending}
                onClick={handleCreate}
              >
                {create.isPending ? "Creating..." : "Create Key"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
