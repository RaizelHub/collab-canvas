import "@testing-library/jest-dom/vitest";

if (typeof window !== "undefined") {
  if (!window.CSS) {
    (window as unknown as { CSS: { supports: () => boolean } }).CSS = {
      supports: () => false,
    };
  } else if (!window.CSS.supports) {
    window.CSS.supports = () => false;
  }
}
