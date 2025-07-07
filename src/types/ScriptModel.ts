// src/types/ScriptModel.ts
export interface Script {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  authorId: string;
  tags: string[];
  // Add any other fields your Script type needs
}