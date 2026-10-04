import { buildAccountDeletionEmail } from "@/modules/mails/application/templates/account/account-deletion-email.template";

describe("buildAccountDeletionEmail", () => {
  it("states the grace period, the date and how to cancel", () => {
    const email = buildAccountDeletionEmail({
      name: "Ana Souza",
      appUrl: "https://followlens.app/",
      graceDays: 7,
      scheduledForLabel: "10 de outubro de 2026",
    });

    expect(email.subject).toContain("7 dias");
    expect(email.html).toContain("Olá, Ana!");
    expect(email.html).toContain("10 de outubro de 2026");
    expect(email.html).toContain("https://followlens.app/account");
    expect(email.text).toContain("https://followlens.app/account");
  });

  it("escapes the user name", () => {
    const email = buildAccountDeletionEmail({
      name: "<script>",
      appUrl: "http://localhost:3000",
      graceDays: 1,
      scheduledForLabel: "4 de outubro de 2026",
    });

    expect(email.subject).toContain("1 dia");
    expect(email.html).not.toContain("<script>");
  });
});
