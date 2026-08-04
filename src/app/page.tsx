import Link from "next/link";

export default function LandingPage() {
  return (
    <main style={{ maxWidth: "1020px", margin: "0 auto", padding: "64px 24px 48px" }}>
      {/* Hero Header */}
      <div style={{ textAlign: "center", marginBottom: "36px", paddingTop: "20px" }}>
        <span className="platform-tag" style={{ marginBottom: "12px", fontSize: "11px", padding: "4px 14px", letterSpacing: "0.08em" }}>
          ENTERPRISE OPERATING SYSTEM
        </span>
        <h1 style={{ fontSize: "32px", fontWeight: 800, letterSpacing: "-0.035em", marginBottom: "10px", color: "var(--text-primary)" }}>
          Urmi Group Procurement Management
        </h1>
        <p style={{ fontSize: "15px", color: "var(--text-secondary)", maxWidth: "680px", margin: "0 auto", lineHeight: "1.6" }}>
          Unified procurement platform for CS compliance validation, historical database intelligence, flop purchase detection, and Benford fraud audits.
        </p>
      </div>

      {/* Balanced 2x2 Grid Layout */}
      <div className="tools-grid-compact" style={{ gap: "20px" }}>
        {/* Module 1: CS Validator */}
        <Link href="/cs-validator" className="module-card-compact" style={{ padding: "20px 22px" }}>
          <div className="module-card-header-compact" style={{ marginBottom: "12px" }}>
            <div className="module-icon-wrapper-compact icon-blue" style={{ width: "42px", height: "42px" }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <path d="m9 15 2 2 4-4" />
              </svg>
            </div>
            <span className="module-status-badge active-badge">Active</span>
          </div>
          <h2 className="module-title-compact" style={{ fontSize: "18px", marginBottom: "6px" }}>CS Validator</h2>
          <p className="module-description-compact" style={{ fontSize: "13px", lineHeight: "1.5", marginBottom: "14px" }}>
            Upload CS Excel files to run 17 automated compliance checks, rule validations, and minimum quote audits.
          </p>
          <div className="module-action-link" style={{ fontSize: "13px", fontWeight: 600 }}>
            Launch Validator →
          </div>
        </Link>

        {/* Module 2: Historical Data Dashboard */}
        <Link href="/historical-dashboard" className="module-card-compact" style={{ padding: "20px 22px" }}>
          <div className="module-card-header-compact" style={{ marginBottom: "12px" }}>
            <div className="module-icon-wrapper-compact icon-emerald" style={{ width: "42px", height: "42px" }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="20" x2="18" y2="10" />
                <line x1="12" y1="20" x2="12" y2="4" />
                <line x1="6" y1="20" x2="6" y2="14" />
              </svg>
            </div>
            <span className="module-status-badge db-badge">Live DB (300 Rows)</span>
          </div>
          <h2 className="module-title-compact" style={{ fontSize: "18px", marginBottom: "6px" }}>Historical Data Dashboard</h2>
          <p className="module-description-compact" style={{ fontSize: "13px", lineHeight: "1.5", marginBottom: "14px" }}>
            Deep-dive analytics across 18 metrics (cycle times, savings, supplier scores, cost escalations).
          </p>
          <div className="module-action-link link-emerald" style={{ fontSize: "13px", fontWeight: 600 }}>
            Explore Analytics →
          </div>
        </Link>

        {/* Module 3: Flop Purchase Analyzer */}
        <Link href="/purchase-analyzer" className="module-card-compact" style={{ padding: "20px 22px" }}>
          <div className="module-card-header-compact" style={{ marginBottom: "12px" }}>
            <div className="module-icon-wrapper-compact icon-amber" style={{ width: "42px", height: "42px" }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <span className="module-status-badge active-badge">Active</span>
          </div>
          <h2 className="module-title-compact" style={{ fontSize: "18px", marginBottom: "6px" }}>Flop Purchase Analyzer</h2>
          <p className="module-description-compact" style={{ fontSize: "13px", lineHeight: "1.5", marginBottom: "14px" }}>
            Cross-reference CS files against Historical DB to detect sub-optimal supplier choices and price overrides.
          </p>
          <div className="module-action-link" style={{ fontSize: "13px", fontWeight: 600 }}>
            Run Analyzer →
          </div>
        </Link>

        {/* Module 4: Fraud Analyzer */}
        <Link href="/fraud-analyzer" className="module-card-compact" style={{ padding: "20px 22px" }}>
          <div className="module-card-header-compact" style={{ marginBottom: "12px" }}>
            <div className="module-icon-wrapper-compact icon-purple" style={{ width: "42px", height: "42px" }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <span className="module-status-badge active-badge">Active</span>
          </div>
          <h2 className="module-title-compact" style={{ fontSize: "18px", marginBottom: "6px" }}>Fraud Analyzer</h2>
          <p className="module-description-compact" style={{ fontSize: "13px", lineHeight: "1.5", marginBottom: "14px" }}>
            Audit financial figures against Benford's Law distribution to detect price rounding and bidding collusion.
          </p>
          <div className="module-action-link" style={{ fontSize: "13px", fontWeight: 600 }}>
            Audit Forgery →
          </div>
        </Link>
      </div>
    </main>
  );
}
