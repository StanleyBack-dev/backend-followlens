import { buildWelcomeEmail } from "@/modules/mails/application/templates/onboarding/welcome-email.template";

describe("buildWelcomeEmail", () => {
  it("greets by first name and links to the dashboard", () => {
    const email = buildWelcomeEmail({
      name: "Ana Souza",
      appUrl: "https://followlens.app/",
    });

    expect(email.subject).toContain("FollowLens");
    expect(email.html).toContain("Olá, Ana!");
    expect(email.html).toContain("https://followlens.app/dashboard");
    expect(email.text).toContain("https://followlens.app/dashboard");
  });

  it("escapes the user name", () => {
    const email = buildWelcomeEmail({
      name: "<script>",
      appUrl: "http://localhost:3000",
    });

    expect(email.html).not.toContain("<script>");
  });
});
