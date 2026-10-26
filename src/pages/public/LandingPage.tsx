import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  CalendarCheck2,
  CalendarClock,
  CheckCircle2,
  Clock3,
  MessagesSquare,
  Scissors,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { PATHS } from "@/routes/paths";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Feedback";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

const CAPABILITIES = [
  {
    icon: Sparkles,
    title: "Answers from real business data",
    text: "Opening hours, address, contact details and industry come from the live business record — never a static FAQ.",
  },
  {
    icon: Scissors,
    title: "Knows the service catalogue",
    text: "Prices, durations and descriptions are read from the services you maintain in the console.",
  },
  {
    icon: Users,
    title: "Matches the right team member",
    text: "The agent looks up active staff and only offers people actually assigned to the requested service.",
  },
  {
    icon: Clock3,
    title: "Checks the real calendar",
    text: "Before confirming anything it verifies the slot against existing appointments and suggests alternatives.",
  },
  {
    icon: CalendarCheck2,
    title: "Books in the same calendar",
    text: "Confirmed bookings are written to the appointment book your team works from, with customer details attached.",
  },
  {
    icon: CalendarClock,
    title: "Cancels and reschedules",
    text: "Existing appointments can be moved or cancelled through the conversation, with conflicts prevented.",
  },
];

const STEPS = [
  {
    title: "Customer opens the chat link",
    text: "Each business gets a direct link. No app install, no account, no login for the customer.",
  },
  {
    title: "The agent gathers what it needs",
    text: "It asks for the service, preferred time and a 10-digit phone number so the booking can be tied to a customer.",
  },
  {
    title: "The booking lands in your console",
    text: "You see the appointment, the transcript and the intent in your dashboard seconds later.",
  },
];

function extractBusinessId(value: string): string {
  const trimmed = value.trim();
  const linkMatch = trimmed.match(/\/c\/([^/?#]+)/);
  return linkMatch?.[1] ? decodeURIComponent(linkMatch[1]) : trimmed;
}

export default function LandingPage() {
  useDocumentTitle("Conversational booking front desk");
  const navigate = useNavigate();
  const [reference, setReference] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleOpenChat = (event: FormEvent) => {
    event.preventDefault();
    const businessId = extractBusinessId(reference);
    if (!businessId) {
      setError("Enter the business ID (or paste the chat link) to continue.");
      return;
    }
    setError(null);
    navigate(PATHS.chat(businessId));
  };

  return (
    <>
      <section className="hero">
        <div className="hero__inner">
          <div>
            <span className="hero__badge">
              <span className="status-dot status-dot--live" aria-hidden="true" />
              AI voice receptionist · live booking
            </span>

            <h1 className="hero__title">
              A front desk that answers every customer, then books them in.
            </h1>

            <p className="hero__text">
              Your AI receptionist talks to customers in natural language, knows your services and
              team, checks real availability and writes confirmed appointments straight into your
              operations console.
            </p>

            <div className="hero__actions">
              <a className="btn btn--primary btn--lg" href="#businesses">
                Open a receptionist
                <ArrowRight size={16} />
              </a>
              <Link className="btn btn--secondary btn--lg" to={PATHS.login}>
                Staff sign in
              </Link>
            </div>

            <p className="hero__note">
              Customer chat is public — staff dashboards require a platform-issued account.
            </p>
          </div>

          <div className="hero-preview" aria-label="Example conversation">
            <div className="hero-preview__bar">
              <span className="status-dot status-dot--live" aria-hidden="true" />
              Preview · example conversation
            </div>
            <div className="hero-preview__body">
              <p className="hero-preview__bubble hero-preview__bubble--user">
                Hi, do you have anything tomorrow afternoon for a check-up?
              </p>
              <div className="hero-preview__bubble hero-preview__bubble--ai">
                We have a 30-minute check-up at 3:00 PM and 4:30 PM tomorrow. Which works better for
                you?
                <span className="hero-preview__slot">
                  <CalendarCheck2 size={12} aria-hidden="true" />
                  3:00 PM · Dr. Rao
                </span>
              </div>
              <p className="hero-preview__bubble hero-preview__bubble--user">
                Let&apos;s take 3 PM. My number is 98765 43210.
              </p>
              <div className="hero-preview__bubble hero-preview__bubble--ai">
                Booked. You&apos;re confirmed for tomorrow at 3:00 PM with Dr. Rao — you&apos;ll get the
                reference in a moment.
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-section" id="how-it-works">
        <div className="landing-section__head">
          <h2 className="landing-section__title">How a conversation becomes an appointment</h2>
          <p className="landing-section__text">
            The same flow runs for every business on the platform — no scripting, no manual data entry.
          </p>
        </div>
        <div className="grid grid--3 container">
          {STEPS.map((step, index) => (
            <article className="card card--padded" key={step.title}>
              <span className="feature-card__icon" aria-hidden="true">
                {index + 1}
              </span>
              <h3 className="feature-card__title">{step.title}</h3>
              <p className="feature-card__text">{step.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section" id="capabilities">
        <div className="landing-section__head">
          <h2 className="landing-section__title">What the agent can actually do</h2>
          <p className="landing-section__text">
            Every capability below maps to a real tool that runs against your database — nothing is
            simulated.
          </p>
        </div>
        <div className="grid grid--3 container">
          {CAPABILITIES.map((capability) => {
            const Icon = capability.icon;
            return (
              <article className="feature-card" key={capability.title}>
                <span className="feature-card__icon">
                  <Icon size={18} aria-hidden="true" />
                </span>
                <h3 className="feature-card__title">{capability.title}</h3>
                <p className="feature-card__text">{capability.text}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="landing-section" id="businesses">
        <div className="landing-section__head">
          <h2 className="landing-section__title">Open a receptionist</h2>
          <p className="landing-section__text">
            Businesses share a direct chat link. Paste the link you were given, or enter the business
            ID shown in the operations console.
          </p>
        </div>

        <div className="container" style={{ maxWidth: 520 }}>
          <form className="card card--padded stack" onSubmit={handleOpenChat}>
            {error ? <Alert tone="error">{error}</Alert> : null}
            <Field
              label="Business link or ID"
              htmlFor="business-reference"
              hint="Example: /c/biz_acme-dental — the ID starts with biz_."
            >
              <Input
                id="business-reference"
                value={reference}
                onChange={(event) => setReference(event.target.value)}
                placeholder="biz_… or https://…/c/biz_…"
                autoComplete="off"
                invalid={Boolean(error)}
              />
            </Field>
            <Button type="submit" block leadingIcon={<MessagesSquare size={16} />}>
              Start the conversation
            </Button>
          </form>

          <div className="card card--padded" style={{ marginTop: "20px" }}>
            <div className="row" style={{ alignItems: "flex-start" }}>
              <ShieldCheck size={18} color="#4f46e5" aria-hidden="true" />
              <div>
                <p className="feature-card__title">Why an ID instead of a directory?</p>
                <p className="feature-card__text">
                  The backend does not expose a public list of businesses — only authenticated staff
                  can read the platform directory. Each business therefore shares its own chat link,
                  and this page resolves exactly the business you point it at.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-section" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="card card--padded">
            <div className="row row--between row--wrap">
              <div>
                <h2 className="feature-card__title">Already running a business on the platform?</h2>
                <p className="feature-card__text">
                  Sign in to review conversations, manage staff availability and keep the calendar
                  accurate.
                </p>
              </div>
              <Link className="btn btn--primary" to={PATHS.login}>
                <CheckCircle2 size={16} />
                Sign in to the console
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
