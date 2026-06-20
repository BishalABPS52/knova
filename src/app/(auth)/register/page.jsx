'use client';

import { useState } from 'react';

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    // Handle registration logic
  };

  return (
    <main className="flex flex-col md:flex-row min-h-screen w-full">
      {/* Left Side - Registration Form */}
      <section className="w-full md:w-1/2 bg-white flex flex-col justify-center items-center px-8 lg:px-16 py-12 relative">
        <div className="w-full max-w-md min-w-[320px]">
          {/* Heading */}
          <div className="mb-8 w-full text-left">
            <h1 className="text-[32px] font-semibold text-[#1a1a1a] mb-2 whitespace-nowrap">
              Create your account
            </h1>
            <p className="text-[14px] text-[#5c5c5c]">
              Join Knova and start learning.
            </p>
          </div>

          {/* Form */}
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-[12px] uppercase tracking-wide text-[#5c5c5c] mb-2">
                Full Name
              </label>
              <input
                type="text"
                placeholder="John Doe"
                className="w-full h-12 px-4 rounded-lg border border-[#d9d9d9] focus:border-[#00afef] focus:ring-2 focus:ring-[#00afef]/20 outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-[12px] uppercase tracking-wide text-[#5c5c5c] mb-2">
                Email Address
              </label>
              <input
                type="email"
                placeholder="name@example.com"
                className="w-full h-12 px-4 rounded-lg border border-[#d9d9d9] focus:border-[#00afef] focus:ring-2 focus:ring-[#00afef]/20 outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-[12px] uppercase tracking-wide text-[#5c5c5c] mb-2">
                Password
              </label>

              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="w-full h-12 px-4 pr-12 rounded-lg border border-[#d9d9d9] focus:border-[#00afef] focus:ring-2 focus:ring-[#00afef]/20 outline-none transition-all"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#5c5c5c]"
                >
                  <span className="material-symbols-outlined">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[12px] uppercase tracking-wide text-[#5c5c5c] mb-2">
                Confirm Password
              </label>

              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="w-full h-12 px-4 pr-12 rounded-lg border border-[#d9d9d9] focus:border-[#00afef] focus:ring-2 focus:ring-[#00afef]/20 outline-none transition-all"
                />

                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#5c5c5c]"
                >
                  <span className="material-symbols-outlined">
                    {showConfirmPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full h-11 bg-[#f36710] text-white font-bold rounded-lg hover:bg-[#d4580e] transition-colors shadow-sm mt-2"
            >
              Create Account
            </button>
          </form>

          {/* Footer */}
          <div className="text-center mt-6">
            <p className="text-[14px] text-[#5c5c5c]">
              Already have an account?{' '}
              <a
                href="#"
                className="text-[#00afef] font-medium hover:underline"
              >
                Log in
              </a>
            </p>
          </div>
        </div>

        {/* Bottom Branding */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 opacity-60">
          <span
            className="material-symbols-outlined text-[#f36710]"
            style={{ fontVariationSettings: "'FILL' 1'" }}
          >
            auto_awesome
          </span>

          <span className="font-black text-[#f36710] text-lg">Knova</span>
        </div>
      </section>

      {/* Divider */}
      <div className="hidden md:block w-[1px] bg-[#d9d9d9]" />

      {/* Right Side */}
      <section className="w-full md:w-1/2 bg-page-bg flex flex-col justify-between p-8 lg:p-12 relative overflow-hidden">
        {/* Logo */}
        <div className="flex justify-end items-center gap-2">
          <span
            className="material-symbols-outlined text-[#f36710] text-3xl"
            style={{ fontVariationSettings: "'FILL' 1'" }}
          >
            school
          </span>

          <span className="text-2xl font-black text-[#1a1a1a]">Knova</span>
        </div>

        {/* Headline */}
        <div className="max-w-xl mb-12">
          <h2 className="font-black leading-tight mb-4">
            <span className="block text-[48px] md:text-[60px] text-[#1a1a1a]">
              Your knowledge,
            </span>

            <span className="block text-[48px] md:text-[60px] text-[#f36710]">
              amplified.
            </span>
          </h2>

          <p className="text-[#5c5c5c] text-lg max-w-sm">
            The smarter way to study, create, and grow. All your learning
            materials in one powerful AI-driven hub.
          </p>
        </div>

        {/* Achievement Cards */}
        <div className="absolute top-1/4 right-8 md:right-16 flex flex-col gap-4">
          <div className="glass-card bg-card-bg rounded-xl p-4 shadow-lg flex items-center gap-4 -rotate-3">
            <div className="w-10 h-10 rounded-full bg-orange-tint flex items-center justify-center">
              <span className="material-symbols-outlined text-[#f36710]">
                ads_click
              </span>
            </div>

            <div>
              <p className="font-semibold text-[#1a1a1a]">
                50 Flashcards created
              </p>
              <p className="text-[10px] uppercase text-[#5c5c5c]">
                🎯 Streak Active
              </p>
            </div>
          </div>

          <div className="glass-card bg-card-bg rounded-xl p-4 shadow-lg flex items-center gap-4 translate-x-10 rotate-2">
            <div className="w-10 h-10 rounded-full bg-blue-tint flex items-center justify-center">
              <span className="material-symbols-outlined text-[#00afef]">
                trending_up
              </span>
            </div>

            <div>
              <p className="font-semibold text-[#1a1a1a]">
                Upvoted 120 times
              </p>
              <p className="text-[10px] uppercase text-[#5c5c5c]">
                📈 Community Leader
              </p>
            </div>
          </div>

          <div className="glass-card bg-card-bg rounded-xl p-4 shadow-lg flex items-center gap-4 rotate-[-2deg]">
            <div className="w-10 h-10 rounded-full bg-orange-tint flex items-center justify-center">
              <span className="material-symbols-outlined text-[#f36710]">
                workspace_premium
              </span>
            </div>

            <div>
              <p className="font-semibold text-[#1a1a1a]">
                Top Learner this week
              </p>
              <p className="text-[10px] uppercase text-[#5c5c5c]">
                🏆 Ranking #1
              </p>
            </div>
          </div>
        </div>

        {/* Decorative Blobs */}
        <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-orange-tint rounded-full blur-3xl opacity-50 pointer-events-none" />
        <div className="absolute top-1/2 left-0 w-32 h-32 bg-blue-tint rounded-full blur-2xl opacity-40 pointer-events-none" />
      </section>
    </main>
  );
}