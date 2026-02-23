import type { TaxType } from "@/generated/prisma/enums.js";

export type TaxDTO = {
  id: string;
  name: string;
  rate: number;
  taxType: TaxType;
  appliesTo: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};
