import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import "./App.css";
import {
  GoogleIcon,
  GoogleDocIcon,
  WordDocIcon,
  PdfIcon,
  SparklesIcon,
  SearchIcon,
  RefreshIcon,
  UploadCloudIcon,
  DatabaseIcon,
  FolderIcon,
  CopyIcon,
  CheckIcon,
  SendIcon,
  CloseIcon,
  LayersIcon,
  ArrowRightIcon,
  AlertCircleIcon,
} from "./components/Icons";
import Toast from "./components/Toast";

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

// Helper to determine document type
function getDocType(mimeType, name = "") {
  if (
    mimeType === "application/vnd.google-apps.document" ||
    name.endsWith(".gdoc")
  ) {
    return "gdoc";
  }
  if (
    mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    name.endsWith(".docx") ||
    name.endsWith(".doc")
  ) {
    return "word";
  }
  if (mimeType === "application/pdf" || name.endsWith(".pdf")) {
    return "pdf";
  }
  return "other";
}

export default function App() {
  const apiBase = useApiBase();
  const api = useMemo(
    () => (path) => `${apiBase}${path.startsWith("/") ? path : `/${path}`}`,
    [apiBase],
  );

  const [toast, setToast] = useState(null);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [files, setFiles] = useState([]);
  const [connecting, setConnecting] = useState(false);
  const [embeddingId, setEmbeddingId] = useState(null);
  const [indexModalFile, setIndexModalFile] = useState(null);
  const [indexModalWorkspace, setIndexModalWorkspace] = useState("");
  const [workspaces, setWorkspaces] = useState([]);
  const [workspacesLoading, setWorkspacesLoading] = useState(true);
  const [question, setQuestion] = useState("");
  const [workspaceId, setWorkspaceId] = useState("");
  const [answer, setAnswer] = useState("");
  const [asking, setAsking] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [googleConnected, setGoogleConnected] = useState(null);
  const [modalErrMsg, setModalErrMsg] = useState(null);
  const [copied, setCopied] = useState(false);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [docFilter, setDocFilter] = useState("all");

  const fileInputRef = useRef(null);

  const showToast = (type, text) => {
    setToast({ type, text });
  };

  const loadWorkspaces = useCallback(async () => {
    setWorkspacesLoading(true);
    try {
      const res = await fetch(api("/api/documents/get-metadata"));
      const data = await parseJson(res);
      if (!res.ok) {
        throw new Error(data?.message || data?.error || res.statusText);
      }
      const list = Array.isArray(data?.workspace) ? data.workspace : [];
      setWorkspaces(list);
      setWorkspaceId((prev) => {
        if (!list.length) return "";
        const prevOk = list.some((w) => String(w.id) === String(prev));
        if (prev && prevOk) return String(prev);
        return String(list[0].id);
      });
    } catch {
      setWorkspaces([]);
      setWorkspaceId("");
    } finally {
      setWorkspacesLoading(false);
    }
  }, [api]);

  const refreshGoogleStatus = useCallback(async () => {
    try {
      const res = await fetch(api("/api/auth/google-status"));
      const data = await parseJson(res);
      const isConn = res.ok ? Boolean(data?.connected) : false;
      setGoogleConnected(isConn);
      return isConn;
    } catch {
      setGoogleConnected(false);
      return false;
    }
  }, [api]);

  const loadUserDocs = useCallback(async () => {
    setLoadingDocs(true);
    try {
      const res = await fetch(api("/api/documents/user-docs"));
      const data = await parseJson(res);
      if (!res.ok) {
        throw new Error(data?.message || data?.error || res.statusText);
      }
      const fetched = data.files || [];
      setFiles(fetched);
      if (!fetched.length) {
        showToast("info", "Connected, but no Google Docs, Word files, or PDFs were found in Drive.");
      }
    } catch (e) {
      showToast(
        "error",
        e.message || "Could not load documents. Please connect Google first.",
      );
      setFiles([]);
    } finally {
      setLoadingDocs(false);
    }
  }, [api]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const google = params.get("google");
    if (google === "connected") {
      showToast("success", "Google account connected successfully! Loading your docs…");
      window.history.replaceState({}, "", window.location.pathname);
    } else if (google === "error") {
      showToast("error", "Google sign-in did not complete. Check server logs & OAuth redirect URIs.");
      window.history.replaceState({}, "", window.location.pathname);
    }
    loadWorkspaces();
    refreshGoogleStatus().then((isConn) => {
      if (isConn) {
        loadUserDocs();
      }
    });
  }, [refreshGoogleStatus, loadWorkspaces, loadUserDocs]);

  const startGoogleConnect = async () => {
    setConnecting(true);
    try {
      const res = await fetch(api("/api/auth/google-redirect"));
      const data = await parseJson(res);
      if (!res.ok || !data?.url) {
        throw new Error(data?.message || "No redirect URL from server");
      }
      window.location.href = data.url;
    } catch (e) {
      showToast("error", e.message || "Failed to start Google sign-in");
      setConnecting(false);
    }
  };

  const openIndexModal = (file) => {
    setModalErrMsg(null);
    setIndexModalFile(file);
    const seeded = (file.indexedWorkspaces || []).map(Number);
    const unseeded = workspaces.find((w) => !seeded.includes(Number(w.id)));
    if (unseeded) {
      setIndexModalWorkspace(String(unseeded.id));
    } else if (workspaces[0]) {
      setIndexModalWorkspace(String(workspaces[0].id));
      setModalErrMsg(`"${file.name}" is already seeded in all available workspaces.`);
    }
  };

  const closeIndexModal = () => {
    setIndexModalFile(null);
    setIndexModalWorkspace("");
    setModalErrMsg(null);
  };

  const confirmEmbedDoc = async () => {
    if (!indexModalFile) return;
    const ws = Number(indexModalWorkspace);
    if (!Number.isFinite(ws) || ws < 1 || !workspaces.some((w) => Number(w.id) === ws)) {
      setModalErrMsg("Please choose a valid workspace from the list.");
      return;
    }
    const file = indexModalFile;
    setEmbeddingId(file.id);
    setModalErrMsg(null);
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
      if (res.status === 409) {
        setModalErrMsg("This document is already indexed in the selected workspace.");
        return;
      }
      if (!res.ok) {
        throw new Error(data?.message || data?.error || res.statusText);
      }

      setFiles((prev) =>
        prev.map((item) =>
          item.id === file.id
            ? {
                ...item,
                indexedWorkspaces: Array.from(
                  new Set([...(item.indexedWorkspaces || []), ws]),
                ),
              }
            : item,
        ),
      );
      setWorkspaceId(String(ws));
      showToast(
        "success",
        `Indexed "${file.name}" for Workspace #${ws}! You can now ask questions against it.`,
      );
      closeIndexModal();
    } catch (e) {
      setModalErrMsg(e.message || "Embedding failed. Check server logs.");
    } finally {
      setEmbeddingId(null);
    }
  };

  const ask = async (e) => {
    if (e) e.preventDefault();
    if (!question.trim() || asking) return;
    const ws = Number(workspaceId);
    if (!Number.isFinite(ws) || !workspaces.some((w) => Number(w.id) === ws)) {
      showToast("error", "Please select a target workspace.");
      return;
    }
    setAsking(true);
    setAnswer("");
    try {
      const res = await fetch(api("/api/cloud/ask"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: question.trim(),
          workspaceId: ws,
        }),
      });
      const data = await parseJson(res);
      if (!res.ok) {
        throw new Error(data?.message || data?.error || res.statusText);
      }
      setAnswer(data.answer || "No response received.");
    } catch (e) {
      showToast("error", e.message || "Ask request failed. Ensure server & Ollama are online.");
    } finally {
      setAsking(false);
    }
  };

  const handleKeyDown = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      ask();
    }
  };

  const copyToClipboard = () => {
    if (!answer) return;
    navigator.clipboard.writeText(answer);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const onUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
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
      showToast(
        "success",
        `Uploaded "${file.name}" (ID: ${data.documentId || "OK"}).`,
      );
    } catch (err) {
      showToast("error", err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  // Filter documents by search and tab
  const filteredFiles = useMemo(() => {
    return files.filter((f) => {
      const matchesSearch = f.name?.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;
      const type = getDocType(f.mimeType, f.name);
      if (docFilter === "all") return true;
      return type === docFilter;
    });
  }, [files, searchQuery, docFilter]);

  const activeWorkspaceObj = workspaces.find((w) => String(w.id) === String(workspaceId));
  const activeWorkspaceName = activeWorkspaceObj?.name || "";

  return (
    <div className="app-container">
      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* Top Header */}
      <header className="app-header">
        <div className="header-inner">
          <div className="brand-wrapper">
            <div className="brand-logo">
              <SparklesIcon size={22} className="text-white" />
            </div>
            <div className="brand-text">
              <h1>
                Sourceframe AI
                <span className="brand-badge">RAG Workspace</span>
              </h1>
              <p>Vector Search &amp; Enterprise Document Intelligence</p>
            </div>
          </div>

          <div className="header-status-bar">
            <div className="header-status-pill">
              <span
                className={`status-dot ${
                  googleConnected === null
                    ? "loading"
                    : googleConnected
                      ? "connected"
                      : "disconnected"
                }`}
              />
              <span>
                {googleConnected === null
                  ? "Checking Drive link…"
                  : googleConnected
                    ? "Google Drive Linked"
                    : "Drive Disconnected"}
              </span>
            </div>
            {activeWorkspaceObj && (
              <div className="header-status-pill hidden sm:inline-flex">
                <FolderIcon size={14} className="text-blue-500" />
                <span>{activeWorkspaceObj.name} (#{activeWorkspaceObj.id})</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Dashboard */}
      <main className="main-content">
        <div className="dashboard-grid">
          {/* Left Column: Knowledge Sources & Document Hub */}
          <div className="flex flex-col gap-5">
            {/* Google Drive & Storage Integration Card */}
            <div className="card">
              <div className="card-header">
                <div className="card-header-left">
                  <div className="card-header-icon">
                    <GoogleIcon size={18} />
                  </div>
                  <div>
                    <h2 className="card-title">Knowledge Sources</h2>
                    <p className="card-subtitle">Connect Drive &amp; sync documents</p>
                  </div>
                </div>
              </div>

              <div className="card-body">
                {/* Google Account Status Banner */}
                <div className="account-banner">
                  <div className="account-banner-top">
                    <div className="account-user-info">
                      <GoogleIcon size={16} />
                      <span className="text-sm font-semibold text-slate-800">
                        Google Workspace
                      </span>
                    </div>
                    <span
                      className={`account-badge-pill ${
                        googleConnected ? "active" : "inactive"
                      }`}
                    >
                      {googleConnected === null
                        ? "Checking…"
                        : googleConnected
                          ? "Connected"
                          : "Not Connected"}
                    </span>
                  </div>
                  <div className="account-actions">
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={startGoogleConnect}
                      disabled={connecting}
                    >
                      <GoogleIcon size={14} />
                      {connecting
                        ? "Redirecting…"
                        : googleConnected
                          ? "Reconnect Account"
                          : "Connect Google Drive"}
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={loadUserDocs}
                      disabled={loadingDocs}
                    >
                      <RefreshIcon
                        size={14}
                        className={loadingDocs ? "animate-spin" : ""}
                      />
                      {loadingDocs ? "Syncing Drive…" : "Sync Drive Files"}
                    </button>
                  </div>
                </div>

                {/* Document Library Section */}
                <div className="doc-controls">
                  <div className="search-input-wrapper">
                    <SearchIcon size={16} className="search-input-icon" />
                    <input
                      type="text"
                      className="search-input"
                      placeholder="Search Google Docs, Word files, PDFs..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>

                  <div className="doc-filter-tabs">
                    <button
                      type="button"
                      className={`filter-tab ${docFilter === "all" ? "active" : ""}`}
                      onClick={() => setDocFilter("all")}
                    >
                      All ({files.length})
                    </button>
                    <button
                      type="button"
                      className={`filter-tab ${docFilter === "gdoc" ? "active" : ""}`}
                      onClick={() => setDocFilter("gdoc")}
                    >
                      Google Docs
                    </button>
                    <button
                      type="button"
                      className={`filter-tab ${docFilter === "word" ? "active" : ""}`}
                      onClick={() => setDocFilter("word")}
                    >
                      Word Docs
                    </button>
                    <button
                      type="button"
                      className={`filter-tab ${docFilter === "pdf" ? "active" : ""}`}
                      onClick={() => setDocFilter("pdf")}
                    >
                      PDFs
                    </button>
                  </div>
                </div>

                {/* Document List */}
                <div className="doc-list-container">
                  {loadingDocs && (
                    <>
                      <div className="skeleton-item" />
                      <div className="skeleton-item" />
                      <div className="skeleton-item" />
                    </>
                  )}

                  {!loadingDocs && files.length === 0 && (
                    <div className="empty-state">
                      <div className="empty-state-icon">
                        <FolderIcon size={24} />
                      </div>
                      <h4>No Documents Loaded Yet</h4>
                      <p>
                        Connect your Google account and click &ldquo;Sync Drive Files&rdquo;
                        to index files into your workspace.
                      </p>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={googleConnected ? loadUserDocs : startGoogleConnect}
                      >
                        {googleConnected ? "Sync Files Now" : "Connect Google Drive"}
                      </button>
                    </div>
                  )}

                  {!loadingDocs && files.length > 0 && filteredFiles.length === 0 && (
                    <div className="empty-state">
                      <p>No documents matched &ldquo;{searchQuery}&rdquo;.</p>
                    </div>
                  )}

                  {!loadingDocs &&
                    filteredFiles.map((f) => {
                      const type = getDocType(f.mimeType, f.name);
                      const seededIds = f.indexedWorkspaces || [];
                      const seededNames = seededIds
                        .map((id) => workspaces.find((w) => Number(w.id) === Number(id))?.name || `ID ${id}`)
                        .filter(Boolean);

                      return (
                        <div key={f.id} className="doc-item-card">
                          <div className="doc-item-left">
                            <div className={`doc-type-icon ${type}`}>
                              {type === "gdoc" ? (
                                <GoogleDocIcon size={18} />
                              ) : type === "word" ? (
                                <WordDocIcon size={18} />
                              ) : (
                                <PdfIcon size={18} />
                              )}
                            </div>
                            <div className="doc-meta">
                              <h4 className="doc-name" title={f.name}>
                                {f.name}
                              </h4>
                              <div className="doc-badge-group">
                                <span className="doc-badge">
                                  {type === "gdoc"
                                    ? "Google Doc"
                                    : type === "word"
                                      ? "Word Doc"
                                      : type === "pdf"
                                        ? "PDF"
                                        : "File"}
                                </span>
                                {seededNames.length === 1 && (
                                  <span
                                    className="doc-badge doc-badge-seeded"
                                    title={`Indexed in: ${seededNames[0]}`}
                                  >
                                    <CheckIcon size={11} className="shrink-0 text-emerald-600" />
                                    <span>{seededNames[0]}</span>
                                  </span>
                                )}
                                {seededNames.length > 1 && seededNames.length === workspaces.length && (
                                  <span
                                    className="doc-badge doc-badge-seeded"
                                    title={`Indexed in all workspaces: ${seededNames.join(", ")}`}
                                  >
                                    <CheckIcon size={11} className="shrink-0 text-emerald-600" />
                                    <span>All Workspaces ({seededNames.length})</span>
                                  </span>
                                )}
                                {seededNames.length > 1 && seededNames.length < workspaces.length && (
                                  <>
                                    <span
                                      className="doc-badge doc-badge-seeded"
                                      title={`Indexed in: ${seededNames.join(", ")}`}
                                    >
                                      <CheckIcon size={11} className="shrink-0 text-emerald-600" />
                                      <span>{seededNames[0]}</span>
                                    </span>
                                    <span
                                      className="doc-badge doc-badge-more"
                                      title={`Indexed in: ${seededNames.join(", ")}`}
                                    >
                                      +{seededNames.length - 1}
                                    </span>
                                  </>
                                )}
                                {seededNames.length === 0 && (
                                  <span className="doc-badge doc-badge-unseeded">
                                    Not indexed
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            className="btn-index"
                            onClick={() => openIndexModal(f)}
                            disabled={embeddingId === f.id}
                          >
                            {embeddingId === f.id ? (
                              <>
                                <RefreshIcon size={13} className="animate-spin" />
                                <span>Indexing…</span>
                              </>
                            ) : (
                              <>
                                <DatabaseIcon size={13} />
                                <span>
                                  {seededNames.length > 0 ? "Add Workspace" : "Index"}
                                </span>
                              </>
                            )}
                          </button>
                        </div>
                      );
                    })}
                </div>

                {/* Upload Local File Box */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={onUpload}
                  style={{ display: "none" }}
                  accept=".pdf,.docx,.doc,.txt"
                />
                <div
                  className="upload-dropzone"
                  onClick={() => fileInputRef.current?.click()}
                  style={{ cursor: "pointer" }}
                >
                  <div className="upload-dropzone-left">
                    <div className="upload-icon-wrapper">
                      <UploadCloudIcon size={16} />
                    </div>
                    <div className="upload-dropzone-text">
                      <h5>{uploading ? "Uploading file…" : "Upload Local Document"}</h5>
                      <p>Support for PDF, DOCX, and TXT files</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    disabled={uploading}
                  >
                    {uploading ? "Uploading…" : "Browse"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive RAG Studio */}
          <div className="flex flex-col gap-5">
            <div className="card">
              <div className="card-header">
                <div className="card-header-left">
                  <div className="card-header-icon indigo">
                    <SparklesIcon size={18} />
                  </div>
                  <div>
                    <h2 className="card-title">Ask &amp; Search (RAG Studio)</h2>
                    <p className="card-subtitle">
                      Query indexed Pinecone vector stores across your workspaces
                    </p>
                  </div>
                </div>
              </div>

              <div className="card-body">
                {/* Visual Workspace Selector */}
                <div className="mb-4">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
                    Target Workspace
                  </label>
                  <div className="workspace-grid">
                    {workspacesLoading && (
                      <div className="skeleton-item col-span-full h-12" />
                    )}
                    {!workspacesLoading && workspaces.length === 0 && (
                      <p className="text-xs text-amber-600 col-span-full">
                        No workspaces found. Check /api/documents/get-metadata.
                      </p>
                    )}
                    {!workspacesLoading &&
                      workspaces.map((w) => {
                        const isActive = String(w.id) === String(workspaceId);
                        return (
                          <button
                            key={w.id}
                            type="button"
                            className={`workspace-card-btn ${isActive ? "active" : ""}`}
                            onClick={() => setWorkspaceId(String(w.id))}
                          >
                            <div className="ws-name">
                              <span>{w.name}</span>
                              {isActive && <CheckIcon size={14} className="text-blue-600" />}
                            </div>
                            <div className="ws-id-badge">ID: {w.id}</div>
                          </button>
                        );
                      })}
                  </div>
                </div>

                {/* Question Input Form */}
                <form onSubmit={ask} className="ask-form">
                  <div className="question-box-wrapper">
                    <textarea
                      className="question-textarea"
                      placeholder={`Ask any question based on documents indexed in ${
                        activeWorkspaceName || "this workspace"
                      }…`}
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      onKeyDown={handleKeyDown}
                    />
                    <div className="question-box-footer">
                      <div className="shortcut-hint">
                        <kbd className="px-1.5 py-0.5 text-[10px] bg-slate-100 border border-slate-300 rounded font-sans">
                          ⌘/Ctrl + Enter
                        </kbd>{" "}
                        to ask
                      </div>
                      <button
                        type="submit"
                        className="btn-ask"
                        disabled={
                          asking ||
                          workspacesLoading ||
                          workspaces.length === 0 ||
                          !question.trim() ||
                          !workspaceId
                        }
                      >
                        {asking ? (
                          <>
                            <RefreshIcon size={14} className="animate-spin" />
                            <span>Synthesizing Answer…</span>
                          </>
                        ) : (
                          <>
                            <SendIcon size={14} />
                            <span>Ask Knowledge Base</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </form>

                {/* AI Answer Output */}
                {answer && (
                  <div className="answer-container">
                    <div className="answer-header">
                      <div className="answer-header-left">
                        <SparklesIcon size={15} />
                        <span>AI Synthesized Answer</span>
                      </div>
                      <div className="answer-actions">
                        <button
                          type="button"
                          className="btn-copy"
                          onClick={copyToClipboard}
                        >
                          {copied ? (
                            <>
                              <CheckIcon size={13} className="text-emerald-600" />
                              <span className="text-emerald-600">Copied!</span>
                            </>
                          ) : (
                            <>
                              <CopyIcon size={13} />
                              <span>Copy Answer</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                    <div className="answer-body">{answer}</div>
                    <div className="answer-footer">
                      <span>
                        Filtered by Workspace:{" "}
                        <strong>{activeWorkspaceName}</strong> (ID: {workspaceId})
                      </span>
                      <span>Vector Search: Pinecone (top 5 chunks)</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Index Modal */}
      {indexModalFile && (
        <div
          className="modal-backdrop"
          role="presentation"
          onClick={(e) => e.target === e.currentTarget && closeIndexModal()}
        >
          <div
            className="modal-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="index-modal-title"
          >
            <div className="modal-dialog-header">
              <h3 id="index-modal-title">Index Document for Search</h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={closeIndexModal}
              >
                <CloseIcon size={18} />
              </button>
            </div>

            <div className="modal-dialog-body">
              <div className="modal-file-preview">
                <div className="card-header-icon">
                  <DatabaseIcon size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-slate-800 truncate">
                    {indexModalFile.name}
                  </div>
                  <div className="text-xs text-slate-500 truncate">
                    {indexModalFile.mimeType}
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <label
                  htmlFor="index-ws-select"
                  className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2"
                >
                  Select Target Workspace
                </label>
                <p className="text-xs text-slate-500 mb-3">
                  Document content will be parsed into chunks and stored in Pinecone
                  with this workspace filter.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {workspaces.map((w) => {
                    const isAlreadySeeded = (indexModalFile.indexedWorkspaces || [])
                      .map(Number)
                      .includes(Number(w.id));
                    const isSelected = String(w.id) === String(indexModalWorkspace);
                    return (
                      <button
                        key={w.id}
                        type="button"
                        className={`workspace-card-btn ${
                          isAlreadySeeded ? "already-seeded" : ""
                        } ${isSelected ? "active" : ""}`}
                        onClick={() => {
                          setIndexModalWorkspace(String(w.id));
                          if (isAlreadySeeded) {
                            setModalErrMsg(
                              `"${indexModalFile.name}" is already seeded in ${w.name} (${w.id}). Please select another workspace.`,
                            );
                          } else {
                            setModalErrMsg(null);
                          }
                        }}
                      >
                        <div className="ws-name">
                          <span>{w.name}</span>
                          {isAlreadySeeded ? (
                            <CheckIcon size={14} className="text-emerald-600" />
                          ) : isSelected ? (
                            <CheckIcon size={14} className="text-blue-600" />
                          ) : null}
                        </div>
                        <div className="ws-id-badge">ID: {w.id}</div>
                        {isAlreadySeeded && (
                          <span className="already-seeded-tag">✓ Seeded</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {modalErrMsg && (
                <div className="flex items-center gap-2 p-3 text-xs bg-rose-50 border border-rose-200 text-rose-700 rounded-lg">
                  <AlertCircleIcon size={16} className="text-rose-600 shrink-0" />
                  <span>{modalErrMsg}</span>
                </div>
              )}
            </div>

            <div className="modal-dialog-footer">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={closeIndexModal}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={confirmEmbedDoc}
                disabled={
                  !!embeddingId ||
                  workspacesLoading ||
                  workspaces.length === 0 ||
                  !indexModalWorkspace ||
                  (indexModalFile.indexedWorkspaces || [])
                    .map(Number)
                    .includes(Number(indexModalWorkspace))
                }
              >
                {embeddingId ? (
                  <>
                    <RefreshIcon size={14} className="animate-spin" />
                    <span>Chunking &amp; Indexing…</span>
                  </>
                ) : (
                  <>
                    <span>Confirm &amp; Index</span>
                    <ArrowRightIcon size={14} />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
