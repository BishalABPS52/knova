"use client"

import { useState, useEffect, useRef } from "react";

/* ─── tiny helpers ─── */
function Icon({ name, filled = false, className = "" }) {
  return (
    <span
      className={`material-symbols-outlined ${filled ? "icon-filled" : ""} ${className}`}
    >
      {name}
    </span>
  );
}

const CARDS = [
  {
    icon: "ads_click",
    iconBg: "bg-orange-tint",
    iconColor: "text-primary-container",
    title: "50 Flashcards created",
    badge: "🎯 Streak Active",
    wrapClass: "-rotate-3",           // base rotation for parallax reset
    animClass: "achievement-card",
  },
  {
    icon: "trending_up",
    iconBg: "bg-blue-tint",
    iconColor: "text-secondary",
    title: "Upvoted 120 times",
    badge: "📈 Community Leader",
    wrapClass: "translate-x-12 rotate-2",
    animClass: "achievement-card [animation-delay:-2s]",
  },
  {
    icon: "workspace_premium",
    iconBg: "bg-orange-tint",
    iconColor: "text-primary-container",
    title: "Top Learner this week",
    badge: "🏆 Ranking #1",
    wrapClass: "translate-x-2 -rotate-2",
    animClass: "achievement-card [animation-delay:-4s]",
  },
];

/* ─── reusable field ─── */
function Field({ id, label, children }) {
  return (
    <div className="space-y-sm">
      <label
        htmlFor={id}
        className="block text-label-md font-sans text-on-surface-variant uppercase"
      >
        {label}
      </label>
      {children}
    </div>
  );
}

function TextInput({ id, type = "text", placeholder, className = "", ...rest }) {
  return (
    <input
      id={id}
      type={type}
      placeholder={placeholder}
      className={`
        w-full h-11 px-md rounded-lg border border-border-subtle bg-white
        text-body-md font-sans text-on-surface placeholder:text-on-surface-variant/50
        focus-ring-custom transition-all duration-200
        ${className}
      `}
      {...rest}
    />
  );
}

