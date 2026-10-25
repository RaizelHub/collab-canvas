import type { JSONContent } from "@tiptap/core";
export interface AcademicTemplate {
  id: string;
  name: string;
  description: string;
  color: string;
  sections: string[];
}
export const ACADEMIC_TEMPLATES: AcademicTemplate[] = [
  {
    id: "thesis",
    name: "Undergraduate thesis",
    description: "A customizable five-chapter starting point.",
    color: "#e9e0fb",
    sections: [
      "Title page",
      "Approval page",
      "Acknowledgments",
      "Abstract",
      "Table of contents",
      "List of tables",
      "List of figures",
      "Chapter 1: Introduction",
      "Chapter 2: Review of Related Literature",
      "Chapter 3: Methodology",
      "Chapter 4: Results and Discussion",
      "Chapter 5: Summary, Conclusions, and Recommendations",
      "References",
      "Appendices",
    ],
  },
  {
    id: "capstone",
    name: "Capstone documentation",
    description: "From the problem to implementation and evaluation.",
    color: "#d9efe9",
    sections: [
      "Title page",
      "Abstract",
      "Table of contents",
      "Chapter 1: Introduction",
      "Chapter 2: Related Work",
      "Chapter 3: Design and Methodology",
      "Chapter 4: Implementation and Evaluation",
      "Chapter 5: Conclusions",
      "References",
      "Appendices",
    ],
  },
  {
    id: "proposal",
    name: "Research proposal",
    description: "Frame a question and a defensible plan.",
    color: "#fff0c9",
    sections: [
      "Title page",
      "Abstract",
      "Introduction",
      "Literature Review",
      "Research Questions",
      "Proposed Methodology",
      "Timeline",
      "References",
    ],
  },
  {
    id: "paper",
    name: "Research paper",
    description: "A focused structure for reporting your work.",
    color: "#dceafa",
    sections: [
      "Title page",
      "Abstract",
      "Introduction",
      "Methods",
      "Results",
      "Discussion",
      "Conclusion",
      "References",
    ],
  },
  {
    id: "technical",
    name: "Technical documentation",
    description: "Explain a system, its design, and its use.",
    color: "#f8dfe8",
    sections: [
      "Overview",
      "Requirements",
      "Architecture",
      "Implementation",
      "Testing",
      "Deployment",
      "References",
    ],
  },
  {
    id: "blank",
    name: "Blank academic document",
    description: "A clean page. Your own structure.",
    color: "#e9e9e5",
    sections: ["Untitled section"],
  },
];
export function templateContent(templateId: string): JSONContent {
  const template =
    ACADEMIC_TEMPLATES.find((t) => t.id === templateId) ??
    ACADEMIC_TEMPLATES[5]!;
  const firstMain = template.sections.findIndex(
    (s) =>
      s.startsWith("Chapter 1") ||
      s === "Introduction" ||
      s === "Overview" ||
      s === "Untitled section",
  );
  return {
    type: "doc",
    content: template.sections.flatMap((title, index): JSONContent[] => {
      const generated =
        title === "Table of contents"
          ? "toc"
          : title === "List of tables"
            ? "tables"
            : title === "List of figures"
              ? "figures"
              : title === "References"
                ? "bibliography"
                : null;
      return [
        {
          type: "heading",
          attrs: {
            level: 1,
            id: `section-${index}`,
            section: index < firstMain ? "preliminary" : "main",
          },
          content: [{ type: "text", text: title }],
        },
        generated
          ? { type: "generatedIndex", attrs: { kind: generated } }
          : {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text:
                    title === "Title page"
                      ? "[Your research title] · [Author] · [Institution] · [Date]"
                      : title === "Approval page"
                        ? "[Insert your institution’s required approval wording and signatures.]"
                        : `Write your ${title.replace(/^Chapter \d+: /, "").toLowerCase()} here. Replace this prompt with your own verified work.`,
                },
              ],
            },
      ];
    }),
  };
}
