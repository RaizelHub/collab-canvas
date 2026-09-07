import {
  useEffect,
  useId,
  useRef,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";

const focusableSelector = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "summary",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

interface AccessibleDialogProps {
  children: ReactNode;
  description: string;
  initialFocusRef?: RefObject<HTMLElement | null>;
  onClose: () => void;
  panelClassName?: string;
  title: string;
}

export function AccessibleDialog({
  children,
  description,
  initialFocusRef,
  onClose,
  panelClassName = "max-w-md",
  title,
}: AccessibleDialogProps) {
  const generatedId = useId().replaceAll(":", "");
  const titleId = `dialog-title-${generatedId}`;
  const descriptionId = `dialog-description-${generatedId}`;
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const previouslyFocused =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const appRoot = document.getElementById("root");
    appRoot?.setAttribute("inert", "");

    const getFocusableElements = () =>
      Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(focusableSelector) ??
          [],
      ).filter((element) => element.getAttribute("aria-hidden") !== "true");

    const focusInitialElement = () => {
      const target = initialFocusRef?.current ?? getFocusableElements()[0];
      target?.focus();
    };
    focusInitialElement();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab") return;

      const focusableElements = getFocusableElements();
      const first = focusableElements[0];
      const last = focusableElements.at(-1);
      if (!first || !last) {
        event.preventDefault();
        dialogRef.current?.focus();
        return;
      }

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (
        !event.shiftKey &&
        (document.activeElement === last ||
          !dialogRef.current?.contains(document.activeElement))
      ) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown, true);
    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
      appRoot?.removeAttribute("inert");
      previouslyFocused?.focus();
    };
  }, [initialFocusRef]);

  return createPortal(
    <div
      aria-describedby={descriptionId}
      aria-labelledby={titleId}
      aria-modal="true"
      className="fixed inset-0 z-[70] grid place-items-center bg-black/40 p-4"
      ref={dialogRef}
      role="dialog"
      tabIndex={-1}
    >
      <div
        className={`max-h-[calc(100dvh-2rem)] w-full overflow-y-auto border border-line bg-panel p-5 text-ink shadow-xl ${panelClassName}`}
      >
        <h2 className="text-base font-semibold" id={titleId}>
          {title}
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted" id={descriptionId}>
          {description}
        </p>
        {children}
      </div>
    </div>,
    document.body,
  );
}
