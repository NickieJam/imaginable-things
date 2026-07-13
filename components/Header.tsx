"use client";

import Image from "next/image";
import { Menu, X } from "lucide-react";
import { useState } from "react";

const links = [
  ["Home", "#home"],
  ["Portfolio", "#portfolio"],
  ["Services", "#services"],
  ["About", "#about"],
  ["Contact", "#contact"],
];

export default function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="site-header">
      <a className="brand" href="#home" aria-label="Imaginable Things home">
        <Image
          src="/imaginable-things-logo.png"
          alt="Imaginable Things"
          width={92}
          height={92}
          priority
        />
        <span>IMAGINABLE<br />THINGS</span>
      </a>

      <nav className="desktop-nav" aria-label="Main navigation">
        {links.map(([label, href]) => (
          <a key={href} href={href}>{label}</a>
        ))}
      </nav>

      <a className="button button-small desktop-quote" href="#contact">
        Get a Quote
      </a>

      <button
        className="menu-button"
        aria-label="Open navigation"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        {open ? <X /> : <Menu />}
      </button>

      {open && (
        <nav className="mobile-nav" aria-label="Mobile navigation">
          {links.map(([label, href]) => (
            <a key={href} href={href} onClick={() => setOpen(false)}>{label}</a>
          ))}
          <a className="button" href="#contact" onClick={() => setOpen(false)}>
            Get a Quote
          </a>
        </nav>
      )}
    </header>
  );
}
