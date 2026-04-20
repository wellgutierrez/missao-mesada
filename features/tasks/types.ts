export type Task = {
  id: string;
  title: string;
  type: "bonus" | "discount";
  amount: number;
  owner_user_id?: string | null;
  is_active?: boolean;
};

export type TaskInput = {
  title: string;
  type: "bonus" | "discount";
  amount: number;
  is_active?: boolean;
};