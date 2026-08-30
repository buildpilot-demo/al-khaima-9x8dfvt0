import { useId, useState, type FormEvent } from "react";
import { siteConfig } from "../site.config";

type Status = "idle" | "submitting" | "success" | "error";

// Accessible enquiry/contact form shared by every customer site — reused
// as-is by Devin's cinematic enquiry section (see
// docs/DEVIN_3D_WEBSITE_SPEC.md, Section 3) rather than rebuilt per
// customer. Renders siteConfig.enquirySection's fields (enquiry type
// select, optional consent) and submits by opening a pre-filled mailto: to
// siteConfig.contact.email by default, so it works with zero backend wiring
// out of the box. Pass `onSubmit` to instead send the enquiry to the shared
// multi-tenant Convex backend (see convex/README.md) once that mutation's
// function path is available for this project.
export function EnquiryForm({
  onSubmit,
}: {
  onSubmit?: (values: { name: string; email: string; phone: string; enquiryType: string; message: string }) => Promise<void>;
}) {
  const { enquirySection } = siteConfig;
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const nameId = useId();
  const emailId = useId();
  const phoneId = useId();
  const enquiryTypeId = useId();
  const messageId = useId();
  const consentId = useId();
  const honeypotId = useId();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    // Honeypot: real users never fill this hidden field in; bots often do.
    if (String(data.get("company") ?? "").trim()) return;

    const name = String(data.get("name") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    const phone = String(data.get("phone") ?? "").trim();
    const enquiryType = String(data.get("enquiryType") ?? "").trim();
    const message = String(data.get("message") ?? "").trim();
    const consented = data.get("consent") === "on";
    if (!name || !email || !message || !consented) {
      setStatus("error");
      setError("Please fill in your name, email, message, and agree to be contacted.");
      return;
    }

    setStatus("submitting");
    setError(null);
    try {
      if (onSubmit) {
        await onSubmit({ name, email, phone, enquiryType, message });
      } else if (siteConfig.contact.email) {
        const subject = encodeURIComponent(`${enquiryType || "Enquiry"} from ${name} via ${siteConfig.businessName} website`);
        const body = encodeURIComponent(`${message}\n\n— ${name} (${email}${phone ? `, ${phone}` : ""})`);
        window.location.href = `mailto:${siteConfig.contact.email}?subject=${subject}&body=${body}`;
      } else {
        throw new Error(enquirySection.disconnectedMessage);
      }
      setStatus("success");
      form.reset();
    } catch (submitError) {
      setStatus("error");
      setError(submitError instanceof Error ? submitError.message : "Something went wrong. Please try again.");
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate aria-describedby={status !== "idle" ? `${nameId}-status` : undefined}>
      <div className="field-honeypot" aria-hidden="true">
        <label htmlFor={honeypotId}>Company</label>
        <input id={honeypotId} name="company" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="field">
        <label htmlFor={nameId}>Full name</label>
        <input id={nameId} name="name" type="text" autoComplete="name" required aria-required="true" />
      </div>

      <div className="field">
        <label htmlFor={emailId}>Email</label>
        <input id={emailId} name="email" type="email" autoComplete="email" required aria-required="true" />
      </div>

      <div className="field">
        <label htmlFor={phoneId}>Phone (optional)</label>
        <input id={phoneId} name="phone" type="tel" autoComplete="tel" />
      </div>

      {enquirySection.enquiryTypes.length > 0 && (
        <div className="field">
          <label htmlFor={enquiryTypeId}>Enquiry type</label>
          <select id={enquiryTypeId} name="enquiryType" defaultValue={enquirySection.enquiryTypes[0]} required aria-required="true">
            {enquirySection.enquiryTypes.map((type) => <option key={type} value={type}>{type}</option>)}
          </select>
        </div>
      )}

      <div className="field">
        <label htmlFor={messageId}>Message</label>
        <textarea id={messageId} name="message" rows={5} required aria-required="true" />
      </div>

      <div className="field field--checkbox">
        <label htmlFor={consentId}>
          <input id={consentId} name="consent" type="checkbox" required aria-required="true" />
          {enquirySection.consentLabel}
        </label>
      </div>

      <button type="submit" className="btn" disabled={status === "submitting"}>
        {status === "submitting" ? "Sending…" : enquirySection.submitLabel}
      </button>

      <p id={`${nameId}-status`} className="form-status" role="status" aria-live="polite" data-tone={status === "error" ? "error" : status === "success" ? "success" : undefined}>
        {status === "success" && "Thanks — your enquiry has been sent."}
        {status === "error" && (error ?? "Something went wrong.")}
      </p>
    </form>
  );
}
