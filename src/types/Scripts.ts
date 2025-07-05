// src/types/Script.ts

export interface Script {
  id: string;           // Unique identifier for the script
  title: string;        // Title or name of the script
  content: string;      // The actual script text/content
  createdAt?: string;   // (Optional) ISO date string for when the script was created
  updatedAt?: string;   // (Optional) ISO date string for last update
  authorId?: string;    // (Optional) User ID of the script's creator
  tags?: string[];      // (Optional) Tags or categories for the script
}