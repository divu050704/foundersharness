import { api } from "./api";

/**
 * Sends an email to an agent via the /api/agents/send-email endpoint matching EmailAgentDTO format:
 * export class EmailAgentDTO {
 *   receiver!: string;
 *   content!: string;
 *   attachments!: [string];
 *   subject!: string;
 * }
 */
export async function sendEmailToAgent({ receiver, content, attachments = [], subject }) {
  const payload = {
    receiver: receiver || "",
    content: content || "",
    attachments: Array.isArray(attachments)
      ? attachments
      : attachments
      ? [String(attachments)]
      : [],
    subject: subject || "No Subject",
  };

  try {
    const data = await api.post("/api/agents/send-email", payload);
    return { success: true, data };
  } catch (error) {
    console.error("Error sending email to /api/agents/send-email:", error);
    return { success: false, error };
  }
}
