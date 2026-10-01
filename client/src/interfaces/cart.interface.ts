import type { IUser } from "./user.interface";

export interface ICart extends Document {
  id: string;
  user: IUser[];
  items: string[];
  totalAmount: number;
  createdAt: Date;
  updatedAt: Date;
}
