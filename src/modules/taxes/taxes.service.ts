import { HttpError } from "@/common/errors/http-error.js";
import type { CreateTaxInput, UpdateTaxInput, ListTaxesFilters } from "./taxes.inputs.js";
import type { TaxDTO } from "./taxes.dto.js";
import * as repo from "./taxes.repository.js";

const mapTax = (t: any): TaxDTO => ({
  id: t.id,
  name: t.name,
  rate: Number(t.rate),
  taxType: t.taxType,
  appliesTo: t.appliesTo,
  isActive: t.isActive,
  createdAt: t.createdAt,
  updatedAt: t.updatedAt,
});

export const createTax = async (data: CreateTaxInput): Promise<TaxDTO> => {
  const tax = await repo.createTax(data);
  return mapTax(tax);
};

export const getTaxById = async (id: string): Promise<TaxDTO> => {
  const tax = await repo.findTaxById(id);

  if (!tax) {
    throw new HttpError(404, "NOT_FOUND", "Tax not found");
  }

  return mapTax(tax);
};

export const updateTax = async (id: string, data: UpdateTaxInput): Promise<TaxDTO> => {
  const existing = await repo.findTaxById(id);

  if (!existing) {
    throw new HttpError(404, "NOT_FOUND", "Tax not found");
  }

  const tax = await repo.updateTaxById(id, data);
  return mapTax(tax);
};

export const deleteTax = async (id: string): Promise<void> => {
  const existing = await repo.findTaxById(id);

  if (!existing) {
    throw new HttpError(404, "NOT_FOUND", "Tax not found");
  }

  await repo.deleteTaxById(id);
};

export const listTaxes = async (filters: ListTaxesFilters) => {
  const [items, total] = await Promise.all([
    repo.listTaxes(filters),
    repo.countTaxes({
      ...(filters.isActive !== undefined && { isActive: filters.isActive }),
      ...(filters.appliesTo !== undefined && { appliesTo: filters.appliesTo }),
    }),
  ]);

  return {
    items: items.map(mapTax),
    pagination: {
      page: filters.page,
      limit: filters.limit,
      total,
      totalPages: Math.ceil(total / filters.limit),
    },
  };
};
