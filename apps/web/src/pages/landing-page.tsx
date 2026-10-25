import {
  Component,
  lazy,
  Suspense,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Link } from "react-router";
import { ArrowRightIcon } from "@phosphor-icons/react/dist/csr/ArrowRight";
import { GithubLogoIcon } from "@phosphor-icons/react/dist/csr/GithubLogo";
import { CursorIcon } from "@phosphor-icons/react/dist/csr/Cursor";
import { NoteIcon } from "@phosphor-icons/react/dist/csr/Note";
import { PencilSimpleIcon } from "@phosphor-icons/react/dist/csr/PencilSimple";
import { UsersThreeIcon } from "@phosphor-icons/react/dist/csr/UsersThree";
import { SparkleIcon } from "@phosphor-icons/react/dist/csr/Sparkle";
import { BrandMark } from "../components/brand-mark";
import "./landing.css";

const LandingPreview = lazy(
  () => import("../features/landing/landing-preview"),
);
const githubUrl = "https://github.com/RaizelHub/collab-canvas";
const PagesPreview = lazy(() => import("../features/pages/pages-preview"));

function PreviewPlaceholder() {
  return (
    <div className="landing-preview-placeholder" role="status">
      <div className="placeholder-notes" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <p>Making room for your ideas…</p>
    </div>
  );
}

class PreviewBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed)
      return (
        <div className="landing-preview-placeholder" role="alert">
          <p>The preview couldn’t load.</p>
          <button
            className="landing-button landing-button-secondary"
            type="button"
            onClick={() => window.location.reload()}
          >
            Reload preview
          </button>
        </div>
      );
    return this.props.children;
  }
}

function DeferredPreview({ mode }: { mode: "whiteboard" | "pages" }) {
  const container = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!container.current) return;
    if (!("IntersectionObserver" in window)) {
      const frame = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(frame);
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "120px" },
    );
    observer.observe(container.current);
    return () => observer.disconnect();
  }, []);
  return (
    <div className="landing-preview-shell" ref={container}>
      <PreviewBoundary>
        {visible ? (
          <Suspense fallback={<PreviewPlaceholder />}>
            {mode === "whiteboard" ? <LandingPreview /> : <PagesPreview />}
          </Suspense>
        ) : (
          <PreviewPlaceholder />
        )}
      </PreviewBoundary>
    </div>
  );
}

