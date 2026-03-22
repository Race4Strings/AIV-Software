export interface TemplateField {
  key: string;
  label: string;
  type: "text" | "textarea" | "date" | "select" | "url";
  source: "alcm" | "manual";
  alcmPath?: string;
  required: boolean;
  placeholder?: string;
  options?: { label: string; value: string }[];
}

export interface LegalTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: "enforcement" | "licensing" | "protection";
  fields: TemplateField[];
  generateDocument: (values: Record<string, string>) => string;
}

// ---------------------------------------------------------------------------
// Template 1 — DMCA Takedown Notice
// ---------------------------------------------------------------------------

const dmcaTakedownNotice: LegalTemplate = {
  id: "dmca-takedown",
  name: "DMCA Takedown Notice",
  description:
    "Send a formal DMCA takedown request to platforms hosting unauthorized use of your digital identity. Includes all 6 elements required under 17 U.S.C. § 512.",
  icon: "FileWarning",
  category: "enforcement",
  fields: [
    // --- ALCM auto-populated ---
    {
      key: "owner_name",
      label: "Rights Owner Name",
      type: "text",
      source: "alcm",
      alcmPath: "name",
      required: true,
      placeholder: "Your full legal name",
    },
    {
      key: "owner_email",
      label: "Contact Email",
      type: "text",
      source: "alcm",
      alcmPath: "email",
      required: true,
      placeholder: "your@email.com",
    },
    {
      key: "identity_description",
      label: "Identity / Copyrighted Work Description",
      type: "textarea",
      source: "alcm",
      alcmPath: "bio",
      required: true,
      placeholder:
        "Describe the copyrighted work — e.g. your likeness, voice, persona, or creative content",
    },
    {
      key: "certification_hash",
      label: "AIV Certification Hash",
      type: "text",
      source: "alcm",
      alcmPath: "certification_hash",
      required: false,
      placeholder: "Auto-populated from latest certification",
    },
    {
      key: "certification_date",
      label: "Certification Date",
      type: "text",
      source: "alcm",
      alcmPath: "certification_date",
      required: false,
      placeholder: "Auto-populated from latest certification",
    },
    // --- Manual fields ---
    {
      key: "infringing_url",
      label: "URL of Infringing Content",
      type: "url",
      source: "manual",
      required: true,
      placeholder: "https://example.com/infringing-content",
    },
    {
      key: "platform",
      label: "Platform",
      type: "select",
      source: "manual",
      required: true,
      options: [
        { label: "YouTube", value: "YouTube" },
        { label: "Instagram", value: "Instagram" },
        { label: "TikTok", value: "TikTok" },
        { label: "X / Twitter", value: "X/Twitter" },
        { label: "Facebook", value: "Facebook" },
        { label: "Other", value: "Other" },
      ],
    },
    {
      key: "infringement_description",
      label: "Description of Infringement",
      type: "textarea",
      source: "manual",
      required: true,
      placeholder:
        "Describe how your identity or copyrighted work is being used without authorization",
    },
    {
      key: "date_discovered",
      label: "Date Discovered",
      type: "date",
      source: "manual",
      required: false,
    },
  ],

  generateDocument(v: Record<string, string>): string {
    const today = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    return `# DMCA Takedown Notice

**Date:** ${today}

**To:** DMCA Designated Agent — ${v.platform || "Platform"}

---

## I. Identification of Copyrighted Work

I, **${v.owner_name}**, am the owner of the following copyrighted work and digital identity:

${v.identity_description}

${v.certification_hash ? `This identity has been independently certified through the AIV Identity Certification system.\n- **Certification Hash:** \`${v.certification_hash}\`\n- **Certification Date:** ${v.certification_date || "N/A"}` : ""}

## II. Identification of Infringing Material

The following material infringes upon my rights and must be removed or access disabled:

- **URL:** ${v.infringing_url}
- **Platform:** ${v.platform}
${v.date_discovered ? `- **Date Discovered:** ${v.date_discovered}` : ""}

**Description of infringement:**

${v.infringement_description}

## III. Contact Information

- **Name:** ${v.owner_name}
- **Email:** ${v.owner_email}

## IV. Good Faith Statement

I have a good faith belief that the use of the material described above is not authorized by the copyright owner, its agent, or the law.

## V. Accuracy Statement

I swear, **under penalty of perjury**, that the information in this notification is accurate and that I am the copyright owner or am authorized to act on behalf of the owner of an exclusive right that is allegedly infringed.

## VI. Signature

**Electronic Signature:** /s/ ${v.owner_name}

**Date:** ${today}

---

*This notice is submitted pursuant to the Digital Millennium Copyright Act, 17 U.S.C. § 512.*
`;
  },
};

// ---------------------------------------------------------------------------
// Template 2 — Cease & Desist Letter
// ---------------------------------------------------------------------------

const ceaseAndDesistLetter: LegalTemplate = {
  id: "cease-and-desist",
  name: "Cease & Desist Letter",
  description:
    "Demand that an individual or organization stop unauthorized use of your digital identity, likeness, or voice. Backed by your AIV certification record.",
  icon: "Scale",
  category: "enforcement",
  fields: [
    // --- ALCM auto-populated ---
    {
      key: "owner_name",
      label: "Rights Owner Name",
      type: "text",
      source: "alcm",
      alcmPath: "name",
      required: true,
      placeholder: "Your full legal name",
    },
    {
      key: "protected_assets",
      label: "Protected Assets",
      type: "textarea",
      source: "alcm",
      alcmPath: "protected_assets",
      required: true,
      placeholder: "List of protected identity assets (auto-populated from your ALCM profile)",
    },
    {
      key: "certification_reference",
      label: "Certification Reference",
      type: "text",
      source: "alcm",
      alcmPath: "certification_reference",
      required: false,
      placeholder: "Auto-populated certification hash and date",
    },
    // --- Manual fields ---
    {
      key: "recipient_name",
      label: "Recipient Name",
      type: "text",
      source: "manual",
      required: true,
      placeholder: "Name of the individual or organization",
    },
    {
      key: "recipient_address",
      label: "Recipient Address",
      type: "textarea",
      source: "manual",
      required: true,
      placeholder: "Full mailing address of the recipient",
    },
    {
      key: "violation_description",
      label: "Description of Violation",
      type: "textarea",
      source: "manual",
      required: true,
      placeholder: "Describe the unauthorized use of your identity, likeness, or voice",
    },
    {
      key: "demand",
      label: "Demand",
      type: "select",
      source: "manual",
      required: true,
      options: [
        { label: "Immediately cease all use", value: "Immediately cease all use" },
        { label: "Remove content within 48 hours", value: "Remove content within 48 hours" },
        { label: "Cease use and provide compensation", value: "Cease use and provide compensation" },
        { label: "Custom", value: "Custom" },
      ],
    },
    {
      key: "custom_demand",
      label: "Custom Demand",
      type: "textarea",
      source: "manual",
      required: false,
      placeholder: "Describe your specific demand",
    },
    {
      key: "response_deadline_days",
      label: "Response Deadline",
      type: "select",
      source: "manual",
      required: true,
      options: [
        { label: "7 days", value: "7" },
        { label: "14 days", value: "14" },
        { label: "30 days", value: "30" },
      ],
    },
  ],

  generateDocument(v: Record<string, string>): string {
    const today = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const demandText =
      v.demand === "Custom" && v.custom_demand
        ? v.custom_demand
        : v.demand || "Immediately cease all use";

    const deadlineDays = v.response_deadline_days || "14";

    return `# Cease & Desist Letter

**Date:** ${today}

**From:**
${v.owner_name}

**To:**
${v.recipient_name}
${v.recipient_address}

---

Dear ${v.recipient_name},

I am writing to formally notify you that your actions constitute unauthorized use of my protected digital identity, likeness, and/or associated intellectual property. This letter serves as a formal demand that you **immediately cease and desist** all such activity.

## Protected Identity & Assets

I, **${v.owner_name}**, am the rightful owner of the following protected identity assets:

${v.protected_assets}

${v.certification_reference ? `My identity has been independently certified through the AIV Identity Certification system:\n- **Certification Reference:** \`${v.certification_reference}\`` : ""}

## Unauthorized Activity

The following unauthorized use of my identity has been identified:

${v.violation_description}

## Demand

I hereby demand that you:

**${demandText}**

## Response Required

You must comply with the above demand and provide written confirmation within **${deadlineDays} days** of receipt of this letter (by **${getDeadlineDate(Number(deadlineDays))}**).

## Consequences of Non-Compliance

Failure to comply with this demand within the specified timeframe may result in further legal action, including but not limited to:

- Filing a formal DMCA takedown notice with all relevant platforms
- Pursuing civil litigation for damages, including statutory damages
- Seeking injunctive relief to prevent further unauthorized use
- Reporting the violation to relevant regulatory authorities

## Reservation of Rights

This letter is written without prejudice to any and all rights and remedies available to me, all of which are expressly reserved.

Sincerely,

**${v.owner_name}**

---

*This letter was generated using the AIV Identity Protection Platform. The identity referenced herein is certified and verifiable.*
`;
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getDeadlineDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function getTodayFormatted(): string {
  return new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// ---------------------------------------------------------------------------
// Template 3 — AI Usage Consent Agreement
// ---------------------------------------------------------------------------

const aiUsageConsentAgreement: LegalTemplate = {
  id: "ai-usage-consent",
  name: "AI Usage Consent Agreement",
  description:
    "Authorize specific, limited use of your digital identity by a brand or platform. Defines scope, duration, territory, and compensation terms. This is the licensing receipt that proves authorized use.",
  icon: "FileCheck",
  category: "licensing",
  fields: [
    {
      key: "owner_name",
      label: "Identity Owner Name",
      type: "text",
      source: "alcm",
      alcmPath: "name",
      required: true,
      placeholder: "Your full legal name",
    },
    {
      key: "owner_email",
      label: "Contact Email",
      type: "text",
      source: "alcm",
      alcmPath: "email",
      required: true,
      placeholder: "your@email.com",
    },
    {
      key: "protected_assets",
      label: "Licensed Identity Assets",
      type: "textarea",
      source: "alcm",
      alcmPath: "protected_assets",
      required: true,
      placeholder: "List of identity assets being licensed (auto-populated from your ALCM profile)",
    },
    {
      key: "certification_hash",
      label: "AIV Certification Hash",
      type: "text",
      source: "alcm",
      alcmPath: "certification_hash",
      required: false,
      placeholder: "Auto-populated from latest certification",
    },
    {
      key: "licensee_name",
      label: "Licensee (Brand / Company)",
      type: "text",
      source: "manual",
      required: true,
      placeholder: "Name of the brand or company receiving the license",
    },
    {
      key: "licensee_contact",
      label: "Licensee Contact Email",
      type: "text",
      source: "manual",
      required: true,
      placeholder: "contact@brand.com",
    },
    {
      key: "use_case",
      label: "Permitted Use Case",
      type: "select",
      source: "manual",
      required: true,
      options: [
        { label: "Brand Spokesperson (digital)", value: "Brand Spokesperson (digital)" },
        { label: "Social Media Content", value: "Social Media Content" },
        { label: "Product Integration", value: "Product Integration" },
        { label: "Advertising Campaign", value: "Advertising Campaign" },
        { label: "Interactive Experience", value: "Interactive Experience" },
        { label: "Custom (describe below)", value: "Custom" },
      ],
    },
    {
      key: "custom_use_case",
      label: "Custom Use Case Description",
      type: "textarea",
      source: "manual",
      required: false,
      placeholder: "Describe the specific permitted use if 'Custom' was selected",
    },
    {
      key: "territory",
      label: "Territory",
      type: "select",
      source: "manual",
      required: true,
      options: [
        { label: "Worldwide", value: "Worldwide" },
        { label: "United States only", value: "United States" },
        { label: "North America", value: "North America" },
        { label: "Europe", value: "Europe" },
        { label: "Custom territory", value: "Custom" },
      ],
    },
    {
      key: "duration",
      label: "License Duration",
      type: "select",
      source: "manual",
      required: true,
      options: [
        { label: "30 days", value: "30 days" },
        { label: "90 days", value: "90 days" },
        { label: "6 months", value: "6 months" },
        { label: "1 year", value: "1 year" },
        { label: "Perpetual (with termination clause)", value: "Perpetual" },
      ],
    },
    {
      key: "compensation",
      label: "Compensation Terms",
      type: "textarea",
      source: "manual",
      required: true,
      placeholder: "e.g. $10,000 flat fee, or 5% revenue share on all generated content",
    },
  ],

  generateDocument(v: Record<string, string>): string {
    const today = getTodayFormatted();
    const useCase = v.use_case === "Custom" && v.custom_use_case ? v.custom_use_case : v.use_case || "As agreed";

    return `# AI Usage Consent Agreement

**Effective Date:** ${today}

---

## Parties

**Identity Owner ("Licensor"):**
- Name: ${v.owner_name}
- Email: ${v.owner_email}

**Licensee:**
- Name: ${v.licensee_name}
- Contact: ${v.licensee_contact || "N/A"}

---

## 1. Grant of License

The Licensor hereby grants the Licensee a **non-exclusive, non-transferable, revocable** license to use the following digital identity assets:

${v.protected_assets}

${v.certification_hash ? `These assets are certified through the AIV Identity Protection Platform.\n- **Certification Hash:** \`${v.certification_hash}\`` : ""}

## 2. Permitted Use

The Licensee may use the licensed identity assets **solely** for the following purpose:

**${useCase}**

Any use beyond the scope described above requires separate written authorization from the Licensor.

## 3. Territory

This license is valid in: **${v.territory || "Worldwide"}**

## 4. Duration

This license is effective for: **${v.duration || "As agreed"}**, beginning on the Effective Date.

Either party may terminate this agreement with 30 days written notice. Upon termination, the Licensee must immediately cease all use of the licensed identity assets and destroy any copies or derivatives.

## 5. Compensation

${v.compensation}

Payment terms: Net 30 from invoice date unless otherwise agreed in writing.

## 6. Restrictions

The Licensee shall NOT:
- Sub-license, transfer, or assign the licensed identity assets to any third party
- Modify the identity assets in a way that misrepresents the Licensor
- Use the identity assets in connection with illegal, defamatory, or harmful content
- Use the identity assets beyond the scope, territory, or duration specified above
- Create derivative works that could be confused with the Licensor's actual statements or beliefs

## 7. Ownership

The Licensor retains all rights, title, and interest in the digital identity assets. This agreement does not transfer ownership of any intellectual property.

## 8. Indemnification

The Licensee agrees to indemnify and hold harmless the Licensor from any claims, damages, or expenses arising from the Licensee's use of the licensed identity assets.

## 9. Governing Law

This agreement shall be governed by the laws of the State of [State], without regard to conflict of law principles.

## 10. Signatures

**Licensor:**
/s/ ${v.owner_name}
Date: ${today}

**Licensee:**
/s/ ${v.licensee_name}
Date: _______________

---

*This agreement was generated using the AIV Identity Protection Platform. The identity referenced herein is certified and verifiable.*
`;
  },
};

// ---------------------------------------------------------------------------
// Template 4 — Right of Publicity Claim
// ---------------------------------------------------------------------------

const rightOfPublicityClaim: LegalTemplate = {
  id: "right-of-publicity",
  name: "Right of Publicity Claim",
  description:
    "Assert your right of publicity under state law when your name, likeness, or persona is used commercially without consent. Stronger than DMCA for identity-specific cases.",
  icon: "UserCheck",
  category: "enforcement",
  fields: [
    {
      key: "owner_name",
      label: "Claimant Name",
      type: "text",
      source: "alcm",
      alcmPath: "name",
      required: true,
      placeholder: "Your full legal name",
    },
    {
      key: "owner_email",
      label: "Contact Email",
      type: "text",
      source: "alcm",
      alcmPath: "email",
      required: true,
      placeholder: "your@email.com",
    },
    {
      key: "identity_description",
      label: "Identity Description",
      type: "textarea",
      source: "alcm",
      alcmPath: "bio",
      required: true,
      placeholder: "Description of your public identity, career, and recognizable attributes",
    },
    {
      key: "certification_hash",
      label: "AIV Certification Hash",
      type: "text",
      source: "alcm",
      alcmPath: "certification_hash",
      required: false,
      placeholder: "Auto-populated from latest certification",
    },
    {
      key: "respondent_name",
      label: "Respondent (Violating Party)",
      type: "text",
      source: "manual",
      required: true,
      placeholder: "Name of the individual or company",
    },
    {
      key: "respondent_address",
      label: "Respondent Address",
      type: "textarea",
      source: "manual",
      required: false,
      placeholder: "Known address of the respondent",
    },
    {
      key: "state_jurisdiction",
      label: "State Jurisdiction",
      type: "select",
      source: "manual",
      required: true,
      options: [
        { label: "California (Cal. Civ. Code § 3344)", value: "California" },
        { label: "New York (N.Y. Civ. Rights Law §§ 50-51)", value: "New York" },
        { label: "Tennessee (T.C.A. § 47-25-1101)", value: "Tennessee" },
        { label: "Indiana (IC 32-36)", value: "Indiana" },
        { label: "Illinois (765 ILCS 1075)", value: "Illinois" },
        { label: "Texas (Tex. Prop. Code § 26.001)", value: "Texas" },
        { label: "Florida (Fla. Stat. § 540.08)", value: "Florida" },
        { label: "Other", value: "Other" },
      ],
    },
    {
      key: "violation_type",
      label: "Type of Violation",
      type: "select",
      source: "manual",
      required: true,
      options: [
        { label: "Unauthorized AI-generated likeness", value: "Unauthorized AI-generated likeness" },
        { label: "Unauthorized use of name in advertising", value: "Unauthorized use of name in advertising" },
        { label: "Unauthorized voice cloning", value: "Unauthorized voice cloning" },
        { label: "Unauthorized deepfake content", value: "Unauthorized deepfake content" },
        { label: "Unauthorized merchandise / products", value: "Unauthorized merchandise / products" },
        { label: "Other commercial exploitation", value: "Other commercial exploitation" },
      ],
    },
    {
      key: "violation_description",
      label: "Detailed Description of Violation",
      type: "textarea",
      source: "manual",
      required: true,
      placeholder: "Describe in detail how your identity is being used without authorization, including URLs, dates, and evidence",
    },
    {
      key: "damages_sought",
      label: "Damages Sought",
      type: "select",
      source: "manual",
      required: true,
      options: [
        { label: "Injunctive relief (stop the use)", value: "Injunctive relief" },
        { label: "Actual damages + profits", value: "Actual damages and disgorgement of profits" },
        { label: "Statutory damages", value: "Statutory damages as provided by law" },
        { label: "All available remedies", value: "All available remedies under applicable law" },
      ],
    },
  ],

  generateDocument(v: Record<string, string>): string {
    const today = getTodayFormatted();

    const stateStatutes: Record<string, string> = {
      California: "California Civil Code § 3344 and common law right of publicity",
      "New York": "New York Civil Rights Law §§ 50-51",
      Tennessee: "Tennessee Personal Rights Protection Act (T.C.A. § 47-25-1101 et seq.)",
      Indiana: "Indiana Right of Publicity Act (IC 32-36)",
      Illinois: "Illinois Right of Publicity Act (765 ILCS 1075)",
      Texas: "Texas Property Code § 26.001 et seq.",
      Florida: "Florida Statute § 540.08",
      Other: "applicable state right of publicity law",
    };

    const statute = stateStatutes[v.state_jurisdiction] || stateStatutes.Other;

    return `# Right of Publicity Claim

**Date:** ${today}

**From:**
${v.owner_name}
${v.owner_email}

**Against:**
${v.respondent_name}
${v.respondent_address || "[Address to be determined through discovery]"}

---

## I. Introduction

I, **${v.owner_name}**, hereby assert my right of publicity under **${statute}** against **${v.respondent_name}** for the unauthorized commercial use of my name, likeness, image, voice, and/or persona.

## II. The Claimant

${v.identity_description}

${v.certification_hash ? `My digital identity has been independently certified through the AIV Identity Protection Platform, establishing a verifiable record of ownership.\n- **Certification Hash:** \`${v.certification_hash}\`\n- **Certification Date:** On file with AIV` : ""}

## III. The Violation

**Type:** ${v.violation_type}

**Description:**

${v.violation_description}

The above-described use was made **without my knowledge, consent, or authorization** and constitutes a violation of my right of publicity under ${statute}.

## IV. Legal Basis

The right of publicity protects an individual's right to control the commercial use of their identity. Under ${statute}, it is unlawful to use another person's name, likeness, voice, or persona for commercial purposes without their prior consent.

The unauthorized use described above:
1. Uses my identifiable name, likeness, voice, and/or persona
2. Was made for commercial advantage and/or monetary gain
3. Was made without my express written consent
4. Has caused and continues to cause me harm

## V. Damages

I am seeking: **${v.damages_sought}**

The unauthorized use of my identity has resulted in:
- Loss of control over my public image and reputation
- Dilution of the commercial value of my identity
- Unjust enrichment of the respondent at my expense
- Emotional distress resulting from the unauthorized exploitation of my persona

## VI. Demand

I demand that **${v.respondent_name}**:

1. **Immediately cease** all unauthorized use of my name, likeness, voice, and persona
2. **Remove** all infringing content from all platforms and media within 72 hours
3. **Provide a full accounting** of all revenue generated through the unauthorized use
4. **Preserve all evidence** related to the creation, distribution, and monetization of the infringing content
5. **Confirm compliance** in writing within 14 days of receipt of this claim

## VII. Reservation of Rights

Failure to comply with the above demands will result in the pursuit of all available legal remedies, including but not limited to filing a civil lawsuit seeking injunctive relief, compensatory damages, punitive damages, and attorney's fees.

All rights and remedies are expressly reserved.

Sincerely,

**${v.owner_name}**

---

*This claim was generated using the AIV Identity Protection Platform. The identity referenced herein is certified and independently verifiable.*
`;
  },
};

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

export const templates: LegalTemplate[] = [
  dmcaTakedownNotice,
  ceaseAndDesistLetter,
  aiUsageConsentAgreement,
  rightOfPublicityClaim,
];

export function getTemplateById(id: string): LegalTemplate | undefined {
  return templates.find((t) => t.id === id);
}
