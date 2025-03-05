// Types for the Updates and News section
export interface Update {
  id: string;
  title: string;
  content: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  createdBy: string;
}

export const createUpdate = (data: Partial<Update>): Update => {
  const now = new Date();
  return {
    id: data.id || `update_${Date.now()}`,
    title: data.title || '',
    content: data.content || '',
    createdAt: data.createdAt || now,
    updatedAt: data.updatedAt || now,
    createdBy: data.createdBy || '',
  };
};
