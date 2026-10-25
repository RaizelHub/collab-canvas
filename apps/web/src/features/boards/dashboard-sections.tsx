import {
  BriefcaseBusiness,
  GraduationCap,
  Lightbulb,
  ListChecks,
  PanelsTopLeft,
} from "lucide-react";
import { BOARD_TEMPLATES, type BoardTemplate } from "../templates/templates";
import type { LocalBoard } from "./local-board";

const categories = [
  {
    title: "Business Planning",
    description: "Turn big ideas into a clear plan for growth.",
    icon: BriefcaseBusiness,
    template: "impact-effort-matrix",
  },
  {
    title: "Education",
    description: "Make room for shared ideas and new perspectives.",
    icon: GraduationCap,
    template: "mind-map",
  },
  {
    title: "Design Thinking",
    description: "Explore possibilities and solve problems together.",
    icon: Lightbulb,
    template: "sprint-retro",
  },
  {
    title: "Project Management",
    description: "Organize your work and keep progress visible.",
    icon: ListChecks,
    template: "kanban-workflow",
  },
];

export function DashboardSections<Board extends LocalBoard>({
  boards,
  onOpen,
  onTemplate,
  onBrowse,
  isShared,
}: {
  boards: Board[];
  onOpen: (board: Board) => void;
  onTemplate: (template: BoardTemplate) => void;
  onBrowse: () => void;
  isShared?: (board: Board) => boolean;
}) {
  const groups = [
    {
      title: "My Boards",
      boards: boards.filter((board) => !isShared?.(board)),
    },
    {
      title: "Shared with Me",
      boards: boards.filter((board) => isShared?.(board)),
    },
  ];
  return (
    <>
      <section className="dashboard-templates" aria-label="Templates">
        <div className="dashboard-section-heading">
          <h2>Templates</h2>
          <button onClick={onBrowse} type="button">
            Browse all
          </button>
        </div>
        <div className="template-category-grid">
          {categories.map(
            ({ title, description, icon: Icon, template }, index) => (
              <button
                className={`template-category template-category-${index}`}
                key={title}
                onClick={() =>
                  onTemplate(
                    BOARD_TEMPLATES.find((item) => item.id === template)!,
                  )
                }
                type="button"
              >
                <span className="template-category-icon">
                  <Icon size={19} />
                </span>
                <strong>{title}</strong>
                <span>{description}</span>
                <span className="template-category-link">
                  Use Template <span aria-hidden="true">→</span>
                </span>
              </button>
            ),
          )}
        </div>
      </section>
      <div className="dashboard-board-lists">
        {groups.map((group) => (
          <section key={group.title}>
            <div className="dashboard-section-heading">
              <h2>{group.title}</h2>
              <span>{group.boards.length} boards</span>
            </div>
            <div className="dashboard-board-rows">
              {group.boards.slice(0, 5).map((board) => (
                <button
                  className="dashboard-board-row"
                  key={board.id}
                  onClick={() => onOpen(board)}
                  type="button"
                >
                  <span className="board-row-icon">
                    <PanelsTopLeft size={22} />
                  </span>
                  <span>
                    <strong>{board.title}</strong>
                    <small>
                      Updated{" "}
                      {new Date(board.updatedAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </small>
                  </span>
                  <span className="board-row-open">Open →</span>
                </button>
              ))}
              {group.boards.length === 0 && (
                <p className="board-list-empty">
                  {group.title === "My Boards"
                    ? "Your next idea starts with a new board."
                    : "Boards shared with you will appear here."}
                </p>
              )}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
