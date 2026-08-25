import "@testing-library/jest-dom/vitest";

if (typeof window !== "undefined") {
  if (!window.CSS) {
    (window as any).CSS = { supports: () => false };
  } else if (!window.CSS.supports) {
    window.CSS.supports = () => false;
  }
}
