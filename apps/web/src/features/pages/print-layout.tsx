import { useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/core";
import type { CitationStyle, PaperFormat, ReferenceSource } from "./model";
import { materializeHtml, printCss } from "./print-content";
import pagedScript from "../../../../../node_modules/pagedjs/dist/paged.polyfill.js?url";
import { createPortal } from "react-dom";
export function PrintLayout({
  editor,
  format,
  sources,
  style,
  title,
  onClose,
}: {
  editor: Editor;
  format: PaperFormat;
  sources: ReferenceSource[];
  style: CitationStyle;
  title: string;
  onClose: () => void;
}) {
  const frame = useRef<HTMLIFrameElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  const [count, setCount] = useState(0);
  const [error, setError] = useState("");
  const [source] = useState(() => {
    const content = materializeHtml(editor.getHTML(), sources, style);
    const escapedTitle = title.replace(/[<>&]/g, "");
    return `<!doctype html><html><head><meta charset='utf-8'><title>${escapedTitle}</title><style>${printCss(format)}</style><script>window.PagedConfig={auto:false};</script></head><body>${content}<script src='${pagedScript}'></script><script>
    (async()=>{try {await document.fonts.ready;const flow=await window.PagedPolyfill.preview();let preliminary=0,main=0;const labels=new Map();const roman=n=>{let out='';for(const [v,s] of [[1000,'m'],[900,'cm'],[500,'d'],[400,'cd'],[100,'c'],[90,'xc'],[50,'l'],[40,'xl'],[10,'x'],[9,'ix'],[5,'v'],[4,'iv'],[1,'i']])while(n>=v){out+=s;n-=v;}return out;};let mode='preliminary';
    for(const page of document.querySelectorAll('.pagedjs_page')) {const section=page.querySelector('[data-numbering]');if(section)mode=section.dataset.numbering;const label=mode==='preliminary'?roman(++preliminary):String(++main);const box=page.querySelector('.pagedjs_margin-bottom-center .pagedjs_margin-content');if(box){box.textContent=${format.numbering ? "label" : "String()"};box.parentElement.style.visibility='visible';}for(const anchor of page.querySelectorAll('[id]'))if(!labels.has(anchor.id))labels.set(anchor.id,label);}
    for(const item of document.querySelectorAll('[data-toc-target]'))item.textContent=labels.get(item.dataset.tocTarget)||'?';
    parent.postMessage({type:'pages-print-ready',count:flow.total},parent.location.origin);
    } catch(error){parent.postMessage({type:'pages-print-error',message:String(error)},parent.location.origin);}})();
    </script></body></html>`;
  });
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const root = document.getElementById("root");
    root?.setAttribute("inert", "");
    close.current?.focus();
    const listener = (event: MessageEvent) => {
      if (
        event.source !== frame.current?.contentWindow ||
        event.origin !== window.location.origin
      )
        return;
      if (event.data?.type === "pages-print-ready") setCount(event.data.count);
      if (event.data?.type === "pages-print-error")
        setError(event.data.message);
    };
    window.addEventListener("message", listener);
    return () => {
      root?.removeAttribute("inert");
      previous?.focus();
      window.removeEventListener("message", listener);
    };
  }, []);
  return createPortal(
    <section
      className="pages-print-dialog"
      role="dialog"
      aria-modal="true"
      aria-label="Print layout"
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <header className="pages-print-header">
        <strong>
          Print layout · {count ? `${count} pages` : "Paginating…"}
        </strong>
        <button
          disabled={!count}
          onClick={() => frame.current?.contentWindow?.print()}
        >
          Print / Save PDF
        </button>
        <button ref={close} onClick={onClose}>
          Back to writing
        </button>
      </header>
      <p>
        Choose Save as PDF in the print dialog. Use the document’s paper size,
        100% scale, and disable browser headers/footers. Review long tables and
        footnotes before submission.
      </p>
      {error && <p role="alert">Pagination failed: {error}</p>}
      <iframe
        ref={frame}
        title="Paginated manuscript"
        srcDoc={source}
        sandbox="allow-scripts allow-same-origin allow-modals"
      />
    </section>,
    document.body,
  );
}
