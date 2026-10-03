import { EMAIL_BRAND } from "../layout/email-brand";
import {
  escapeHtml,
  renderStandardEmailLayout,
} from "../layout/standard-email-layout.template";

export type UnfollowAlertItem = {
  username: string;
  occurredAt: Date;
};

export type UnfollowAlertEmailInput = {
  items: UnfollowAlertItem[];
  appUrl: string;
  timeZone: string;
};

export type RenderedEmail = { subject: string; html: string; text: string };

export function buildUnfollowAlertEmail(
  input: UnfollowAlertEmailInput,
): RenderedEmail {
  const count = input.items.length;
  const subject =
    count === 1
      ? `@${input.items[0].username} deixou de seguir você`
      : `${count} pessoas deixaram de seguir você`;

  const formatDate = (date: Date) =>
    new Intl.DateTimeFormat("pt-BR", {
      timeZone: input.timeZone,
      dateStyle: "short",
      timeStyle: "short",
    }).format(date);

  const rows = input.items
    .map(
      (item) => `
      <tr>
        <td style="padding:12px 14px;border-bottom:1px solid ${EMAIL_BRAND.border};">
          <a href="https://www.instagram.com/${encodeURIComponent(item.username)}/" target="_blank" rel="noopener noreferrer" style="color:${EMAIL_BRAND.text};font-weight:700;text-decoration:none;">@${escapeHtml(item.username)}</a>
        </td>
        <td style="padding:12px 14px;border-bottom:1px solid ${EMAIL_BRAND.border};font-size:13px;color:${EMAIL_BRAND.textSoft};text-align:right;white-space:nowrap;">
          ${escapeHtml(formatDate(item.occurredAt))}
        </td>
      </tr>`,
    )
    .join("");

  const html = renderStandardEmailLayout({
    title: subject,
    preheader: subject,
    heading:
      count === 1
        ? "Você perdeu um seguidor"
        : `Você perdeu ${count} seguidores`,
    contentHtml: `
      <p style="margin:0 0 16px 0;">A última sincronização detectou que ${count === 1 ? "esta conta deixou" : "estas contas deixaram"} de seguir você:</p>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid ${EMAIL_BRAND.border};border-radius:12px;border-collapse:separate;overflow:hidden;background:${EMAIL_BRAND.surface};">
        ${rows}
      </table>
      <p style="margin:16px 0 0 0;font-size:13px;color:${EMAIL_BRAND.textSoft};">Contas desativadas ou bloqueadas também aparecem como perda.</p>`,
    ctaLabel: "Ver histórico no painel",
    ctaUrl: `${input.appUrl.replace(/\/$/, "")}/unfollows`,
  });

  const text = [
    subject,
    "",
    ...input.items.map(
      (item) => `- @${item.username} — ${formatDate(item.occurredAt)}`,
    ),
    "",
    `Histórico: ${input.appUrl.replace(/\/$/, "")}/unfollows`,
  ].join("\n");

  return { subject, html, text };
}
