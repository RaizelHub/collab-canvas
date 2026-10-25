import { useEffect, useState } from "react";
import type * as Y from "yjs";
export function useDocumentRevision(doc: Y.Doc) {
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const changed = () => setRevision((n) => n + 1);
    doc.on("update", changed);
    return () => doc.off("update", changed);
  }, [doc]);
  return revision;
}
