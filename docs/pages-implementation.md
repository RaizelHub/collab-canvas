# CollabCanvas Pages — implementation and validation

Pages is a separate React/Tiptap/Yjs subsystem. Whiteboard uses its existing tldraw engine. Open **Pages** in the dashboard navigation, or switch the landing playground from Whiteboard to Pages.

## Phase 1 — library, templates, studio

Implemented six editable templates: undergraduate thesis, capstone, proposal, paper, technical documentation, and blank academic document. The thesis has fourteen editable sections with preliminary/main section metadata. The studio has a collapsible outline, floating formatting bar, paper writing area, reference panel, and creative dock. Templates contain explicit prompts, not fabricated research.

Validation: template/permission/format tests; browser inspection of the studio. Browser drafts are explicitly device-local; cloud creation does not silently fall back to a local draft.

## Phase 2 — editing and persistence

Tiptap provides paragraphs, headings, marks, lists, tables, links, images, history, keyboard shortcuts, and structured JSON. Find/replace preserves surrounding structure. Yjs holds the manuscript; IndexedDB provides browser persistence and recovery of unsent cloud edits. Named checkpoints and downloadable `.pages.json` backups provide recovery. Importing a backup creates a new browser draft.

Formatting supports A4, Letter, custom dimensions, orientation, margins, five system font choices, font size, paragraph/line spacing, indentation, alignment, and selection font overrides. Presets are editable starting points.

Validation: editor tests include simultaneous edits merged from two independent Yjs replicas. A browser keyboard crash found during validation was fixed by selecting the editor transaction number rather than deep-comparing cyclic editor nodes.

## Phase 3 — pagination

**Writing is continuous; it is not live paginated WYSIWYG editing.** The separate Print layout uses Paged.js to flow actual content onto pages. It generates contents with resolved page numbers, header/footer text, section/page breaks, Roman preliminary numbering and Arabic main numbering, heading keep-with-next rules, and footnotes. The print iframe isolates Paged.js styles from the application.

Validation: the thesis produced 14 A4 pages; PDF inspection confirmed preliminary i–vii and main 1–7, with Chapter 1 on main page 1 and matching contents links. A separate long-manuscript browser check produced 29 pages, retained all 45 table rows and the footnote fixture. A browser save/reopen/import check preserved the title and created a separate recovery draft. The browser print dialog supplies PDF export. Disable browser headers/footers, use 100% scale, and select the matching paper size.

Limitations: no editable page thumbnails, individual-section paper sizes, or running live pagination. Tall table rows, oversized images, complicated footnotes, and font substitution require print review. Tables can break between rows; a row taller than a page is not guaranteed to fit. Pagination is generated on demand to keep typing responsive. This is not yet a certified thesis typesetting engine.

## Phase 4 — sources and academic objects

Reference metadata is entered by the author; nothing is invented or fetched automatically. Citation.js/citeproc formats APA 7, IEEE, and MLA using CSL styles. Missing fields are flagged. Citations retain source IDs; bibliography, numbered figure/table captions, lists, and cross-references regenerate for print/export. Source removal leaves a visible missing-source warning in output.

Limitations: basic book, journal article, webpage, and report metadata; publication year rather than full dates; no DOI metadata retrieval, citation locators, advanced legal types, or per-citation prefix/suffix editing. Review rendered citations against institutional requirements. Bibliographies include all library entries. DOCX citations are formatted text, not Word citation-manager fields.

## Phase 5 — interchange

DOCX export includes text marks, headings/bookmarks, tables, embedded original-resolution images, captions, cross-reference links, footnotes, paper/margin settings, headers/footers, Roman/main section numbering, and a Word TOC field. Update fields in Word to populate the TOC. PDF uses the paginated browser output. DOCX import uses Mammoth and DOMPurify, appends content, and warns about fidelity limits.