/* ─── main page ─── */
export default function KnovaSignUp() {
  const [showPw, setShowPw] = useState(false);
  const cardRefs = useRef([]);

  // Mouse-parallax on achievement cards (mirrors original JS)
  useEffect(() => {
    const handleMove = (e) => {
      const x = (window.innerWidth / 2 - e.pageX) / 100;
      const y = (window.innerHeight / 2 - e.pageY) / 100;
      cardRefs.current.forEach((el, i) => {
        if (!el) return;
        const depth = (i + 1) * 0.5;
        const base = el.dataset.base ?? "";
        el.style.transform = `${base} translate(${x * depth}px, ${y * depth}px)`;
      });
    };
    window.addEventListener("mousemove", handleMove);
    return () => window.removeEventListener("mousemove", handleMove);
  }, []);

  return (
    <main className="flex flex-col md:flex-row min-h-screen w-full">

      {/* ══ LEFT — Registration Form ══ */}
      <section className="w-full md:w-1/2 bg-white flex flex-col justify-center items-center px-margin-mobile md:px-margin-desktop py-xxl relative overflow-hidden">
        <div className="w-full max-w-md space-y-8 z-10">

          {/* Heading */}
          <div className="space-y-2">
            <h1 className="text-heading-text text-headline-lg font-sans font-semibold">
              Create your account
            </h1>
            <p className="text-[#5c5c5c] text-body-sm font-sans">
              Join Knova and start learning.
            </p>
          </div>

          {/* Form */}
          <form className="space-y-md" onSubmit={(e) => e.preventDefault()}>

            <Field id="fullname" label="Full name">
              <TextInput id="fullname" type="text" placeholder="John Doe" />
            </Field>

            <Field id="email" label="Email address">
              <TextInput id="email" type="email" placeholder="name@example.com" />
            </Field>

            <Field id="password" label="Password">
              <div className="relative">
                <TextInput
                  id="password"
                  type={showPw ? "text" : "password"}
                  placeholder="••••••••"
                  className="pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary transition-colors"
                >
                  <Icon name={showPw ? "visibility_off" : "visibility"} />
                </button>
              </div>
            </Field>

            <Field id="confirm_password" label="Confirm password">
              <TextInput id="confirm_password" type="password" placeholder="••••••••" />
            </Field>

            <button
              type="submit"
              className="
                w-full h-[44px] mt-lg
                bg-primary-container text-white text-label-lg font-sans
                rounded-lg shadow-sm
                hover:brightness-110 active:scale-[0.98]
                transition-all duration-150
                flex items-center justify-center gap-sm
              "
            >
              Create account
            </button>
          </form>

          {/* Footer */}
          <div className="text-center pt-md">
            <p className="text-body-sm font-sans text-[#5c5c5c]">
              Already have an account?{" "}
              <a
                href="#"
                className="text-[#00afef] text-label-lg font-sans hover:underline transition-all"
              >
                Log in
              </a>
            </p>
          </div>
        </div>

        {/* Bottom branding */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-xs opacity-60">
          <Icon
            name="auto_awesome"
            filled
            className="text-primary-container text-[20px]"
          />
          <span className="text-headline-sm font-sans font-black tracking-tighter text-primary-container">
            Knova
          </span>
        </div>
      </section>

      {/* ══ Vertical divider (desktop only) ══ */}
      <div className="hidden md:block w-px bg-border-subtle h-screen self-stretch" />

      {/* ══ RIGHT — Value Prop ══ */}
      <section className="w-full md:w-1/2 bg-page-bg flex flex-col justify-between p-margin-mobile md:p-margin-desktop relative overflow-hidden min-h-[400px] md:min-h-screen">

        {/* Top-right wordmark */}
        <div className="flex justify-end items-center gap-sm">
          <Icon
            name="school"
            filled
            className="text-primary-container text-[32px]"
          />
          <span className="text-headline-md font-sans font-black tracking-tight text-heading-text">
            Knova
          </span>
        </div>

        {/* Main headline */}
        <div className="mt-auto mb-12 max-w-xl">
          <div className="space-y-4">
            <h2 className="font-black leading-tight">
              <span className="block text-[48px] md:text-[60px] text-heading-text font-sans">
                Your knowledge,
              </span>
              <span className="block text-[48px] md:text-[60px] text-primary-container font-sans">
                amplified.
              </span>
            </h2>
            <p className="text-[#5c5c5c] text-body-lg font-sans max-w-sm">
              The smarter way to study, create, and grow. All your learning
              materials in one powerful AI-driven hub.
            </p>
          </div>
        </div>

        {/* ── Floating achievement cards ── */}
        <div className="absolute top-1/4 right-8 md:right-16 flex flex-col gap-md">
          {CARDS.map((card, i) => (
            <div
              key={i}
              ref={(el) => (cardRefs.current[i] = el)}
              data-base={`${card.wrapClass.includes("-rotate-3") ? "rotate(-3deg)" : card.wrapClass.includes("rotate-2") ? "translateX(48px) rotate(2deg)" : "translateX(8px) rotate(-2deg)"}`}
              className={`
                achievement-card glass-effect
                border border-border-subtle rounded-xl p-md shadow-lg
                flex items-center gap-md min-w-[240px]
                transform ${card.wrapClass}
                ${i === 0 ? "z-30" : i === 1 ? "z-20" : "z-10"}
              `}
              style={{
                animationDelay: i === 1 ? "-2s" : i === 2 ? "-4s" : "0s",
              }}
            >
              <div
                className={`w-10 h-10 rounded-full ${card.iconBg} flex items-center justify-center ${card.iconColor} shrink-0`}
              >
                <Icon name={card.icon} />
              </div>
              <div>
                <p className="text-label-lg font-sans text-heading-text">
                  {card.title}
                </p>
                <p className="text-[10px] font-sans text-on-surface-variant uppercase tracking-wider">
                  {card.badge}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Decorative blobs */}
        <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-orange-tint rounded-full blur-3xl opacity-50 pointer-events-none" />
        <div className="absolute top-1/2 left-0 w-32 h-32 bg-blue-tint rounded-full blur-2xl opacity-40 pointer-events-none" />
      </section>
    </main>
  );
}
