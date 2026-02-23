import { HttpError } from "@/common/errors/http-error.js";
import * as repo from "./enquiries.repository.js";
import { sendEnquiryConfirmation } from "./enquiries.email.js";
import type { CreateEnquiryInput, UpdateEnquiryStatusInput } from "./enquiries.schema.js";

export const createEnquiry = async (data: CreateEnquiryInput) => {
  const enquiry = await repo.create(data);
  // send confirmation — non-blocking
  sendEnquiryConfirmation(enquiry.email, enquiry.name).catch(console.error);
  return enquiry;
};

export const getEnquiryById = async (id: string) => {
  const enquiry = await repo.findById(id);
  if (!enquiry) {
    throw new HttpError(404, "NOT_FOUND", "Enquiry not found");
  }
  return enquiry;
};

export const updateEnquiryStatus = async (
  id: string,
  data: UpdateEnquiryStatusInput,
) => {
  await getEnquiryById(id);
  return repo.updateStatus(id, data.status);
};

export const listEnquiries = (params: repo.FindAllParams) => {
  return repo.findAll(params);
};
