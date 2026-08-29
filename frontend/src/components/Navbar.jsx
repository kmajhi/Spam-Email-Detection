import { useState } from "react";
import "./Navbar.css";

const LINKS = [
  { id: "detector", label: "Detector", href: "#/" },
  { id: "how-its-built", label: "How It's Built", href: "#/how-its-built" },
];

export default function Navbar({ route }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="navbar">
      <div className="navbar__inner">
        <a href="#/" className="navbar__brand" onClick={() => setMenuOpen(false)}>
          <span className="navbar__brand-mark" aria-hidden="true">✉</span>
          Spam Detector
        </a>

        <nav
          className={`navbar__links ${menuOpen ? "navbar__links--open" : ""}`}
          aria-label="Primary"
        >
          {LINKS.map((link) => (
            <a
              key={link.id}
              href={link.href}
              className={`navbar__link ${route === link.id ? "navbar__link--active" : ""}`}
              aria-current={route === link.id ? "page" : undefined}
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
            </a>
          ))}
        </nav>

        <button
          type="button"
          className="navbar__toggle"
          aria-label="Toggle navigation menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((o) => !o)}
        >
          <span />
          <span />
          <span />
        </button>
      </div>
    </header>
  );
}
