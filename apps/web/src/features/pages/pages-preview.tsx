import { useEffect, useRef, useState } from "react";
import { WritingStudio } from "./writing-studio";
import { createManuscript } from "./document-state";
export default function PagesPreview() {
  const [generation, setGeneration] = useState(0);
  return (
    <div style={{ height: "100%", position: "relative" }}>
      <DemoDocument key={generation} />
      <button
        className="pages-demo-reset"
        onClick={() => setGeneration((n) => n + 1)}
      >
        Reset Pages demo
      </button>
    </div>
  );
}
function DemoDocument() {
  const dispose = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [doc] = useState(() =>
    createManuscript("thesis", "A thesis starts with a question"),
  );
  useEffect(() => {
    clearTimeout(dispose.current);
    return () => {
      dispose.current = setTimeout(() => doc.destroy(), 0);
    };
  }, [doc]);
  return <WritingStudio doc={doc} role="owner" status="Temporary demo" demo />;
}
