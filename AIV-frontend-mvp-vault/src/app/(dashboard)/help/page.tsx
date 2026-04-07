"use client";

import { useState } from "react";
import { ChevronDown, HelpCircle, MessageSquare, Shield, Briefcase, Brain, DollarSign, Lock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQSection {
  title: string;
  icon: typeof HelpCircle;
  items: FAQItem[];
}

const FAQ_SECTIONS: FAQSection[] = [
  {
    title: "Getting Started",
    icon: HelpCircle,
    items: [
      {
        question: "What is AIV?",
        answer: "AIV is identity infrastructure for the digital twin economy. We capture, structure, validate, govern, and license digital representations of public figures — enabling any downstream tool (voice synthesis, avatar generation, conversational AI) to produce output that is genuinely faithful to that person.",
      },
      {
        question: "How do I create my digital identity?",
        answer: "Start by completing the onboarding process. Enter your name, handle, or URL — our AI discovers your public information and builds a foundation profile. You then review, refine, and authorize it. After authorization, train your twin in the Training Area to improve accuracy.",
      },
      {
        question: "What is Precision Tuning?",
        answer: "Precision Tuning is a 60-question personality assessment (BFI-2) that helps your digital twin understand the real you — not just the public you. It takes about 5 minutes and significantly improves your twin's accuracy.",
      },
      {
        question: "Can I leave and come back during onboarding?",
        answer: "Yes. Your progress is saved automatically. When you return, you'll resume from where you left off.",
      },
    ],
  },
  {
    title: "Identity & Training",
    icon: Brain,
    items: [
      {
        question: "What are the four assistant modes?",
        answer: "Assistant — helps with platform questions and deal management. Digital Self — lets you talk to your twin to test accuracy. Training — adds new information to your twin's knowledge. Refinement — corrects specific aspects of your twin's understanding.",
      },
      {
        question: "How do I improve my twin's accuracy?",
        answer: "Use the Training Area to have conversations, upload content (articles, interviews, transcripts), and add corrections. The more you train, the more accurate your twin becomes. Check your Identity Health score for specific improvement areas.",
      },
      {
        question: "What does Identity Health mean?",
        answer: "Identity Health has three components: Profile Accuracy (how well your twin represents you), Data Completeness (how much personality data has been captured), and Model Reliability (statistical confidence in the personality model). Higher scores mean better licensing outcomes.",
      },
      {
        question: "Can I lock my identity?",
        answer: "Yes. Locking prevents all licensing, training, and modifications. This is an emergency measure that requires your password. You can unlock at any time, also with your password.",
      },
    ],
  },
  {
    title: "Deals & Licensing",
    icon: Briefcase,
    items: [
      {
        question: "How does licensing work?",
        answer: "When a client is interested in licensing your identity, they submit a deal inquiry through the Licensing Portal. You review the terms, negotiate via the deal workspace, and both parties sign a contract. Once executed, the client receives scoped access to your identity data.",
      },
      {
        question: "What is the deal lifecycle?",
        answer: "Submitted → Under Review → Approved → Contract Sent → Executed → Active → Completed. Each transition requires explicit action. Irreversible steps (like execution) require confirmation with consequence descriptions.",
      },
      {
        question: "What data do clients receive?",
        answer: "Only what the deal specifies. Available modules: Identity Profile (personality, behavioral style), Knowledge Base (expertise, positions), Voice Identity (speech patterns), and Visual Identity (appearance). Each deal's data scope is locked at execution.",
      },
      {
        question: "Can I revoke a deal?",
        answer: "Active deals run through their contracted term. You can terminate early if there's a breach. Your identity can be locked in emergencies, which suspends all active deals.",
      },
    ],
  },
  {
    title: "Billing & Fees",
    icon: DollarSign,
    items: [
      {
        question: "How much does AIV cost?",
        answer: "Building and refining your digital identity is completely free. The $997/month platform partnership fee activates only when your first deal executes or after 90 days — whichever comes first. This means you're already earning before any fee applies.",
      },
      {
        question: "What is the commission structure?",
        answer: "AIV takes 30% on your first deal, 25% on your second, and 20% on all subsequent deals. Commission is deducted transparently from each payment. You always see the full breakdown: gross payment, commission, and net to you.",
      },
      {
        question: "How do I receive payments?",
        answer: "Set up your payout account via Stripe Connect on the Billing page. Once configured, net payments (after commission) are routed directly to your bank account after each deal payment.",
      },
    ],
  },
  {
    title: "Security & Protection",
    icon: Shield,
    items: [
      {
        question: "What is the AIV Seal?",
        answer: "The AIV Seal is blockchain-anchored proof of identity authenticity. Every certified identity gets a cryptographic hash stored on the Polygon blockchain, creating immutable proof of when your identity was authorized and what it contains.",
      },
      {
        question: "How is my data protected?",
        answer: "Your identity data is encrypted at rest (AES-256), transmitted over HTTPS, and stored in isolated infrastructure. Negotiation knowledge (deal patterns, pricing preferences) is never shared with clients or included in any identity package.",
      },
      {
        question: "What if someone creates a deepfake of me?",
        answer: "Your AIV certification provides legal proof that your identity existed first. The Protection page will include misuse monitoring and DMCA enforcement tools (coming soon). Your certificate is shareable as evidence in any dispute.",
      },
    ],
  },
  {
    title: "Account & Settings",
    icon: Lock,
    items: [
      {
        question: "How do I add team members?",
        answer: "Go to Settings → Team. Invite members by email with a specific role (Admin, Member, or Viewer). Each role has different permissions for managing identities, deals, and team settings.",
      },
      {
        question: "Can I change my password?",
        answer: "Yes. Go to Settings → scroll to the Security section. You'll need your current password to set a new one.",
      },
      {
        question: "How do I delete my account?",
        answer: "Contact support for account deletion. We'll export your data (GDPR compliance), close any active deals, and permanently remove your account. This cannot be undone.",
      },
    ],
  },
];

function FAQAccordion({ item }: { item: FAQItem }) {
  const [open, setOpen] = useState(false);
  return (
    <button
      onClick={() => setOpen(!open)}
      className="w-full text-left border-b border-border/30 last:border-0"
    >
      <div className="flex items-center justify-between py-4 gap-4">
        <span className="text-sm font-medium text-foreground">{item.question}</span>
        <ChevronDown className={cn("h-4 w-4 text-muted-foreground shrink-0 transition-transform", open && "rotate-180")} aria-hidden="true" />
      </div>
      {open && (
        <p className="text-sm text-muted-foreground pb-4 leading-relaxed">{item.answer}</p>
      )}
    </button>
  );
}

export default function HelpPage() {
  return (
    <div className="max-w-3xl space-y-8 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Help Center</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Find answers to common questions about AIV.
        </p>
      </div>

      <div className="space-y-6">
        {FAQ_SECTIONS.map((section) => {
          const Icon = section.icon;
          return (
            <Card key={section.title} className="border-border/50">
              <CardContent className="pt-6">
                <h2 className="text-base font-semibold flex items-center gap-2 mb-4">
                  <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
                  {section.title}
                </h2>
                <div>
                  {section.items.map((item) => (
                    <FAQAccordion key={item.question} item={item} />
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="text-center text-sm text-muted-foreground pt-4">
        <p>Can&apos;t find what you&apos;re looking for?</p>
        <p className="mt-1">Contact us at <a href="mailto:support@aiv.com" className="text-primary hover:underline">support@aiv.com</a></p>
      </div>
    </div>
  );
}
