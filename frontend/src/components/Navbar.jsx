import { useState } from "react";
import "./Navbar.css";
import { useTheme } from "../hooks/useTheme";
import logo from "../assets/navbar-logo.png";

const LINKS = [
  { id: "detector", label: "Detector", href: "#/" },
  { id: "how-its-built", label: "How It's Built", href: "#/how-its-built" },
  { id: "contributors", label: "Contributors", href: "#/contributors" },
];

function ThemeToggle() {
  const [theme, toggleTheme] = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      className="navbar__theme-toggle"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to day mode" : "Switch to night mode"}
      title={isDark ? "Switch to day mode" : "Switch to night mode"}
    >
      {isDark ? (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="4.5" stroke="currentColor" strokeWidth="1.8" />
          <path
            d="M12 2.5v2M12 19.5v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2.5 12h2M19.5 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
          <path
            d="M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  );
}

export default function Navbar({ route }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="navbar">
      <div className="navbar__inner">
        <a href="#/" className="navbar__brand" onClick={() => setMenuOpen(false)}>
          <img src={logo} alt="" className="navbar__brand-mark" />
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

        <div className="navbar__right">
          <ThemeToggle />

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
      </div>
    </header>
  );
}
