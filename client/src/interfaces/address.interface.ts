import type { IUser } from "./user.interface";

export interface IAddress extends Document {
  id:string;
  user: IUser;
  fullName: string;
  addressLine: string;
  phone: string;
  city: string;
  country: {
    type: String;
    required: true;
  };
  postalCode: {
    type: String;
    required: true;
  };
  isDefault: {
    type: Boolean;
    required: true;
  };
  createdAt: Date;
  updatedAt: Date;
}
