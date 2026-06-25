import Link from "next/link";

export default function TermsPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Terms of Service</h1>
        <p className="text-text-muted text-sm mt-1">Last updated June 2025</p>
      </div>

      <div className="space-y-6 text-text-secondary text-sm leading-relaxed">
        <section className="space-y-3">
          <h2 className="text-text-primary font-semibold text-base">The agreement</h2>
          <p>
            By using the 555 Command Center or hiring 555 Digital for a project,
            you agree to these terms.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-text-primary font-semibold text-base">Payment</h2>
          <p>
            Standard projects use a 50/50 split: 50% to start, 50% on launch.
            Custom projects are quoted upfront with agreed milestones.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-text-primary font-semibold text-base">Ownership</h2>
          <p>
            You own 100% of the final deliverables: code, design assets, content,
            and domain. I reserve the right to display finished projects in my
            portfolio unless you request otherwise.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-text-primary font-semibold text-base">Refunds</h2>
          <p>
            If I can't deliver what we agreed on, you get a full refund. If you
            change your mind mid-project, the deposit covers work completed.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-text-primary font-semibold text-base">Contact</h2>
          <p>
            Questions?{" "}
            <a href="mailto:noah@555digital.dev" className="text-primary hover:underline">
              noah@555digital.dev
            </a>
          </p>
        </section>
      </div>

      <Link href="/" className="inline-block text-primary text-sm hover:underline">
        ← Back to Dashboard
      </Link>
    </div>
  );
}
