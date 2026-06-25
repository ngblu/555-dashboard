import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Privacy Policy</h1>
        <p className="text-text-muted text-sm mt-1">
          Last updated June 2025
        </p>
      </div>

      <div className="space-y-6 text-text-secondary text-sm leading-relaxed">
        <section className="space-y-3">
          <h2 className="text-text-primary font-semibold text-base">What I collect</h2>
          <p>
            When you submit the contact form on 555digital.dev, I receive your
            name, email address, website URL, budget information, and any message
            you include. I also automatically run a PageSpeed audit on your site
            to give you useful feedback fast.
          </p>
          <p>
            The 555 Command Center dashboard stores your client information, project
            details, task lists, and payment records that you choose to enter.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-text-primary font-semibold text-base">How I use it</h2>
          <p>
            Your information is used only to provide the services you requested:
            communicating about your project, building and maintaining your website,
            and managing invoices. I do not sell, rent, or share your data with
            third parties for marketing purposes.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-text-primary font-semibold text-base">Where it lives</h2>
          <p>
            Contact form submissions and dashboard data are stored on
            Vercel&rsquo;s infrastructure (US regions). The dashboard uses Vercel
            Blob for cloud synchronization across your devices. No data is sent to
            external analytics or tracking services.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-text-primary font-semibold text-base">Your rights</h2>
          <p>
            You can request a copy of your data, ask me to update or correct it, or
            request deletion at any time. Email me at noah@555digital.dev and
            I&rsquo;ll handle it within 30 days.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-text-primary font-semibold text-base">Cookies</h2>
          <p>
            The dashboard uses localStorage (browser storage) so your data
            persists between visits. No tracking cookies or third-party analytics
            are used.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-text-primary font-semibold text-base">Contact</h2>
          <p>
            Questions? Reach me at{" "}
            <a href="mailto:noah@555digital.dev" className="text-primary hover:underline">
              noah@555digital.dev
            </a>{" "}
            or call{" "}
            <a href="tel:+16293358803" className="text-primary hover:underline">
              (629) 335-8803
            </a>
            .
          </p>
        </section>
      </div>

      <Link
        href="/"
        className="inline-block text-primary text-sm hover:underline"
      >
        ← Back to Dashboard
      </Link>
    </div>
  );
}
