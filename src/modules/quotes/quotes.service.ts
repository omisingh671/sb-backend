import { HttpError } from "@/common/errors/http-error.js";
import * as repo from "./quotes.repository.js";
import type { CreateQuoteInput, UpdateQuoteStatusInput } from "./quotes.schema.js";

export const createQuote = (data: CreateQuoteInput) => {
  return repo.create(data);
};

export const getQuoteById = async (id: string) => {
  const quote = await repo.findById(id);
  if (!quote) {
    throw new HttpError(404, "NOT_FOUND", "Quote not found");
  }
  return quote;
};

export const updateQuoteStatus = async (id: string, data: UpdateQuoteStatusInput) => {
  await getQuoteById(id);
  return repo.updateStatus(id, data.status);
};

export const listQuotes = (params: repo.FindAllParams) => {
  return repo.findAll(params);
};
