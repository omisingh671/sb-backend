import type { TaxType } from "@/generated/prisma/enums.js";

export type CreateTaxInput = {
  name: string;
  rate: number;
  taxType: TaxType;
  appliesTo: string;
};

export type UpdateTaxInput = {
  name?: string | undefined;
  rate?: number | undefined;
  taxType?: TaxType | undefined;
  appliesTo?: string | undefined;
  isActive?: boolean | undefined;
};

export type ListTaxesFilters = {
  page: number;
  limit: number;
  isActive?: boolean;
  appliesTo?: string;
};
