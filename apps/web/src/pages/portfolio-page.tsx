import {
  collabSpaceStateSchema,
  type CollabSpaceState,
} from "@collab-canvas/shared";
import { ArrowRight, MoveUpRight } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router";

import { syncServerUrl } from "../lib/env";
import "./portfolio.css";

const emptyState: CollabSpaceState = {
  objects: [],
  activeVisitors: 0,
  totalContributors: 0,
};

export function PortfolioPage() {
  const [space, setSpace] = useState(emptyState);

  useEffect(() => {
    if (!syncServerUrl) {
      const timer = window.setTimeout(() => {
        try {
          const values = JSON.parse(
            window.localStorage.getItem(
              "collab-canvas:portfolio-local-objects",
            ) ?? "[]",
          ) as unknown[];
          const local = collabSpaceStateSchema.safeParse({
            objects: values,
            activeVisitors: 0,
            totalContributors: new Set(
              values.map((value) =>
                typeof value === "object" && value && "visitorId" in value
                  ? value.visitorId
                  : null,
              ),
            ).size,
          });
          if (local.success) setSpace(local.data);
        } catch {
          setSpace(emptyState);
        }
      }, 0);
      return () => window.clearTimeout(timer);
    }
    const controller = new AbortController();
    fetch(`${syncServerUrl}/portfolio/state`, { signal: controller.signal })
      .then((response) => response.json())
      .then((value: unknown) => {
        const parsed = collabSpaceStateSchema.safeParse(value);
        if (parsed.success) setSpace(parsed.data);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  const previewObjects = space.objects
    .filter((object) => object.type !== "stroke")
    .slice(-4);

  return (
    <main className="portfolio-page">
      <a className="portfolio-skip" href="#work">
        Skip to selected work
      </a>
      <header className="portfolio-nav">
        <Link className="portfolio-wordmark" to="/" aria-label="Portfolio home">
          <span>CC</span>
          <span>Systems &amp; interfaces</span>
        </Link>
        <nav aria-label="Main navigation">
          <a href="#work">Work</a>
          <a href="#case-study">Process</a>
          <Link to="/collab">Collab space</Link>
          <Link to="/login">Sign in</Link>
        </nav>
      </header>

      <section className="portfolio-hero" aria-labelledby="hero-title">
        <p className="portfolio-kicker">
          Software engineering · Frontend systems · Realtime infrastructure
        </p>
        <h1 id="hero-title">
          Software systems
          <br />
          people can feel.
        </h1>
        <div className="portfolio-hero-copy">
          <p>
            I build durable web products where interaction design and backend
            architecture meet.
          </p>
          <a href="#work">
            View selected work <ArrowRight aria-hidden="true" />
          </a>
        </div>
      </section>

      <section
        className="portfolio-work"
        id="work"
        aria-labelledby="work-title"
      >
        <div className="portfolio-section-heading">
          <p>01 / Selected work</p>
          <h2 id="work-title">
            Built to be used,
            <br />
            not just viewed.
          </h2>
        </div>
        <div className="portfolio-project-list">
          <article>
            <div className="project-index">01</div>
            <div>
              <h3>Collab Canvas</h3>
              <p>
                A persistent realtime canvas with ownership, presence, and
                accessible exports.
              </p>
            </div>
            <p className="project-stack">React · tldraw · Durable Objects</p>
          </article>
          <article>
            <div className="project-index">02</div>
            <div>
              <h3>Realtime room infrastructure</h3>
              <p>
                WebSocket sessions, resumable state, rate limits, and
                server-authoritative access.
              </p>
            </div>
            <p className="project-stack">Cloudflare · TypeScript · SQLite</p>
          </article>
          <article>
            <div className="project-index">03</div>
            <div>
              <h3>Inclusive collaboration</h3>
              <p>
                Keyboard-first flows, document exports, and carefully announced
                presence changes.
              </p>
            </div>
            <p className="project-stack">WCAG 2.2 · React · PDF</p>
          </article>
        </div>
      </section>

      <section className="collab-feature" aria-labelledby="collab-title">
        <div className="collab-feature-copy">
          <p className="portfolio-kicker">02 / Collab space</p>
          <h2 id="collab-title">
            Don’t just inspect the project.
            <br />
            Step inside it.
          </h2>
          <p>
            A shared room shaped by everyone who visits. Your existing visitor
            identity follows you in—no signup, no new profile.
          </p>
          <div className="collab-feature-meta">
            <span>
              {space.activeVisitors === 1
                ? "1 person here now"
                : `${space.activeVisitors} people here now`}
            </span>
            <span>
              {space.totalContributors === 1
                ? "1 contributor"
                : `${space.totalContributors} contributors`}
            </span>
          </div>
          <Link className="portfolio-primary-link" to="/collab">
            Enter space <MoveUpRight aria-hidden="true" />
          </Link>
        </div>
        <div
          className="room-preview"
          aria-label="Read-only preview of the shared collab room"
        >
          <div className="preview-sign preview-work">WORK</div>
          <div className="preview-sign preview-collab">COLLAB</div>
          <div className="preview-sign preview-about">ABOUT</div>
          <div className="preview-table">
            <span>LEAVE YOUR MARK</span>
          </div>
          {previewObjects.length === 0 ? (
            <p className="preview-empty">
              Be the first to leave something here.
            </p>
          ) : (
            previewObjects.map((object, index) => (
              <div
                className={`preview-note preview-note-${index + 1}`}
                key={object.id}
              >
                <span>{object.content}</span>
                <small>{object.visitorName}</small>
              </div>
            ))
          )}
          <div className="preview-entrance">ENTRANCE</div>
        </div>
      </section>

      <section
        className="portfolio-case"
        id="case-study"
        aria-labelledby="case-title"
      >
        <div className="portfolio-section-heading">
          <p>03 / How it works</p>
          <h2 id="case-title">
            A small space with
            <br />
            serious boundaries.
          </h2>
        </div>
        <div className="case-grid">
          <article>
            <span>Identity</span>
            <h3>One public-facing visitor profile.</h3>
            <p>
              Returning visitors keep their name and avatar. Guests receive a
              signed, privacy-safe generated identity.
            </p>
          </article>
          <article>
            <span>Presence</span>
            <h3>Movement stays ephemeral.</h3>
            <p>
              Local prediction keeps walking responsive while throttled
              snapshots and interpolation keep the network calm.
            </p>
          </article>
          <article>
            <span>Persistence</span>
            <h3>Only contributions survive.</h3>
            <p>
              Notes, text, and drawings persist with ownership metadata.
              Position and selection do not.
            </p>
          </article>
          <article>
            <span>Integrity</span>
            <h3>The server owns the truth.</h3>
            <p>
              Signed identity, object limits, content checks, rate limits, and
              ownership validation protect the public surface.
            </p>
          </article>
        </div>
      </section>

      <footer className="portfolio-footer">
        <p>Collab Canvas / 2026</p>
        <p>Designed for real human presence.</p>
      </footer>
    </main>
  );
}
