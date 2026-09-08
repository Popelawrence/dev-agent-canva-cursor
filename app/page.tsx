"use client";

import { useState } from "react";
import { DESIGN_TYPES, type DesignSuggestion } from "@/lib/suggestions";

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
    </main>
  );
}
