import { EMAIL_BRAND } from "../layout/email-brand";
import {
  escapeHtml,
  renderStandardEmailLayout,
} from "../layout/standard-email-layout.template";
import type { RenderedEmail } from "../alerts/unfollow-alert-email.template";

export type ReferralRewardEmailInput = {
  name: string;
  appUrl: string;
  days: number;
  /** True when the reward pushed the subscriber's next charge forward. */
  postponedCharge: boolean;
};

export function buildReferralRewardEmail(
  input: ReferralRewardEmailInput,
): RenderedEmail {
  const firstName = input.name.trim().split(" ")[0] || input.name;
  const appUrl = input.appUrl.replace(/\/$/, "");
  const days = input.days === 1 ? "1 dia" : `${input.days} dias`;
  const subject = `Você ganhou ${days} de Pro por uma indicação`;
  const how = input.postponedCharge
    ? `Como você já é assinante, a sua próxima cobrança foi adiada em ${days}.`
    : `Os ${days} de Pro já estão valendo na sua conta.`;

  const html = renderStandardEmailLayout({
    title: subject,
    preheader: "Um amigo que você indicou assinou o FollowLens Pro.",
    heading: "Sua indicação rendeu",
    contentHtml: `
      <p style="margin:0 0 14px 0;color:${EMAIL_BRAND.text};">Olá, ${escapeHtml(firstName)}!</p>
      <p style="margin:0 0 16px 0;">Um amigo que entrou pelo seu link assinou o FollowLens Pro, e isso rendeu <strong style="color:${EMAIL_BRAND.text};">${escapeHtml(days)} de Pro</strong> para você.</p>
      <p style="margin:0 0 16px 0;">${escapeHtml(how)}</p>
      <p style="margin:0;">Cada nova indicação que assinar rende mais ${escapeHtml(days)}.</p>`,
    ctaLabel: "Ver minhas indicações",
    ctaUrl: `${appUrl}/conta/indicacoes`,
    footerNote:
      "Você recebeu este e-mail porque participa do programa de indicação do FollowLens.",
  });

  const text = [
    `Olá, ${firstName}!`,
    "",
    `Um amigo que entrou pelo seu link assinou o FollowLens Pro, e isso rendeu ${days} de Pro para você.`,
    how,
    "",
    `Suas indicações: ${appUrl}/conta/indicacoes`,
  ].join("\n");

  return { subject, html, text };
}