Validation: a downloaded DOCX was opened as a ZIP and its OOXML inspected for two numbering sections, A4 dimensions, expected chapter text, and TOC instructions. A retained unit test opens exported content with Mammoth. A generated PDF was inspected for its 14 pages, A4 dimensions, chapter text, and contents numbers.

Limitations: Word and browsers paginate differently. DOCX import does not preserve page settings, headers/footers, tracked changes, or citation fields. Complex layouts are not lossless. Lists of figures/tables are linked text in DOCX rather than Word-generated page-number fields. Ordered lists export as numbered paragraphs. Native charts, shapes, and diagram editing remain in Whiteboard; insert exported PNGs in Pages. PDF tagging/accessibility compliance has not been certified.

## Phase 6 — access, comments, history

`supabase/migrations/20261024000100_pages.sql` defines manuscripts, membership, append-only Yjs updates, comments, and revisions with row-level security. Owners grant editor/commenter/viewer access to registered accounts. Commenters cannot write manuscript updates. Content uses Yjs updates, not whole-document JSON last-write-wins. Cloud changes and comments reconcile every three seconds, including missed updates. Document title and formatting/source metadata use Yjs map conflict semantics. Named checkpoints are explicit; there is no automatic time-travel history or suggested-edit mode.

**Deployment is pending.** A linked-project migration dry run failed with HTTP 403: the configured account lacks the required privileges. No remote schema was changed. Docker's local daemon was unavailable, so SQL policies and real multi-user cloud transport have not been integration-tested. The Yjs convergence tests are not a substitute for those tests.

An authorized project administrator should review and apply the migration, then verify owner/editor/commenter/viewer access with separate accounts, revocation, reconnect/offline recovery, comments, checkpoint restore, and concurrent editing. Existing Whiteboard tables and policies are untouched. Do not disable RLS to make deployment work.

Operational limitations: three-second polling, no presence cursors; update-ID scans grow with log length and need server-side snapshot compaction for sustained large deployments. Full CRDT recovery state is uploaded when reopening a writable document; normal saves append incremental updates. Images and explicit revision snapshots increase document size (16 MB database update limit). Browser storage is not an encrypted vault and can be cleared by the browser/user. Existing open clients may retain previously loaded content after access revocation; new writes are checked by RLS. No invitation email is sent.

## Phase 7 — product integration

Dashboard navigation opens Pages. Landing Whiteboard/Pages modes lazy-load independent temporary demos; the Pages CTA enters the existing protected authentication flow. The sample supports editing, headings, chapter navigation, and reset. Demo changes never create production documents or collaboration rooms. Whiteboard visuals are transferred using its existing PNG export and Pages image insertion, preserving the source bitmap.

Validation: six Playwright tests pass across Whiteboard, Pages, export, and recovery, covering editing/reset, navigation/headings, mobile overflow, temporary reload behavior, and absence of board/document network traffic.

## Checks and dependencies

Root unit tests (70 passing), lint, TypeScript checks, and production builds were run. Existing Whiteboard regression tests pass. Vite continues to warn about large lazy chunks; citation, pagination, DOCX, and import tooling load on demand. Restart the development server after installing dependencies; Vite may retain paths to older editor packages.

The new Tiptap dependencies were patched to 3.32.0 following npm audit, and compatible ProseMirror/source-map updates were applied. Remaining audit findings in existing tooling/dependencies require a separate upgrade assessment; no broad breaking audit-fix was applied.

References: [Tiptap collaboration](https://tiptap.dev/docs/editor/extensions/functionality/collaboration), [Paged.js](https://pagedjs.org/documentation/), [Citation.js](https://citation.js.org/), [official CSL styles](https://github.com/citation-style-language/styles), [docx](https://docx.js.org/), [Mammoth](https://github.com/mwilliamson/mammoth.js).

CSL attribution: APA 7 is bundled by `@citation-js/plugin-csl`. IEEE and MLA files are vendored from the official CSL repository; their embedded author and CC BY-SA license declarations are retained. Retrieved October 24, 2026.
