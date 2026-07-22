(() => {
  const text = (id, value) => {
    const element = document.getElementById(id);
    if (element) element.textContent = String(value);
  };

  const activeItems = (items) => (Array.isArray(items) ? items.filter((item) => item?.visible !== false) : []);

  const setHealth = (name, ok, detail) => {
    text(`${name}Detail`, detail);
    const badge = document.getElementById(`${name}Badge`);
    if (!badge) return;
    badge.textContent = ok ? "Ready" : "Review";
    badge.className = `badge ${ok ? "ok" : "check"}`;
  };

  async function readJson(path) {
    const response = await fetch(path, { cache: "no-store" });
    if (!response.ok) throw new Error(`Could not load ${path}`);
    return response.json();
  }

  async function loadDashboard() {
    try {
      const [projectData, serviceData, testimonialData, siteData, jobData, leadData, customerData] = await Promise.all([
        readJson("../data/projects.json"),
        readJson("../data/services.json"),
        readJson("../data/testimonials.json"),
        readJson("../data/site.json"),
        readJson("../data/jobs.json"),
        readJson("../data/leads.json"),
        readJson("../data/customers.json")
      ]);

      const projects = activeItems(projectData.projects);
      const services = activeItems(serviceData.services);
      const testimonials = activeItems(testimonialData.testimonials);
      const faqs = activeItems(siteData.faqs);
      const business = siteData.business || {};
      const jobs = activeItems(jobData.jobs).filter((job) => !["delivered", "cancelled"].includes(job.status));
      const leads = activeItems(leadData.leads).filter((lead) => !lead.converted_to_job && !["lost"].includes(lead.status));
      const customers = activeItems(customerData.customers);

      text("activeLeadCount", leads.length);
      text("activeJobCount", jobs.length);
      text("customerCount", customers.length);
      text("projectCount", projects.length);
      text("featuredCount", projects.filter((project) => project.featured === true).length);
      text("serviceCount", services.length);
      text("testimonialCount", testimonials.length);
      document.getElementById("stats")?.classList.remove("loading");

      const whatsapp = String(business.whatsapp_number || "").trim();
      const email = String(business.email || "").trim();
      const logo = String(business.logo || "").trim();

      setHealth("whatsapp", whatsapp.length >= 10, whatsapp ? "Number is configured" : "Add a WhatsApp number");
      setHealth("email", email.includes("@"), email || "Add a business email");
      setHealth("logo", Boolean(logo), logo ? "Logo file is configured" : "Choose a business logo");
      setHealth("faq", faqs.length > 0, `${faqs.length} published question${faqs.length === 1 ? "" : "s"}`);
    } catch (error) {
      console.error("Dashboard error:", error);
      document.getElementById("stats")?.classList.remove("loading");
      ["activeLeadCount", "activeJobCount", "customerCount", "projectCount", "featuredCount", "serviceCount", "testimonialCount"].forEach((id) => text(id, "—"));
      setHealth("whatsapp", false, "Could not read site settings");
      setHealth("email", false, "Could not read site settings");
      setHealth("logo", false, "Could not read site settings");
      setHealth("faq", false, "Could not read site settings");
    }
  }

  loadDashboard();
})();
