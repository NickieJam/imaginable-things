import Image from "next/image";
import {
  BadgeCheck,
  Clock3,
  MessagesSquare,
  PackageOpen,
  Shirt,
  Sparkles,
} from "lucide-react";
import Header from "@/components/Header";

const services = [
  ["Embroidery", "Precision stitching for apparel, hats and uniforms."],
  ["Custom Apparel", "T-shirts, hoodies, jackets and branded collections."],
  ["Headwear", "Caps, beanies and 3D puff embroidery."],
  ["Uniforms", "Professional pieces for teams and businesses."],
  ["Drinkware", "Tumblers, mugs and personalized gifts."],
  ["Branding", "Logos, stickers, vinyl and promotional products."],
];

export default function Home() {
  return (
    <main id="home">
      <Header />

      <section className="hero">
        <div className="hero-glow hero-glow-one" />
        <div className="hero-glow hero-glow-two" />

        <div className="hero-copy">
          <p className="eyebrow">You name it. <strong>We make it.</strong></p>
          <h1>Bring Your<br />Ideas to <span>Life.</span></h1>
          <p className="hero-description">
            Premium embroidery, custom apparel and promotional products
            crafted with precision, creativity and care.
          </p>
          <div className="button-row">
            <a className="button" href="#contact">Start Your Project</a>
            <a className="button button-outline" href="#portfolio">View Our Work</a>
          </div>
        </div>

        <div className="hero-art" aria-label="Imaginable Things brand presentation">
          <div className="logo-stage">
            <Image
              src="/imaginable-things-logo.png"
              alt="Official Imaginable Things logo"
              width={540}
              height={540}
              priority
            />
          </div>
          <div className="stitch-line stitch-one" />
          <div className="stitch-line stitch-two" />
          <div className="stitch-line stitch-three" />
        </div>
      </section>

      <section className="trust-strip" aria-label="Business advantages">
        <div><PackageOpen /><span><strong>No Minimum</strong>Order 1 or 100+</span></div>
        <div><Clock3 /><span><strong>Reliable Service</strong>Clear communication</span></div>
        <div><BadgeCheck /><span><strong>Quality Work</strong>Made with care</span></div>
        <div><MessagesSquare /><span><strong>Personal Service</strong>We listen to your idea</span></div>
      </section>

      <section className="story section" id="about">
        <div className="section-heading">
          <p className="eyebrow">Our story</p>
          <h2>More than a business.<br />It&apos;s our <span>purpose.</span></h2>
        </div>
        <div className="story-card">
          <Image
            src="/imaginable-things-logo.png"
            alt=""
            width={320}
            height={320}
          />
          <div>
            <p>
              Imaginable Things began as a way to create an income during a
              difficult season. What started as a hobby quickly became a
              passion.
            </p>
            <p>
              Today, we help individuals, churches, schools, contractors,
              restaurants and clothing brands turn their ideas into
              high-quality custom pieces at approachable prices.
            </p>
            <p>
              We are guided by Christian values, honest service and the belief
              that beautiful custom work should be accessible.
            </p>
          </div>
        </div>
      </section>

      <section className="section services" id="services">
        <div className="section-heading centered">
          <p className="eyebrow">Explore our capabilities</p>
          <h2>What we <span>create</span></h2>
          <p>One idea. Many possibilities.</p>
        </div>

        <div className="service-grid">
          {services.map(([title, description], index) => (
            <article className="service-card" key={title}>
              <div className={`service-number accent-${(index % 4) + 1}`}>
                {index % 2 === 0 ? <Shirt /> : <Sparkles />}
              </div>
              <h3>{title}</h3>
              <p>{description}</p>
              <a href="#portfolio">View work →</a>
            </article>
          ))}
        </div>
      </section>

      <section className="section portfolio" id="portfolio">
        <div className="portfolio-copy">
          <p className="eyebrow">Portfolio coming next</p>
          <h2>Your vision.<br />Our craftsmanship.<br /><span>Perfect together.</span></h2>
          <p>
            The Day 1 foundation is ready. Your real photographs and videos
            will replace these branded placeholders during the gallery phase.
          </p>
        </div>
        <div className="portfolio-placeholder">
          <Image
            src="/imaginable-things-logo.png"
            alt="Imaginable Things portfolio placeholder"
            width={430}
            height={430}
          />
        </div>
      </section>

      <section className="contact section" id="contact">
        <div>
          <p className="eyebrow">Let&apos;s create something</p>
          <h2>Ready to bring your<br /><span>idea to life?</span></h2>
          <p>Send us your idea and we&apos;ll take care of the rest.</p>
        </div>
        <div className="contact-actions">
          <a className="button" href="sms:+18603369202">Text 860-336-9202</a>
          <a
            className="button button-outline"
            href="https://wa.me/18603369202"
            target="_blank"
            rel="noreferrer"
          >
            WhatsApp
          </a>
          <a
            className="email-link"
            href="mailto:imaginablethingss@gmail.com"
          >
            imaginablethingss@gmail.com
          </a>
        </div>
      </section>

      <footer>
        <Image
          src="/imaginable-things-logo.png"
          alt="Imaginable Things"
          width={105}
          height={105}
        />
        <p>You Name It. We Make It.</p>
        <p>© {new Date().getFullYear()} Imaginable Things.</p>
      </footer>
    </main>
  );
}