export function LandingPage() {
  const [mode, setMode] = useState<"whiteboard" | "pages">("whiteboard");
  return (
    <div className="landing-page">
      <a className="landing-skip-link" href="#landing-main">
        Skip to content
      </a>
      <header className="landing-nav">
        <Link className="landing-brand" to="/" aria-label="CollabCanvas home">
          <BrandMark />
          <span>
            CollabCanvas<span className="landing-brand-dot">.</span>
          </span>
        </Link>
        <nav aria-label="Main navigation">
          <a className="landing-nav-secondary" href="#features">
            Features
          </a>
          <a
            className="landing-nav-secondary"
            href={githubUrl}
            target="_blank"
            rel="noreferrer"
          >
            <GithubLogoIcon size={19} weight="fill" />
            GitHub<span className="sr-only"> (opens in a new tab)</span>
          </a>
          <span className="landing-nav-divider" aria-hidden="true" />
          <Link to="/login">Sign In</Link>
          <Link className="landing-button landing-button-small" to="/register">
            Get Started
            <ArrowRightIcon size={16} weight="bold" />
          </Link>
        </nav>
      </header>
      <main id="landing-main">
        <section className="landing-hero" aria-labelledby="landing-heading">
          <div className="landing-hero-copy">
            <p className="landing-eyebrow">
              <SparkleIcon size={15} weight="fill" /> A little space. Endless
              possibilities.
            </p>
            <h1 id="landing-heading">
              Think it. Sketch it.
              <br />
              Build it{" "}
              <span>
                together.
                <svg viewBox="0 0 350 17" aria-hidden="true">
                  <path d="M4 10Q166-2 346 8M30 14Q180 5 324 12" />
                </svg>
              </span>
            </h1>
            <p className="landing-subtitle">
              A shared canvas for ideas, sketches, and everything in between.
            </p>
            <div className="landing-hero-actions">
              <Link
                className="landing-button"
                to={mode === "pages" ? "/pages" : "/register"}
              >
                {mode === "pages"
                  ? "Create Thesis Document"
                  : "Start Your Own Board"}
                <ArrowRightIcon size={18} weight="bold" />
              </Link>
              <a className="landing-text-link" href="#playground">
                Or give it a little scribble <span aria-hidden="true">↘</span>
              </a>
            </div>
            <p className="landing-no-signup">
              No sign-up needed to try the canvas below.
            </p>
          </div>
          <section
            className="landing-playground"
            id="playground"
            aria-label={
              mode === "pages"
                ? "Interactive Pages preview"
                : "Interactive whiteboard preview"
            }
            aria-describedby="preview-instructions"
          >
            <div
              className="landing-mode-switch"
              role="group"
              aria-label="Product mode"
            >
              <button
                aria-pressed={mode === "whiteboard"}
                onClick={() => setMode("whiteboard")}
              >
                Whiteboard
              </button>
              <button
                aria-pressed={mode === "pages"}
                onClick={() => setMode("pages")}
              >
                Pages
              </button>
            </div>
            <div className="landing-preview-intro">
              <span>
                <CursorIcon size={17} weight="fill" />
                {mode === "pages"
                  ? "Your next chapter starts here."
                  : "Go on, make a mess."}
              </span>
              <p id="preview-instructions">
                {mode === "pages"
                  ? "Edit a paragraph. Try a heading. Explore the chapters."
                  : "Drag a note. Double-click to edit. Make it yours."}
              </p>
            </div>
            <DeferredPreview mode={mode} />
            <div className="landing-preview-footnote">
              <span>
                <span className="landing-status-dot" />A real canvas. A fresh
                start on every visit.
              </span>
              <span>Demo edits aren’t saved or shared.</span>
            </div>
          </section>
        </section>
        <section
          className="landing-features"
          id="features"
          aria-labelledby="features-heading"
        >
          <div className="landing-section-title">
            <p className="landing-eyebrow">LESS FRICTION. MORE IDEAS.</p>
            <h2 id="features-heading">
              Space to think. Tools to make it happen.
            </h2>
            <p>From the first “what if” to the next “let’s do this.”</p>
          </div>
          <div className="landing-feature-grid">
            <article>
              <span className="landing-feature-icon feature-yellow">
                <NoteIcon size={25} weight="fill" />
              </span>
              <h3>Catch the little sparks.</h3>
              <p>
                Drop a sticky note, change its color, and move ideas around
                until things click.
              </p>
              <span className="landing-feature-detail">
                Sticky notes · Text · Colors
              </span>
            </article>
            <article>
              <span className="landing-feature-icon feature-mint">
                <PencilSimpleIcon size={25} weight="fill" />
              </span>
              <h3>Show what you mean.</h3>
              <p>
                Sketch a thought, connect the dots, or zoom out to see the
                bigger picture.
              </p>
              <span className="landing-feature-detail">
                Drawing · Shapes · Infinite canvas
              </span>
            </article>
            <article>
              <span className="landing-feature-icon feature-lavender">
                <UsersThreeIcon size={25} weight="fill" />
              </span>
              <h3>Make room for everyone.</h3>
              <p>
                Invite people to your saved boards and work together with live
                edits and cursors.
              </p>
              <span className="landing-feature-detail">
                Shared boards · Live collaboration
              </span>
            </article>
          </div>
        </section>
        <section className="landing-closing">
          <SparkleIcon size={30} weight="fill" aria-hidden="true" />
          <h2>Your next big idea needs a little space.</h2>
          <Link className="landing-button" to="/register">
            Start Your Own Board
            <ArrowRightIcon size={18} weight="bold" />
          </Link>
        </section>
      </main>
      <footer className="landing-footer">
        <Link className="landing-brand" to="/">
          <BrandMark />
          <span>CollabCanvas.</span>
        </Link>
        <p>A shared space for what’s next.</p>
        <a href={githubUrl} target="_blank" rel="noreferrer">
          Made for making together <GithubLogoIcon size={19} weight="fill" />
          <span className="sr-only">GitHub (opens in a new tab)</span>
        </a>
      </footer>
    </div>
  );
}
