"use client";

import React from "react";
import Link from "next/link";

export default function Header() {
  return (
    <header className="header-modern">
      <div className="header-inner">
        <Link href="/" className="header-brand-modern">
          <div className="header-logo-modern">UG</div>
          <div>
            <div className="header-title-modern">Urmi Group</div>
            <div className="header-subtitle-modern">Procurement Operating System</div>
          </div>
        </Link>

        <div className="header-actions-modern">
          <span className="platform-version-pill">Enterprise v2.0</span>
        </div>
      </div>
    </header>
  );
}
