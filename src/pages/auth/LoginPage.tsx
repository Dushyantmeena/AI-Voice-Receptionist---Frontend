import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { ROLE_HOME } from "@/constants/domain";
import { PATHS } from "@/routes/paths";
import { getErrorMessage } from "@/api/apiError";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Feedback";
import { Icon } from "@/components/ui/Icon";

const loginSchema = z.object({
  email: z.string().trim().min(1, "Email is required").email("Enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginValues = z.infer<typeof loginSchema>;

const PLATFORM_POINTS = [
  {
    asset: "messages-square",
    title: "Conversational front desk",
    text: "The AI receptionist answers, checks availability and books appointments using your real service catalogue.",
  },
  {
    asset: "calendar-days",
    title: "One shared calendar",
    text: "Every booking the agent makes lands in the same appointment book your team already works from.",
  },
  {
    asset: "user-round-cog",
    title: "Role-based workspaces",
    text: "Platform owners, business administrators and staff each see exactly the data their role allows.",
  },
];

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (values: LoginValues) => {
    setFormError(null);
    try {
      const profile = await login(values.email, values.password);
      const requested = (location.state as { from?: string } | null)?.from;
      const destination =
        requested && requested.startsWith("/") && requested !== PATHS.login
          ? requested
          : ROLE_HOME[profile.role];
      navigate(destination, { replace: true });
    } catch (error) {
      setFormError(getErrorMessage(error));
    }
  };

  return (
    <div className="auth-layout">
      <aside className="auth-layout__aside">
        <div className="auth-layout__brand">
          <span className="auth-layout__brand-mark" aria-hidden="true">
            <Icon name="mic" size={17} />
          </span>
          <span>
            <span className="auth-layout__brand-name">AI Voice Receptionist</span>
            <br />
            <span className="auth-layout__brand-meta">Operations console</span>
          </span>
        </div>

        <div className="auth-layout__aside-content">
          <h1 className="auth-layout__headline">
            Every call answered.
            <br />
            Every booking <em>recorded</em>.
          </h1>
          <p className="auth-layout__lede">
            Sign in to manage your business, your team&apos;s schedule and the conversations your AI
            receptionist is having with customers.
          </p>

          <div className="auth-layout__points">
            {PLATFORM_POINTS.map((point) => (
              <div className="auth-layout__point" key={point.title}>
                <span className="auth-layout__point-icon" aria-hidden="true">
                  <Icon name={point.asset} size={15} />
                </span>
                <div>
                  <p className="auth-layout__point-title">{point.title}</p>
                  <p className="auth-layout__point-text">{point.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="auth-layout__footer">Secure JWT session · Sessions expire after 7 days</p>
      </aside>

      <div className="auth-layout__main">
        <div className="auth-card">
          <Link className="auth-card__mobile-brand" to={PATHS.home}>
            <span className="public-nav__mark" aria-hidden="true">
              <Icon name="mic" size={15} />
            </span>
            Voice Receptionist
          </Link>

          <h2 className="auth-card__title">Sign in to your workspace</h2>
          <p className="auth-card__subtitle">
            Use the credentials issued by your platform administrator.
          </p>

          <form className="auth-card__form" onSubmit={handleSubmit(onSubmit)} noValidate>
            {formError ? (
              <Alert tone="error" title="Sign-in failed">
                {formError}
              </Alert>
            ) : null}

            <Field label="Email address" htmlFor="email" required error={errors.email?.message}>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@business.com"
                invalid={Boolean(errors.email)}
                {...register("email")}
              />
            </Field>

            <Field label="Password" htmlFor="password" required error={errors.password?.message}>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                invalid={Boolean(errors.password)}
                {...register("password")}
              />
            </Field>

            <Button type="submit" block size="lg" isLoading={isSubmitting}>
              {isSubmitting ? "Signing in…" : "Sign in"}
              {isSubmitting ? null : <ArrowRight size={16} />}
            </Button>
          </form>

          <p className="auth-card__hint">
            There is no self-service sign-up. Business accounts are created by the platform owner and
            staff logins are issued by a business administrator.
          </p>

          <p className="auth-card__foot">
            <Link className="btn-link" to={PATHS.home}>
              Back to the public site
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
