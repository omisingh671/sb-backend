import { mailer } from "@/common/email/mailer.js";
import { env } from "@/config/env.js";

export const sendEnquiryConfirmation = async (to: string, name: string) => {
  await mailer.sendMail({
    from: env.MAIL_FROM,
    to,
    subject: "We received your enquiry",
    html: `
      <p>Hi ${name},</p>
      <p>Thank you for reaching out! We have received your enquiry and will get back to you shortly.</p>
      <p>Best regards,<br/>The Sucasa Team</p>
    `,
  });
};
