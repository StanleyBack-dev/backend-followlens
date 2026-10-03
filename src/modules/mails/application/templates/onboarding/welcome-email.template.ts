import { EMAIL_BRAND } from "../layout/email-brand";
import {
  escapeHtml,
  renderStandardEmailLayout,
} from "../layout/standard-email-layout.template";
import type { RenderedEmail } from "../alerts/unfollow-alert-email.template";

export type WelcomeEmailInput = {
  name: string;
  appUrl: string;
};

export function buildWelcomeEmail(input: WelcomeEmailInput): RenderedEmail {
  const firstName = input.name.trim().split(" ")[0] || input.name;
  const appUrl = input.appUrl.replace(/\/$/, "");
  const subject = "Bem-vindo(a) ao FollowLens";

  const step = (n: number, title: string, body: string) => `
    <tr>
      <td style="width:32px;vertical-align:top;padding:0 12px 14px 0;">
        <div style="width:26px;height:26px;border-radius:999px;background:${EMAIL_BRAND.accentSoft};color:${EMAIL_BRAND.accent};font-weight:700;font-size:13px;line-height:26px;text-align:center;">${n}</div>
      </td>
      <td style="vertical-align:top;padding:0 0 14px 0;">
        <div style="color:${EMAIL_BRAND.text};font-weight:700;">${title}</div>
        <div style="font-size:14px;color:${EMAIL_BRAND.textMuted};">${body}</div>
      </td>
    </tr>`;

  const contentHtml = `
    <p style="margin:0 0 14px 0;color:${EMAIL_BRAND.text};">Olá, ${escapeHtml(firstName)}!</p>
    <p style="margin:0 0 16px 0;">Sua conta no FollowLens foi criada. A partir de agora você descobre quem deixou de seguir o seu Instagram — sem precisar informar a sua senha do Instagram.</p>
    <p style="margin:0 0 12px 0;color:${EMAIL_BRAND.text};font-weight:700;">Como começar:</p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
      ${step(1, "Exporte seus seguidores", "No Instagram: Central de Contas → Suas informações e permissões → Exportar suas informações → “Seguidores e seguindo”, formato JSON.")}
      ${step(2, "Envie o arquivo no painel", "Assim que o Instagram liberar o .zip, arraste-o na Visão geral. Essa primeira importação vira a sua lista base.")}
      ${step(3, "Repita quando quiser", "A cada nova importação mostramos quem saiu, quem chegou e quem voltou — e avisamos por e-mail.")}
    </table>`;

  const html = renderStandardEmailLayout({
    title: subject,
    preheader: "Sua conta foi criada. Veja como fazer a primeira importação.",
    heading: "Bem-vindo(a) ao FollowLens",
    contentHtml,
    ctaLabel: "Acessar o painel",
    ctaUrl: `${appUrl}/dashboard`,
    footerNote:
      "Você recebeu este e-mail porque criou uma conta no FollowLens com sua conta Google.",
  });

  const text = [
    `Olá, ${firstName}!`,
    "",
    "Sua conta no FollowLens foi criada.",
    "",
    "Como começar:",
    "1. No Instagram, exporte \"Seguidores e seguindo\" em JSON (Central de Contas → Exportar suas informações).",
    "2. Envie o .zip no painel — a primeira importação vira a sua lista base.",
    "3. Repita quando quiser para ver quem deixou de seguir você.",
    "",
    `Acesse: ${appUrl}/dashboard`,
  ].join("\n");

  return { subject, html, text };
}
