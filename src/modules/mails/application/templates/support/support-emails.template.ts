import { EMAIL_BRAND } from "../layout/email-brand";
import {
  escapeHtml,
  renderStandardEmailLayout,
} from "../layout/standard-email-layout.template";
import type { RenderedEmail } from "../alerts/unfollow-alert-email.template";

function firstNameOf(name: string): string {
  return name.trim().split(" ")[0] || name;
}

// A quoted block of user- or team-written text (line breaks preserved).
function quote(label: string, text: string): string {
  return `
    <p style="margin:0 0 6px 0;color:${EMAIL_BRAND.text};font-weight:700;">${escapeHtml(label)}</p>
    <div style="margin:0 0 16px 0;padding:12px 14px;border-radius:12px;background:${EMAIL_BRAND.cardBackground};border:1px solid ${EMAIL_BRAND.border};color:${EMAIL_BRAND.text};font-size:14px;white-space:pre-wrap;">${escapeHtml(text)}</div>`;
}

export type SupportTicketEmailInput = {
  name: string;
  appUrl: string;
  /** Already formatted, e.g. "#000042". */
  protocol: string;
  categoryLabel: string;
  message: string;
};

/** To the user: we received your message. */
export function buildSupportConfirmationEmail(
  input: SupportTicketEmailInput,
): RenderedEmail {
  const firstName = firstNameOf(input.name);
  const subject = `Recebemos sua mensagem — chamado ${input.protocol}`;
  const html = renderStandardEmailLayout({
    title: subject,
    preheader: `Chamado ${input.protocol} aberto. Respondemos por e-mail.`,
    heading: "Recebemos sua mensagem",
    contentHtml: `
      <p style="margin:0 0 14px 0;color:${EMAIL_BRAND.text};">Olá, ${escapeHtml(firstName)}!</p>
      <p style="margin:0 0 16px 0;">Seu chamado <strong style="color:${EMAIL_BRAND.text};">${escapeHtml(input.protocol)}</strong> (${escapeHtml(input.categoryLabel)}) foi aberto. Nossa equipe vai responder por este e-mail.</p>
      ${quote("Sua mensagem", input.message)}`,
    footerNote:
      "Você recebeu este e-mail porque enviou uma mensagem ao suporte do FollowLens.",
  });
  const text = [
    `Olá, ${firstName}!`,
    "",
    `Seu chamado ${input.protocol} (${input.categoryLabel}) foi aberto. Nossa equipe vai responder por este e-mail.`,
    "",
    "Sua mensagem:",
    input.message,
  ].join("\n");
  return { subject, html, text };
}

export type SupportNotificationEmailInput = {
  userName: string;
  userEmail: string;
  appUrl: string;
  ticketId: string;
  protocol: string;
  categoryLabel: string;
  message: string;
};

/** To the team: a new ticket arrived. */
export function buildSupportNotificationEmail(
  input: SupportNotificationEmailInput,
): RenderedEmail {
  const appUrl = input.appUrl.replace(/\/$/, "");
  const subject = `Novo chamado ${input.protocol} — ${input.categoryLabel}`;
  const html = renderStandardEmailLayout({
    title: subject,
    preheader: `${input.userName} abriu um chamado de suporte.`,
    heading: `Novo chamado ${input.protocol}`,
    contentHtml: `
      <p style="margin:0 0 16px 0;"><strong style="color:${EMAIL_BRAND.text};">${escapeHtml(input.userName)}</strong> (${escapeHtml(input.userEmail)}) abriu um chamado em <strong style="color:${EMAIL_BRAND.text};">${escapeHtml(input.categoryLabel)}</strong>.</p>
      ${quote("Mensagem", input.message)}`,
    ctaLabel: "Responder o chamado",
    ctaUrl: `${appUrl}/admin/support/${input.ticketId}`,
    footerNote:
      "Você recebeu este e-mail porque é o contato de suporte deste painel FollowLens.",
  });
  const text = [
    `Novo chamado ${input.protocol} — ${input.categoryLabel}`,
    `${input.userName} (${input.userEmail})`,
    "",
    input.message,
    "",
    `Responder: ${appUrl}/admin/support/${input.ticketId}`,
  ].join("\n");
  return { subject, html, text };
}

/** To the user: the team replied. */
export function buildSupportReplyEmail(
  input: SupportTicketEmailInput & { reply: string },
): RenderedEmail {
  const firstName = firstNameOf(input.name);
  const subject = `Resposta ao seu chamado ${input.protocol}`;
  const html = renderStandardEmailLayout({
    title: subject,
    preheader: "Nossa equipe respondeu à sua mensagem.",
    heading: "Respondemos ao seu chamado",
    contentHtml: `
      <p style="margin:0 0 14px 0;color:${EMAIL_BRAND.text};">Olá, ${escapeHtml(firstName)}!</p>
      <p style="margin:0 0 16px 0;">Nossa equipe respondeu ao chamado <strong style="color:${EMAIL_BRAND.text};">${escapeHtml(input.protocol)}</strong> (${escapeHtml(input.categoryLabel)}).</p>
      ${quote("Resposta do suporte", input.reply)}
      ${quote("Sua mensagem", input.message)}
      <p style="margin:0;">Se precisar de mais alguma coisa, abra um novo chamado em Suporte.</p>`,
    ctaLabel: "Abrir o FollowLens",
    ctaUrl: `${input.appUrl.replace(/\/$/, "")}/support`,
    footerNote:
      "Você recebeu este e-mail porque enviou uma mensagem ao suporte do FollowLens.",
  });
  const text = [
    `Olá, ${firstName}!`,
    "",
    `Nossa equipe respondeu ao chamado ${input.protocol} (${input.categoryLabel}).`,
    "",
    "Resposta do suporte:",
    input.reply,
    "",
    "Sua mensagem:",
    input.message,
  ].join("\n");
  return { subject, html, text };
}

/** To the user: the ticket was closed. */
export function buildSupportFinalizedEmail(
  input: Omit<SupportTicketEmailInput, "message"> & { reply: string | null },
): RenderedEmail {
  const firstName = firstNameOf(input.name);
  const subject = `Chamado ${input.protocol} finalizado`;
  const html = renderStandardEmailLayout({
    title: subject,
    preheader: "Seu chamado de suporte foi finalizado.",
    heading: "Chamado finalizado",
    contentHtml: `
      <p style="margin:0 0 14px 0;color:${EMAIL_BRAND.text};">Olá, ${escapeHtml(firstName)}!</p>
      <p style="margin:0 0 16px 0;">O chamado <strong style="color:${EMAIL_BRAND.text};">${escapeHtml(input.protocol)}</strong> (${escapeHtml(input.categoryLabel)}) foi finalizado pela nossa equipe.</p>
      ${input.reply ? quote("Última resposta do suporte", input.reply) : ""}
      <p style="margin:0;">Se o assunto não foi resolvido, abra um novo chamado em Suporte.</p>`,
    ctaLabel: "Abrir o FollowLens",
    ctaUrl: `${input.appUrl.replace(/\/$/, "")}/support`,
    footerNote:
      "Você recebeu este e-mail porque enviou uma mensagem ao suporte do FollowLens.",
  });
  const text = [
    `Olá, ${firstName}!`,
    "",
    `O chamado ${input.protocol} (${input.categoryLabel}) foi finalizado pela nossa equipe.`,
    ...(input.reply ? ["", "Última resposta do suporte:", input.reply] : []),
  ].join("\n");
  return { subject, html, text };
}
