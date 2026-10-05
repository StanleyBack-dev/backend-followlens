import { EMAIL_BRAND } from "../layout/email-brand";
import {
  escapeHtml,
  renderStandardEmailLayout,
} from "../layout/standard-email-layout.template";
import type { RenderedEmail } from "../alerts/unfollow-alert-email.template";

export type MonthlySummaryEmailInput = {
  name: string;
  appUrl: string;
  profileName: string;
  /** YYYY-MM, used in the link. */
  month: string;
  /** Already formatted, e.g. "setembro de 2026". */
  monthLabel: string;
  gained: number;
  returned: number;
  lost: number;
  net: number;
  imports: number;
  followersAtEnd: number | null;
};

const number = new Intl.NumberFormat("pt-BR");

function signed(value: number): string {
  return `${value > 0 ? "+" : ""}${number.format(value)}`;
}

export function buildMonthlySummaryEmail(
  input: MonthlySummaryEmailInput,
): RenderedEmail {
  const firstName = input.name.trim().split(" ")[0] || input.name;
  const appUrl = input.appUrl.replace(/\/$/, "");
  const link = `${appUrl}/resumo?mes=${input.month}`;
  const subject = `Seu resumo de ${input.monthLabel} no FollowLens`;

  const stat = (label: string, value: string, color: string) => `
    <td style="width:33%;padding:12px 8px;text-align:center;background:${EMAIL_BRAND.cardBackground};border:1px solid ${EMAIL_BRAND.border};border-radius:12px;">
      <div style="font-size:24px;font-weight:800;color:${color};">${escapeHtml(value)}</div>
      <div style="font-size:12px;color:${EMAIL_BRAND.textSoft};">${escapeHtml(label)}</div>
    </td>`;

  const contentHtml = `
    <p style="margin:0 0 14px 0;color:${EMAIL_BRAND.text};">Olá, ${escapeHtml(firstName)}!</p>
    <p style="margin:0 0 16px 0;">Este foi o mês de ${escapeHtml(input.monthLabel)} do perfil <strong style="color:${EMAIL_BRAND.text};">${escapeHtml(input.profileName)}</strong>:</p>
    <table role="presentation" width="100%" cellspacing="6" cellpadding="0" style="margin:0 0 16px 0;">
      <tr>
        ${stat("Novos seguidores", signed(input.gained + input.returned), EMAIL_BRAND.accent)}
        ${stat("Deixaram de seguir", number.format(input.lost), EMAIL_BRAND.danger)}
        ${stat("Saldo do mês", signed(input.net), EMAIL_BRAND.text)}
      </tr>
    </table>
    <p style="margin:0;">Foram ${number.format(input.imports)} ${input.imports === 1 ? "importação" : "importações"} no mês${
      input.followersAtEnd !== null
        ? `, terminando com ${number.format(input.followersAtEnd)} seguidores`
        : ""
    }.</p>`;

  const html = renderStandardEmailLayout({
    title: subject,
    preheader: `Saldo de ${signed(input.net)} seguidores em ${input.monthLabel}.`,
    heading: `Seu resumo de ${input.monthLabel}`,
    contentHtml,
    ctaLabel: "Ver o resumo completo",
    ctaUrl: link,
    footerNote:
      "Você recebeu este e-mail porque importou seus seguidores no FollowLens neste mês.",
  });

  const text = [
    `Olá, ${firstName}!`,
    "",
    `Resumo de ${input.monthLabel} do perfil ${input.profileName}:`,
    `Novos seguidores: ${signed(input.gained + input.returned)}`,
    `Deixaram de seguir: ${number.format(input.lost)}`,
    `Saldo do mês: ${signed(input.net)}`,
    "",
    `Resumo completo: ${link}`,
  ].join("\n");

  return { subject, html, text };
}
