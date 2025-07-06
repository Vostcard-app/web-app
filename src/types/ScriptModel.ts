  export interface Script {
    id: string;
    title: string;
    content: string;
    createdAt?: string;
    updatedAt?: string;
    authorId?: string;
    tags?: string[];
  }