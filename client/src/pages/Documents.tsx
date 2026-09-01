import { useRef, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { documentsApi } from "@/lib/trpc";
import {
  FileText,
  Upload,
  Trash2,
  ExternalLink,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Clock3,
} from "lucide-react";
import { toast } from "sonner";
import "./SimplePage.css";

interface DocumentRow {
  id: number;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  status: "uploading" | "processing" | "ready" | "failed" | "deleted";
  processingError?: string | null;
  storageUrl?: string | null;
  createdAt: string;
}

const ACCEPTED_MIME = ["application/pdf", "text/csv", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"];
const ACCEPTED_EXT = [".pdf", ".csv", ".docx", ".xlsx"];
const MAX_BYTES = 10 * 1024 * 1024;

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function statusBadge(status: DocumentRow["status"]) {
  switch (status) {
    case "ready": return { icon: <CheckCircle2 size={12} />, label: "Ready", className: "sp-badge sp-badge--ok" };
    case "processing": return { icon: <Loader2 size={12} className="sp-spin" />, label: "Processing", className: "sp-badge sp-badge--warn" };
    case "failed": return { icon: <AlertCircle size={12} />, label: "Failed", className: "sp-badge sp-badge--err" };
    case "deleted": return { icon: <Trash2 size={12} />, label: "Deleted", className: "sp-badge" };
    default: return { icon: <Clock3 size={12} />, label: "Uploading", className: "sp-badge" };
  }
}

export default function Documents() {
  const { workspaceId } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [previewing, setPreviewing] = useState<{ name: string; url: string; mimeType: string } | null>(null);

  const { data: documents, isLoading } = useQuery({
    queryKey: ["documents.list", workspaceId],
    queryFn: () => documentsApi.list({ workspaceId: workspaceId! }) as Promise<DocumentRow[]>,
    enabled: !!workspaceId,
  });

  const upload = useMutation({
    mutationFn: (file: { originalName: string; mimeType: string; dataBase64: string }) =>
      documentsApi.upload({ workspaceId: workspaceId!, ...file }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents.list"] });
      toast.success("Document uploaded — processing has started");
    },
    onError: (err: Error) => toast.error(err.message ?? "Upload failed"),
  });

  const remove = useMutation({
    mutationFn: documentsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents.list"] });
      toast.success("Document deleted");
    },
    onError: () => toast.error("Failed to delete document"),
  });

  const handleFile = useCallback(async (file: File) => {
    if (file.size > MAX_BYTES) {
      toast.error("File is larger than 10 MB");
      return;
    }
    if (!ACCEPTED_MIME.includes(file.type) && !ACCEPTED_EXT.some((ext) => file.name.toLowerCase().endsWith(ext))) {
      toast.error("Unsupported file type. Use PDF, DOCX, XLSX, or CSV.");
      return;
    }
    const arrayBuffer = await file.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    upload.mutate({ originalName: file.name, mimeType: file.type || "application/octet-stream", dataBase64: base64 });
  }, [upload]);

  const onDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragOver(false);
    const file = event.dataTransfer.files?.[0];
    if (file) void handleFile(file);
  }, [handleFile]);

  const onDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragOver(true);
  }, []);

  const onDragLeave = useCallback(() => setDragOver(false), []);

  const openDocument = async (doc: DocumentRow) => {
    try {
      const result = await documentsApi.accessUrl({ workspaceId: workspaceId!, documentId: doc.id }) as { url: string };
      setPreviewing({ name: doc.originalName, url: result.url, mimeType: doc.mimeType });
    } catch (err) {
      toast.error("Cannot generate preview link — document may not be ready yet");
    }
  };

  const documentList: DocumentRow[] = Array.isArray(documents) ? documents : [];

  return (
    <div className="sp-page">
      <header className="sp-page-header">
        <div>
          <h1>Documents</h1>
          <p className="sp-subtitle">Upload PDFs, Word documents, spreadsheets, and CSVs to ground your agents in your own knowledge.</p>
        </div>
        <button className="sp-btn sp-btn--primary" onClick={() => fileInputRef.current?.click()}>
          <Upload size={16} /> Upload
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.csv,.docx,.xlsx"
          style={{ display: "none" }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
            e.target.value = "";
          }}
        />
      </header>

      <div
        className={`sp-dropzone${dragOver ? " sp-dropzone--over" : ""}`}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={() => fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
      >
        <Upload size={32} />
        <p className="sp-dropzone-title">Drag and drop a file here, or click to browse</p>
        <p className="sp-dropzone-hint">PDF, DOCX, XLSX, CSV · up to 10 MB</p>
        {upload.isPending && <p className="sp-dropzone-uploading">Uploading…</p>}
      </div>

      <section className="sp-section">
        <h2>Uploaded documents</h2>
        {isLoading ? (
          <div className="sp-loading">Loading…</div>
        ) : documentList.length === 0 ? (
          <div className="sp-empty">
            <FileText size={40} />
            <p>No documents yet. Upload your first one above.</p>
          </div>
        ) : (
          <div className="sp-table-wrap">
            <table className="sp-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Size</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Uploaded</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {documentList.map((doc) => {
                  const badge = statusBadge(doc.status);
                  return (
                    <tr key={doc.id}>
                      <td className="sp-cell--strong">
                        <FileText size={14} /> {doc.originalName}
                      </td>
                      <td>{formatSize(doc.sizeBytes)}</td>
                      <td>{doc.mimeType}</td>
                      <td>
                        <span className={badge.className}>
                          {badge.icon} {badge.label}
                        </span>
                      </td>
                      <td>{new Date(doc.createdAt).toLocaleString()}</td>
                      <td>
                        <div className="sp-row-actions">
                          <button
                            className="sp-icon-btn"
                            title="Open"
                            onClick={() => openDocument(doc)}
                            disabled={doc.status !== "ready"}
                          >
                            <ExternalLink size={14} />
                          </button>
                          <button
                            className="sp-icon-btn sp-icon-btn--danger"
                            title="Delete"
                            onClick={() => {
                              if (confirm(`Delete "${doc.originalName}"?`)) {
                                remove.mutate({ workspaceId: workspaceId!, documentId: doc.id });
                              }
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {previewing && (
        <div className="sp-modal-backdrop" onClick={() => setPreviewing(null)}>
          <div className="sp-modal sp-modal--wide" onClick={(e) => e.stopPropagation()}>
            <h2>{previewing.name}</h2>
            <p className="sp-modal-sub">Preview is open in a signed URL. Close this dialog when you are done.</p>
            <div className="sp-modal-actions">
              <a href={previewing.url} target="_blank" rel="noreferrer" className="sp-btn sp-btn--primary">
                <ExternalLink size={14} /> Open in new tab
              </a>
              <button className="sp-btn" onClick={() => setPreviewing(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
