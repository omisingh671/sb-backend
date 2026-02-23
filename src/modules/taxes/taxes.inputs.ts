import type { TaxType } from "@/generated/prisma/enums.js";

export type CreateTaxInput = {
  name: string;
  rate: number;
  taxType: TaxType;
  appliesTo: string;
};

export type UpdateTaxInput = Partial<CreateTaxInput> & {
  isActive?: boolean;
};

export type ListTaxesFilters = {
  page: number;
  limit: number;
  isActive?: boolean;
  appliesTo?: string;
};
