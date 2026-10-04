import { EMAIL_BRAND } from "../layout/email-brand";
import {
  escapeHtml,
  renderStandardEmailLayout,
} from "../layout/standard-email-layout.template";
import type { RenderedEmail } from "../alerts/unfollow-alert-email.template";

export type AccountDeletionEmailInput = {
  name: string;
  appUrl: string;
  graceDays: number;
  /** Already formatted in the app timezone (e.g. "10 de outubro de 2026"). */
  scheduledForLabel: string;
};

export function buildAccountDeletionEmail(
  input: AccountDeletionEmailInput,
): RenderedEmail {
  const firstName = input.name.trim().split(" ")[0] || input.name;
  const appUrl = input.appUrl.replace(/\/$/, "");
  const days = input.graceDays === 1 ? "1 dia" : `${input.graceDays} dias`;
  const subject = `Sua conta FollowLens será excluída em ${days}`;

  const contentHtml = `
    <p style="margin:0 0 14px 0;color:${EMAIL_BRAND.text};">Olá, ${escapeHtml(firstName)}!</p>
    <p style="margin:0 0 16px 0;">Recebemos o seu pedido de exclusão de conta. Ela será excluída definitivamente em <strong style="color:${EMAIL_BRAND.text};">${escapeHtml(input.scheduledForLabel)}</strong> (daqui a ${days}).</p>
    <div style="margin:0 0 16px 0;padding:14px 16px;border-radius:12px;background:${EMAIL_BRAND.dangerSoft};color:${EMAIL_BRAND.danger};font-size:14px;">
      Junto com a conta serão apagados, sem possibilidade de recuperação: sua lista de seguidores, o histórico de unfollows e todas as importações.
    </div>
    <p style="margin:0;">Mudou de ideia? Até essa data, basta entrar no painel e cancelar a exclusão em Conta → Perfil.</p>`;

  const html = renderStandardEmailLayout({
    title: subject,
    preheader: `Exclusão agendada para ${input.scheduledForLabel}. Você ainda pode cancelar.`,
    heading: "Exclusão de conta agendada",
    contentHtml,
    ctaLabel: "Cancelar a exclusão",
    ctaUrl: `${appUrl}/account`,
    footerNote:
      "Você recebeu este e-mail porque a exclusão da sua conta FollowLens foi solicitada. Se não foi você, cancele a exclusão pelo painel.",
  });

  const text = [
    `Olá, ${firstName}!`,
    "",
    `Recebemos o seu pedido de exclusão de conta. Ela será excluída definitivamente em ${input.scheduledForLabel} (daqui a ${days}).`,
    "",
    "Junto com a conta serão apagados, sem possibilidade de recuperação: sua lista de seguidores, o histórico de unfollows e todas as importações.",
    "",
    `Mudou de ideia? Cancele a exclusão em: ${appUrl}/account`,
  ].join("\n");

  return { subject, html, text };
}
