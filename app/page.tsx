"use client";

import { useEffect, useState } from "react";
import { DESIGN_TYPES, type DesignSuggestion } from "@/lib/suggestions";
import { CANVA_FORMATS } from "@/lib/canva-formats";

const TYPE_LABELS: Record<string, string> = {
  "instagram-post": "Instagram Post",
  presentation: "Presentation",
  poster: "Poster",
  logo: "Logo",
  story: "Story",
};

export default function Home() {
  const [prompt, setPrompt] = useState("Summer coffee launch for a local cafe");
  const [designType, setDesignType] = useState(DESIGN_TYPES[0]);
  const [tone, setTone] = useState("playful");
  const [suggestions, setSuggestions] = useState<DesignSuggestion[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [photo, setPhoto] = useState<File | null>(null);
  const [retouchStrength, setRetouchStrength] = useState(60);
  const [retouch, setRetouch] = useState<{
    original: string;
    retouched: string;
    skinRatio: number;
    strength: number;
    width: number;
    height: number;
  } | null>(null);
  const [retouchError, setRetouchError] = useState("");
  const [retouchLoading, setRetouchLoading] = useState(false);

  const [canvaConfigured, setCanvaConfigured] = useState(false);
  const [canvaConnected, setCanvaConnected] = useState(false);
  const [canvaMessage, setCanvaMessage] = useState("");
  const [canvaPushing, setCanvaPushing] = useState(false);
  const [canvaDesignUrl, setCanvaDesignUrl] = useState("");
  const [canvaFormat, setCanvaFormat] = useState("match");
  const [canvaMode, setCanvaMode] = useState<"design" | "asset">("design");

  const [importUrl, setImportUrl] = useState("");
  const [importTitle, setImportTitle] = useState("");
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState("");
  const [importResultUrl, setImportResultUrl] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const canva = params.get("canva");
    if (canva === "connected") {
      setCanvaMessage("Connected to Canva.");
    } else if (canva === "error") {
      setCanvaMessage("Canva connection failed. Please try again.");
    }
    fetch("/api/canva/status")
      .then((r) => r.json())
      .then((d) => {
        setCanvaConfigured(Boolean(d.configured));
        setCanvaConnected(Boolean(d.connected));
      })
      .catch(() => {
        setCanvaConfigured(false);
        setCanvaConnected(false);
      });
  }, []);

  async function sendToCanva() {
    if (!retouch) return;
    setCanvaPushing(true);
    setCanvaMessage("");
    setCanvaDesignUrl("");
    try {
      const blob = await (await fetch(retouch.retouched)).blob();
      const formData = new FormData();
      formData.append("image", blob, "retouched.jpg");
      formData.append("title", "Retouched portrait");
      formData.append("designType", canvaFormat);
      formData.append("mode", canvaMode);
      const res = await fetch("/api/canva/push", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          setCanvaConnected(false);
        }
        throw new Error(data.error ?? "Failed to send to Canva");
      }
      if (data.mode === "asset") {
        setCanvaDesignUrl("");
        setCanvaMessage(data.message ?? "Added to your Canva Uploads.");
      } else {
        setCanvaDesignUrl(data.editUrl);
        setCanvaMessage("Design created in Canva.");
      }
    } catch (err) {
      setCanvaMessage(
        err instanceof Error ? err.message : "Failed to send to Canva",
      );
    } finally {
      setCanvaPushing(false);
    }
  }

  async function handleImport(event: React.FormEvent) {
    event.preventDefault();
    setImporting(true);
    setImportMessage("");
    setImportResultUrl("");
    try {
      const res = await fetch("/api/canva/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: importUrl,
          title: importTitle || "Imported template",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          setCanvaConnected(false);
        }
        throw new Error(data.error ?? "Import failed");
      }
      setImportResultUrl(data.editUrl);
      setImportMessage("Template imported into Canva.");
    } catch (err) {
      setImportMessage(err instanceof Error ? err.message : "Import failed");
    } finally {
      setImporting(false);
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, designType, tone, count: 3 }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Request failed");
      }
      setSuggestions(data.suggestions);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleRetouch(event: React.FormEvent) {
    event.preventDefault();
    if (!photo) {
      setRetouchError("Choose a photo first");
      return;
    }
    setRetouchLoading(true);
    setRetouchError("");
    try {
      const formData = new FormData();
      formData.append("image", photo);
      formData.append("strength", String(retouchStrength / 100));
      const res = await fetch("/api/retouch", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Retouch failed");
      }
      setRetouch(data);
    } catch (err) {
      setRetouchError(err instanceof Error ? err.message : "Something went wrong");
      setRetouch(null);
    } finally {
      setRetouchLoading(false);
    }
  }

  return (
    <main className="page">
      <header className="header">
        <h1>Canva Cursor Dev Agent</h1>
        <p>
          Describe what you want to create and the agent generates structured
          Canva design concepts — dimensions, color palettes, font pairings,
          layouts, and headlines you can drop straight into a design.
        </p>
      </header>

      <section className="card">
        <form className="form-grid" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="prompt">Design brief</label>
            <textarea
              id="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. Launch announcement for a new productivity app"
            />
          </div>
          <div className="row">
            <div>
              <label htmlFor="designType">Design type</label>
              <select
                id="designType"
                value={designType}
                onChange={(e) => setDesignType(e.target.value as typeof designType)}
              >
                {DESIGN_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {TYPE_LABELS[type] ?? type}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="tone">Tone</label>
              <input
                id="tone"
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                placeholder="e.g. bold, elegant, playful"
              />
            </div>
          </div>
          <button type="submit" disabled={loading}>
            {loading ? "Generating…" : "Generate design concepts"}
          </button>
          {error && <p className="error">{error}</p>}
        </form>
      </section>

      {suggestions.length > 0 && (
        <section className="results">
          {suggestions.map((s) => (
            <article key={s.id} className="suggestion">
              <h3>{s.title}</h3>
              <p className="headline">&ldquo;{s.headline}&rdquo;</p>
              <div className="meta">
                <span>
                  {s.dimensions.width} × {s.dimensions.height}px
                </span>
                <span>
                  {s.fontPairing.heading} / {s.fontPairing.body}
                </span>
              </div>
              <p className="section-title">Palette</p>
              <div className="palette">
                {s.palette.map((color) => (
                  <span
                    key={color}
                    className="swatch"
                    style={{ background: color }}
                    title={color}
                  />
                ))}
              </div>
              <p className="section-title">Layout</p>
              <p className="notes">{s.layout}</p>
              <p className="section-title" style={{ marginTop: 12 }}>
                Notes
              </p>
              <p className="notes">{s.notes}</p>
            </article>
          ))}
        </section>
      )}

      <section className="card" style={{ marginTop: 36 }}>
        <h2 className="card-title">Portrait retouch</h2>
        <p className="notes" style={{ marginBottom: 20 }}>
          Upload a portrait to smooth wrinkles and skin texture while preserving
          the person&rsquo;s identity. Only skin regions are softened &mdash;
          eyes, lips, hair, and facial structure are left untouched. Adjust the
          strength and compare before and after.
        </p>
        <form className="form-grid" onSubmit={handleRetouch}>
          <div>
            <label htmlFor="photo">Photo</label>
            <input
              id="photo"
              type="file"
              accept="image/*"
              onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
            />
          </div>
          <div>
            <label htmlFor="strength">
              Smoothing strength: {retouchStrength}%
            </label>
            <input
              id="strength"
              type="range"
              min={0}
              max={100}
              value={retouchStrength}
              onChange={(e) => setRetouchStrength(Number(e.target.value))}
            />
          </div>
          <button type="submit" disabled={retouchLoading}>
            {retouchLoading ? "Retouching…" : "Retouch photo"}
          </button>
          {retouchError && <p className="error">{retouchError}</p>}
        </form>

        {retouch && (
          <div className="compare">
            <figure>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={retouch.original} alt="Original portrait" />
              <figcaption>Before</figcaption>
            </figure>
            <figure>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={retouch.retouched} alt="Retouched portrait" />
              <figcaption>
                After &middot; {Math.round(retouch.strength * 100)}% strength
                &middot; {Math.round(retouch.skinRatio * 100)}% skin
              </figcaption>
            </figure>
          </div>
        )}

        {retouch && retouch.skinRatio < 0.05 && (
          <p className="error" style={{ marginTop: 12 }}>
            Little skin detected in this image — the retouch may have limited
            effect. It works best on portraits where the face is clearly visible.
          </p>
        )}

        {retouch && (
          <div className="canva-actions">
            <a
              className="button-link"
              href={retouch.retouched}
              download="retouched.jpg"
            >
              Download retouched photo
            </a>
            {!canvaConfigured && (
              <p className="notes">
                Connect Canva to send this retouched photo into a real Canva
                design. Set <code>CANVA_CLIENT_ID</code>,{" "}
                <code>CANVA_CLIENT_SECRET</code>, and{" "}
                <code>CANVA_REDIRECT_URI</code> on the server to enable it.
              </p>
            )}
            {canvaConfigured && !canvaConnected && (
              <a className="button-link" href="/api/canva/connect">
                Connect Canva
              </a>
            )}
            {canvaConfigured && canvaConnected && (
              <div className="canva-send">
                <label htmlFor="canvaMode">Action</label>
                <select
                  id="canvaMode"
                  value={canvaMode}
                  onChange={(e) =>
                    setCanvaMode(e.target.value as "design" | "asset")
                  }
                >
                  <option value="design">Create new design</option>
                  <option value="asset">Add to my Canva Uploads</option>
                </select>
                {canvaMode === "design" && (
                  <>
                    <label htmlFor="canvaFormat">Format</label>
                    <select
                      id="canvaFormat"
                      value={canvaFormat}
                      onChange={(e) => setCanvaFormat(e.target.value)}
                    >
                      {CANVA_FORMATS.map((f) => (
                        <option key={f.key} value={f.key}>
                          {f.label}
                        </option>
                      ))}
                    </select>
                  </>
                )}
                <button
                  type="button"
                  onClick={sendToCanva}
                  disabled={canvaPushing}
                >
                  {canvaPushing
                    ? "Sending to Canva…"
                    : canvaMode === "asset"
                      ? "Add photo to Canva Uploads"
                      : "Send retouched photo to Canva"}
                </button>
              </div>
            )}
            {canvaDesignUrl && (
              <a
                className="button-link"
                href={canvaDesignUrl}
                target="_blank"
                rel="noreferrer"
              >
                Open design in Canva
              </a>
            )}
            {canvaMessage && <p className="notes">{canvaMessage}</p>}
          </div>
        )}
      </section>

      <section className="card" style={{ marginTop: 36 }}>
        <h2 className="card-title">Import a template from Etsy or elsewhere</h2>
        <p className="notes" style={{ marginBottom: 20 }}>
          Bring in a template you own (e.g. an Etsy digital download) and edit it
          in Canva. Paste a public link to the template <strong>file</strong> —
          PDF, PPTX, DOCX, PNG, or JPG. After importing, open it in Canva to
          modify it, then add your own photo: retouch it above and choose{" "}
          <em>Add to my Canva Uploads</em> to drop it into the template.
        </p>
        {!canvaConfigured && (
          <p className="notes">Canva is not configured on the server.</p>
        )}
        {canvaConfigured && !canvaConnected && (
          <a className="button-link" href="/api/canva/connect">
            Connect Canva
          </a>
        )}
        {canvaConfigured && canvaConnected && (
          <form className="form-grid" onSubmit={handleImport}>
            <div>
              <label htmlFor="importUrl">Template file URL</label>
              <input
                id="importUrl"
                type="url"
                value={importUrl}
                onChange={(e) => setImportUrl(e.target.value)}
                placeholder="https://example.com/my-template.pdf"
                required
              />
            </div>
            <div>
              <label htmlFor="importTitle">Title (optional)</label>
              <input
                id="importTitle"
                value={importTitle}
                onChange={(e) => setImportTitle(e.target.value)}
                placeholder="My template"
              />
            </div>
            <button type="submit" disabled={importing}>
              {importing ? "Importing…" : "Import template to Canva"}
            </button>
            {importResultUrl && (
              <a
                className="button-link"
                href={importResultUrl}
                target="_blank"
                rel="noreferrer"
              >
                Open imported template in Canva
              </a>
            )}
            {importMessage && <p className="notes">{importMessage}</p>}
          </form>
        )}
        <p className="notes" style={{ marginTop: 16, fontSize: "0.8rem" }}>
          The file URL must be publicly accessible. If your Etsy download is a
          Canva “Use this template” link, open it directly in Canva instead —
          Canva copies it into your account, then use{" "}
          <em>Add to my Canva Uploads</em> above to include your photo. Only
          import templates you have the right to use.
        </p>
      </section>
    </main>
  );
}
