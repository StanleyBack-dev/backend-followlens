import { EMAIL_BRAND } from "../layout/email-brand";
import {
  escapeHtml,
  renderStandardEmailLayout,
} from "../layout/standard-email-layout.template";
import type { RenderedEmail } from "../alerts/unfollow-alert-email.template";

function firstNameOf(name: string): string {
  return name.trim().split(" ")[0] || name;
}

export type SubscriptionActivatedEmailInput = {
  name: string;
  appUrl: string;
  /** "mensal" | "anual" */
  cycleLabel: string;
  /** Already formatted in the app timezone, or null when unknown. */
  renewsOnLabel: string | null;
};

export function buildSubscriptionActivatedEmail(
  input: SubscriptionActivatedEmailInput,
): RenderedEmail {
  const firstName = firstNameOf(input.name);
  const appUrl = input.appUrl.replace(/\/$/, "");
  const subject = "Seu FollowLens Pro está ativo";
  const renewal = input.renewsOnLabel
    ? ` A próxima cobrança está prevista para ${input.renewsOnLabel}.`
    : "";

  const benefit = (text: string) =>
    `<li style="margin:0 0 6px 0;">${escapeHtml(text)}</li>`;

  const contentHtml = `
    <p style="margin:0 0 14px 0;color:${EMAIL_BRAND.text};">Olá, ${escapeHtml(firstName)}!</p>
    <p style="margin:0 0 16px 0;">Recebemos o seu pagamento e a assinatura ${escapeHtml(input.cycleLabel)} do FollowLens Pro já está ativa.${escapeHtml(renewal)}</p>
    <p style="margin:0 0 8px 0;color:${EMAIL_BRAND.text};font-weight:700;">O que está liberado:</p>
    <ul style="margin:0 0 4px 18px;padding:0;">
      ${benefit("Importações sem espera entre uma e outra")}
      ${benefit("Histórico completo de quem deixou de seguir você")}
      ${benefit("Lista de novos seguidores e de quem voltou a seguir")}
      ${benefit("Alertas de unfollow por e-mail e busca nas listas")}
    </ul>`;

  const html = renderStandardEmailLayout({
    title: subject,
    preheader: "Pagamento confirmado. Os recursos Pro já estão liberados.",
    heading: "Assinatura Pro ativada",
    contentHtml,
    ctaLabel: "Acessar o painel",
    ctaUrl: `${appUrl}/dashboard`,
    footerNote:
      "Você recebeu este e-mail porque assinou o FollowLens Pro. A assinatura pode ser cancelada a qualquer momento em Conta → Assinatura.",
  });

  const text = [
    `Olá, ${firstName}!`,
    "",
    `Recebemos o seu pagamento e a assinatura ${input.cycleLabel} do FollowLens Pro já está ativa.${renewal}`,
    "",
    `Acesse: ${appUrl}/dashboard`,
  ].join("\n");

  return { subject, html, text };
}

export type PaymentOverdueEmailInput = {
  name: string;
  appUrl: string;
  graceDays: number;
};

export function buildPaymentOverdueEmail(
  input: PaymentOverdueEmailInput,
): RenderedEmail {
  const firstName = firstNameOf(input.name);
  const appUrl = input.appUrl.replace(/\/$/, "");
  const days = input.graceDays === 1 ? "1 dia" : `${input.graceDays} dias`;
  const subject = "Pagamento do FollowLens Pro em atraso";

  const contentHtml = `
    <p style="margin:0 0 14px 0;color:${EMAIL_BRAND.text};">Olá, ${escapeHtml(firstName)}!</p>
    <p style="margin:0 0 16px 0;">Não identificamos o pagamento da sua assinatura do FollowLens Pro.</p>
    <div style="margin:0 0 16px 0;padding:14px 16px;border-radius:12px;background:${EMAIL_BRAND.dangerSoft};color:${EMAIL_BRAND.danger};font-size:14px;">
      Seu acesso Pro continua por mais ${days}. Depois disso a conta volta para o plano Free — nenhum dado é apagado.
    </div>
    <p style="margin:0;">A cobrança em aberto está em Conta → Assinatura, no histórico de pagamentos.</p>`;

  const html = renderStandardEmailLayout({
    title: subject,
    preheader: `Regularize em até ${days} para manter o Pro.`,
    heading: "Pagamento em atraso",
    contentHtml,
    ctaLabel: "Ver assinatura",
    ctaUrl: `${appUrl}/account/billing`,
    footerNote:
      "Você recebeu este e-mail porque tem uma assinatura do FollowLens Pro.",
  });

  const text = [
    `Olá, ${firstName}!`,
    "",
    "Não identificamos o pagamento da sua assinatura do FollowLens Pro.",
    `Seu acesso Pro continua por mais ${days}. Depois disso a conta volta para o plano Free — nenhum dado é apagado.`,
    "",
    `Ver assinatura: ${appUrl}/account/billing`,
  ].join("\n");

  return { subject, html, text };
}
