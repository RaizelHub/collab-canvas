export function getBoardPersistenceKey(boardId: string): string {
  return `collab-canvas-board-${boardId}`;
}
