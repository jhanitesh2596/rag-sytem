import { useCallback, useEffect, useMemo, useState } from "react";
import "./App.css";

const DEFAULT_WORKSPACE_ID = 2;

function useApiBase() {
  return import.meta.env.VITE_API_BASE ?? "";
}

async function parseJson(res) {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { _raw: text };
  }
}

export default function App() {
  const apiBase = useApiBase();
  const api = useMemo(
    () => (path) => `${apiBase}${path.startsWith("/") ? path : `/${path}`}`,
    [apiBase],
  );

  const [banner, setBanner] = useState(null);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [files, setFiles] = useState([]);
  const [connecting, setConnecting] = useState(false);
  const [embeddingId, setEmbeddingId] = useState(null);
  const [indexModalFile, setIndexModalFile] = useState(null);
  const [indexModalWorkspace, setIndexModalWorkspace] = useState("");
  const [question, setQuestion] = useState("");
  const [workspaceId, setWorkspaceId] = useState(String(DEFAULT_WORKSPACE_ID));
  const [answer, setAnswer] = useState("");
  const [asking, setAsking] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");
  const [googleConnected, setGoogleConnected] = useState(null);

  const refreshGoogleStatus = useCallback(async () => {
    try {
      const res = await fetch(api("/api/auth/google-status"));
      const data = await parseJson(res);
      setGoogleConnected(res.ok ? Boolean(data?.connected) : false);
    } catch {
      setGoogleConnected(false);
    }
  }, [api]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const google = params.get("google");
    if (google === "connected") {
      setBanner({ type: "success", text: "Google account connected. You can load your documents." });
      window.history.replaceState({}, "", window.location.pathname);
    } else if (google === "error") {
      setBanner({
        type: "error",
        text: "Google sign-in did not complete. Check server logs and OAuth redirect URIs.",
      });
      window.history.replaceState({}, "", window.location.pathname);
    }
    refreshGoogleStatus();
  }, [refreshGoogleStatus]);

  const loadUserDocs = useCallback(async () => {
    setLoadingDocs(true);
    setBanner(null);
    try {
      const res = await fetch(api("/api/documents/user-docs"));
      const data = await parseJson(res);
      if (!res.ok) {
        throw new Error(data?.message || data?.error || res.statusText);
      }
      setFiles(data.files || []);
      await refreshGoogleStatus();
      if (!data.files?.length) {
        setBanner({ type: "success", text: "Connected, but no Google Docs or Word files were returned." });
      }
    } catch (e) {
      setBanner({
        type: "error",
        text: e.message || "Could not load documents. Connect Google first and ensure Redis stores tokens.",
      });
      setFiles([]);
    } finally {
      setLoadingDocs(false);
    }
  }, [api, refreshGoogleStatus]);

  const startGoogleConnect = async () => {
    setConnecting(true);
    setBanner(null);
    try {
      const res = await fetch(api("/api/auth/google-redirect"));
      const data = await parseJson(res);
      if (!res.ok || !data?.url) {
        throw new Error(data?.message || "No redirect URL from server");
      }
      window.location.href = data.url;
    } catch (e) {
      setBanner({ type: "error", text: e.message || "Failed to start Google sign-in" });
      setConnecting(false);
    }
  };

  const openIndexModal = (file) => {
    setBanner(null);
    setIndexModalFile(file);
    setIndexModalWorkspace(workspaceId.trim() || String(DEFAULT_WORKSPACE_ID));
  };

  const closeIndexModal = () => {
    setIndexModalFile(null);
    setIndexModalWorkspace("");
  };

  const confirmEmbedDoc = async () => {
    if (!indexModalFile) return;
    const ws = Number(indexModalWorkspace);
    if (!Number.isFinite(ws) || ws < 1) {
      setBanner({ type: "error", text: "Enter a valid workspace ID (positive integer)." });
      return;
    }
    const file = indexModalFile;
    setEmbeddingId(file.id);
    setBanner(null);
    try {
      const res = await fetch(api("/api/documents/embed-google-doc"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: file.id,
          mimeType: file.mimeType,
          name: file.name,
          workspaceId: ws,
        }),
      });
      const data = await parseJson(res);
      if (!res.ok) {
        throw new Error(data?.message || data?.error || res.statusText);
      }
      setWorkspaceId(String(ws));
      setBanner({
        type: "success",
        text: `Indexed "${file.name}" for search (workspace ${ws}). Use the same workspace when asking questions.`,
      });
      closeIndexModal();
    } catch (e) {
      setBanner({ type: "error", text: e.message || "Embedding failed" });
    } finally {
      setEmbeddingId(null);
    }
  };

  const ask = async (e) => {
    e.preventDefault();
    if (!question.trim()) return;
    setAsking(true);
    setAnswer("");
    setBanner(null);
    try {
      const res = await fetch(api("/api/cloud/ask"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: question.trim(),
          workspaceId: Number(workspaceId) || DEFAULT_WORKSPACE_ID,
        }),
      });
      const data = await parseJson(res);
      if (!res.ok) {
        throw new Error(data?.message || data?.error || res.statusText);
      }
      setAnswer(data.answer || "");
    } catch (e) {
      setBanner({ type: "error", text: e.message || "Ask request failed" });
    } finally {
      setAsking(false);
    }
  };

  const onUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    setUploadMessage("");
    setBanner(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(api("/api/documents/upload"), {
        method: "POST",
        body: fd,
      });
      const data = await parseJson(res);
      if (!res.ok) {
        throw new Error(data?.error || data?.message || res.statusText);
      }
      setUploadMessage(`Upload accepted. documentId: ${data.documentId} (${data.status})`);
    } catch (err) {
      setBanner({ type: "error", text: err.message || "Upload failed" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="app">
      <header>
        <h1>Sourceframe</h1>
        <p>Connect Google, index a document, then ask questions against your workspace.</p>
      </header>

      {banner && (
        <div className={`banner ${banner.type === "error" ? "error" : "success"}`}>{banner.text}</div>
      )}

      <section>
        <h2>Google account</h2>
        <div className="row" style={{ marginBottom: "0.65rem" }}>
          {googleConnected === null && (
            <span className="status-pill loading">Checking link…</span>
          )}
          {googleConnected === true && (
            <span className="status-pill connected">Google connected</span>
          )}
          {googleConnected === false && (
            <span className="status-pill">Not connected</span>
          )}
        </div>
        <p className="muted">
          Opens Google OAuth, then returns here. The server must use the same redirect URL registered in Google
          Cloud (currently <code>http://localhost:5001/api/auth/google/callback</code>).
        </p>
        <div className="row" style={{ marginTop: "0.75rem" }}>
          <button type="button" onClick={startGoogleConnect} disabled={connecting}>
            {connecting ? "Redirecting…" : googleConnected ? "Reconnect Google" : "Connect Google"}
          </button>
          <button type="button" className="secondary" onClick={loadUserDocs} disabled={loadingDocs}>
            {loadingDocs ? "Loading…" : "Refresh my Google Docs"}
          </button>
        </div>
      </section>

      <section>
        <h2>Your Google Docs &amp; Word files</h2>
        <p className="muted">
          Indexing asks for a workspace ID first; chunks are stored under that ID for RAG filters.
        </p>
        {files.length === 0 && <p className="muted">No files loaded yet.</p>}
        {files.length > 0 && (
          <ul className="doc-list">
            {files.map((f) => (
              <li key={f.id}>
                <div>
                  <strong>{f.name}</strong>
                  <div className="muted">{f.mimeType}</div>
                </div>
                <button
                  type="button"
                  onClick={() => openIndexModal(f)}
                  disabled={embeddingId === f.id}
                >
                  {embeddingId === f.id ? "Indexing…" : "Index for search"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2>Ask (RAG)</h2>
        <p className="muted">
          Uses <code>/api/cloud/ask</code> with Pinecone filters. Use the same workspace ID you chose when indexing.
        </p>
        <form onSubmit={ask}>
          <div className="field">
            <label htmlFor="ws">Workspace ID</label>
            <input
              id="ws"
              type="number"
              min={1}
              value={workspaceId}
              onChange={(ev) => setWorkspaceId(ev.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="q">Question</label>
            <textarea id="q" value={question} onChange={(ev) => setQuestion(ev.target.value)} />
          </div>
          <button type="submit" disabled={asking}>
            {asking ? "Asking…" : "Ask"}
          </button>
        </form>
        {answer && (
          <div style={{ marginTop: "1rem" }}>
            <div className="muted" style={{ marginBottom: "0.35rem" }}>
              Answer
            </div>
            <div className="answer">{answer}</div>
          </div>
        )}
      </section>

      <section>
        <h2>Upload file</h2>
        <p className="muted">POSTs to <code>/api/documents/upload</code> (multipart). Server ingests asynchronously.</p>
        <div className="file-row">
          <input type="file" onChange={onUpload} disabled={uploading} />
        </div>
        {uploadMessage && <p className="muted" style={{ marginTop: "0.65rem" }}>{uploadMessage}</p>}
      </section>

      {indexModalFile && (
        <div
          className="modal-backdrop"
          role="presentation"
          onClick={(e) => e.target === e.currentTarget && closeIndexModal()}
        >
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="index-modal-title">
            <h3 id="index-modal-title">Workspace for indexing</h3>
            <p className="muted" style={{ margin: "0 0 0.85rem" }}>
              Document: <strong>{indexModalFile.name}</strong>
            </p>
            <div className="field">
              <label htmlFor="index-ws">Workspace ID</label>
              <input
                id="index-ws"
                type="number"
                min={1}
                value={indexModalWorkspace}
                onChange={(ev) => setIndexModalWorkspace(ev.target.value)}
                autoFocus
              />
            </div>
            <div className="actions">
              <button type="button" className="secondary" onClick={closeIndexModal}>
                Cancel
              </button>
              <button type="button" onClick={confirmEmbedDoc} disabled={!!embeddingId}>
                {embeddingId ? "Indexing…" : "Start indexing"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
