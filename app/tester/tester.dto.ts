import { type BaseSchema } from "../common/dto/base.dto";

export interface ITester extends BaseSchema {
  name: string;
  email: string;
  message: string;
}
