'use client';

import { useState, useEffect, useRef, useCallback, RefCallback } from 'react';
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/useAuth";
import { SignUpSchema } from "@/schemas/signUp";
import Link from 'next/link';
import { ButtonSpinner } from "@/components/ui/Spinner";

type SignUpFormData = z.infer<typeof SignUpSchema>;
type UsernameStatus = 'idle' | 'checking' | 'available' | 'taken' | 'error';

// ---------------------------------------------------------------------------
// TODO: wire this up to your real API. Replace the mock body below with a
// fetch call to your backend, e.g.:
//
//   const res = await fetch(`/api/users/check-username?username=${encodeURIComponent(username)}`);
//   const data = await res.json();
//   return data.available;
//
async function checkUsernameAvailability(username: string): Promise<boolean> {
  // MOCK — remove once the real endpoint exists.
  await new Promise((resolve) => setTimeout(resolve, 400));
  return true;
}
// ---------------------------------------------------------------------------

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>('idle');
  const router = useRouter();
  const { register: registerUser, loading, error } = useAuth();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<SignUpFormData>({
    resolver: zodResolver(SignUpSchema),
  });

  const usernameValue = watch("username");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced live username availability check — only fires once the value
  // clears the schema's own min-length rule, so we're not hitting the API
  // on every keystroke of a 1-4 char string.
  useEffect(() => {
    if (!usernameValue || usernameValue.length < 5) {
      setUsernameStatus('idle');
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    setUsernameStatus('checking');

    debounceRef.current = setTimeout(async () => {
      try {
        const available = await checkUsernameAvailability(usernameValue);
        setUsernameStatus(available ? 'available' : 'taken');
      } catch {
        setUsernameStatus('error');
      }
    }, 500);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [usernameValue]);

  const animRefs = useRef<(HTMLDivElement | HTMLElement | null)[]>([]);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  useEffect(() => {
    animRefs.current.forEach((el, i) => {
      if (!el) return;
      const htmlEl = el as HTMLElement;
      htmlEl.style.opacity = '0';
      htmlEl.style.transform = 'translateY(10px)';
      htmlEl.style.transition = 'all 0.4s ease-out';
      setTimeout(() => {
        htmlEl.style.opacity = '1';
        htmlEl.style.transform = 'translateY(0)';
      }, 100 + i * 60);
    });
  }, []);

  const ref = (i: number): RefCallback<HTMLDivElement | HTMLElement> =>
    (el) => { animRefs.current[i] = el; };

  // --- Desktop-only floating card parallax ---
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  useEffect(() => {
    if (isMobile) return;
    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 2;
      const y = (e.clientY / window.innerHeight - 0.5) * 2;
      cardRefs.current.forEach((card, i) => {
        if (!card) return;
        const depth = (i + 1) * 4;
        card.style.transform = `translate(${x * depth}px, ${y * depth}px)`;
      });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [isMobile]);

  const onSubmit = async (data: SignUpFormData) => {
    if (usernameStatus === 'taken') return; // extra guard on top of schema
    try {
      await registerUser({
        email: data.email,
        username: data.username,
        password: data.password,
        // If your backend also accepts these, uncomment:
        // name: data.name,
        // dateOfBirth: data.dateOfBirth,
      });
    } catch {
      // error is already captured by useAuth and rendered below
    }
  };

  const UsernameHint = () => {
    if (usernameStatus === 'checking') {
      return <p className="text-[12px] text-[#594137] mt-1">Checking availability...</p>;
    }
    if (usernameStatus === 'available') {
      return <p className="text-[12px] text-green-600 mt-1 flex items-center gap-1">
        <span className="material-symbols-outlined text-[14px]">check_circle</span>
        Username available
      </p>;
    }
    if (usernameStatus === 'taken') {
      return <p className="text-[12px] text-red-600 mt-1 flex items-center gap-1">
        <span className="material-symbols-outlined text-[14px]">cancel</span>
        Username already taken
      </p>;
    }
    if (usernameStatus === 'error') {
      return <p className="text-[12px] text-[#594137] mt-1">Couldn't check availability, try again</p>;
    }
    return null;
  };

  const usernameBorderClass =
    usernameStatus === 'available'
      ? 'border-green-500 focus:border-green-500 focus:ring-green-500/10'
      : usernameStatus === 'taken'
      ? 'border-red-500 focus:border-red-500 focus:ring-red-500/10'
      : 'border-[#D9D9D9] focus:border-[#00afef] focus:ring-[#00afef]/10';

  const TermsModal = () =>
    showTermsModal ? (
      <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-black/40 backdrop-blur-sm px-0 md:px-4">
        <div className="w-full max-w-[500px] bg-white rounded-t-xl md:rounded-xl p-6 shadow-xl max-h-[80vh] flex flex-col animate-in slide-in-from-bottom duration-300">
          <div className="flex justify-between items-center mb-4 shrink-0">
            <h3 className="text-lg font-bold text-[#1a1a1a]">Terms &amp; Conditions</h3>
            <button
              className="material-symbols-outlined text-[#594137] hover:text-[#f36710]"
              onClick={() => setShowTermsModal(false)}
            >
              close
            </button>
          </div>
          <div className="overflow-y-auto text-left text-[14px] text-[#5c5c5c] space-y-4">
            <p>Welcome to Knova. By using our platform, you agree to the following terms:</p>
            <p>1. You must provide accurate information during registration.</p>
            <p>2. You are responsible for maintaining the security of your account.</p>
            <p>3. Content shared on Knova must respect our community guidelines.</p>
            <p>4. We reserve the right to modify these terms at any time.</p>
          </div>
          <button
            className="w-full mt-6 h-[50px] bg-[#f36710] text-white font-bold rounded-lg shrink-0"
            onClick={() => setShowTermsModal(false)}
          >
            Close
          </button>
        </div>
      </div>
    ) : null;

  // ---------------- Mobile View ----------------
  if (isMobile) {
    return (
      <div className="flex flex-col min-h-screen items-center text-center bg-white">
        <main className="w-full max-w-[400px] flex flex-col items-center px-4 pt-12 pb-8 flex-grow">
          <header ref={ref(0)} className="flex flex-col items-center mb-8">
            <img
              src="/logos/KnovaWordmark.svg"
              alt="Knova"
              className="w-[180px] h-auto mb-2"
            />
            <p className="text-[#5c5c5c] text-[13px] mt-1">
              Join the learning community.
            </p>
          </header>

          <form className="w-full flex flex-col gap-3" onSubmit={handleSubmit(onSubmit)} noValidate>
            {error && (
              <div ref={ref(1)} className="text-left text-[13px] text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <div ref={ref(2)} className="relative w-full text-left">
              <input
                className="w-full h-[48px] px-4 bg-white border border-[#d9d9d9] rounded-lg text-[15px] focus:outline-none focus:border-[#00afef] focus:ring-4 focus:ring-[#00afef]/10 transition-all placeholder:text-[#594137]/50"
                placeholder="Full name"
                type="text"
                {...register("name")}
              />
              {errors.name && (
                <p className="text-[12px] text-red-600 mt-1">{errors.name.message}</p>
              )}
            </div>

            <div ref={ref(3)} className="relative w-full text-left">
              <input
                className={`w-full h-[48px] px-4 bg-white border rounded-lg text-[15px] focus:outline-none focus:ring-4 transition-all placeholder:text-[#594137]/50 ${usernameBorderClass}`}
                placeholder="Username (min. 5 characters)"
                type="text"
                {...register("username")}
              />
              {errors.username ? (
                <p className="text-[12px] text-red-600 mt-1">{errors.username.message}</p>
              ) : (
                <UsernameHint />
              )}
            </div>

            <div ref={ref(4)} className="relative w-full text-left">
              <input
                className="w-full h-[48px] px-4 bg-white border border-[#d9d9d9] rounded-lg text-[15px] focus:outline-none focus:border-[#00afef] focus:ring-4 focus:ring-[#00afef]/10 transition-all placeholder:text-[#594137]/50"
                placeholder="Email address"
                type="email"
                {...register("email")}
              />
              {errors.email && (
                <p className="text-[12px] text-red-600 mt-1">{errors.email.message}</p>
              )}
            </div>

            <div ref={ref(5)} className="relative w-full text-left">
              <input
                className="w-full h-[48px] px-4 bg-white border border-[#d9d9d9] rounded-lg text-[15px] focus:outline-none focus:border-[#00afef] focus:ring-4 focus:ring-[#00afef]/10 transition-all placeholder:text-[#594137]/50"
                placeholder="Date of Birth"
                type="date"
                {...register("dateOfBirth")}
              />
              {errors.dateOfBirth && (
                <p className="text-[12px] text-red-600 mt-1">{errors.dateOfBirth.message}</p>
              )}
            </div>

            <div ref={ref(6)} className="relative w-full text-left">
              <input
                className="w-full h-[48px] pl-4 pr-12 bg-white border border-[#d9d9d9] rounded-lg text-[15px] focus:outline-none focus:border-[#00afef] focus:ring-4 focus:ring-[#00afef]/10 transition-all placeholder:text-[#594137]/50"
                placeholder="Password"
                type={showPassword ? 'text' : 'password'}
                {...register("password")}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#594137]/60 hover:text-[#00afef] active:scale-90 transition-transform"
                onClick={() => setShowPassword(!showPassword)}
              >
                <span className="material-symbols-outlined">
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
              {errors.password && (
                <p className="text-[12px] text-red-600 mt-1">{errors.password.message}</p>
              )}
            </div>

            <div ref={ref(7)} className="relative w-full text-left">
              <input
                className="w-full h-[48px] pl-4 pr-12 bg-white border border-[#d9d9d9] rounded-lg text-[15px] focus:outline-none focus:border-[#00afef] focus:ring-4 focus:ring-[#00afef]/10 transition-all placeholder:text-[#594137]/50"
                placeholder="Confirm password"
                type={showConfirmPassword ? 'text' : 'password'}
                {...register("confirmPassword")}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#594137]/60 hover:text-[#00afef] active:scale-90 transition-transform"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                <span className="material-symbols-outlined">
                  {showConfirmPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
              {errors.confirmPassword && (
                <p className="text-[12px] text-red-600 mt-1">{errors.confirmPassword.message}</p>
              )}
            </div>

            <div ref={ref(8)} className="flex items-center gap-3 px-1 mt-4 text-left">
              <input
                className="w-5 h-5 rounded border-[#d9d9d9] text-[#f36710] focus:ring-[#f36710]"
                id="terms-checkbox"
                type="checkbox"
                {...register("agreeToTerms")}
              />
              <label className="text-[14px] text-[#5c5c5c]" htmlFor="terms-checkbox">
                I agree to the{' '}
                <button
                  type="button"
                  className="text-[#00afef] font-bold hover:underline"
                  onClick={() => setShowTermsModal(true)}
                >
                  Terms &amp; Conditions
                </button>
              </label>
            </div>
            {errors.agreeToTerms && (
              <p className="text-[12px] text-red-600 -mt-2 text-left">{errors.agreeToTerms.message}</p>
            )}

            <div ref={ref(9)} className="mt-5">
              <button
                type="submit"
                disabled={loading || usernameStatus === 'taken' || usernameStatus === 'checking'}
                className="w-full h-[50px] bg-[#f36710] text-white font-bold rounded-lg active:scale-[0.98] transition-transform shadow-sm flex items-center justify-center disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? <ButtonSpinner size={20}>Creating account</ButtonSpinner> : "Create Account"}
              </button>
            </div>

            <div ref={ref(10)} className="flex items-center gap-4 my-[14px]">
              <div className="h-px flex-grow bg-[#D9D9D9]" />
              <span className="text-[#5c5c5c] text-[14px]">or</span>
              <div className="h-px flex-grow bg-[#D9D9D9]" />
            </div>

            <div ref={ref(11)} className="mb-5">
              <Link href="/login" className="block">
                <button
                  type="button"
                  className="w-full h-[50px] bg-[#00afef] text-white font-bold rounded-lg active:scale-[0.98] transition-transform shadow-sm flex items-center justify-center"
                >
                  Already have an account? Log In
                </button>
              </Link>
            </div>
          </form>
        </main>

        <footer ref={ref(12)} className="w-full mt-auto pb-10 flex flex-col items-center gap-4">
          <nav className="flex items-center gap-4 text-[12px] font-semibold tracking-wide text-[#5c5c5c]">
            <a href="#" className="hover:text-[#00afef] transition-colors">About</a>
            <span className="text-[#D9D9D9]">·</span>
            <a href="#" className="hover:text-[#00afef] transition-colors">Help</a>
            <span className="text-[#D9D9D9]">·</span>
            <a href="#" className="hover:text-[#00afef] transition-colors">Contact</a>
          </nav>
          <div className="flex items-center gap-1.5 text-[#5c5c5c] text-[12px] opacity-70">
            <img src="/logos/KnovaWordmark.svg" alt="Knova" className="h-4 w-auto opacity-70" />
            <span>©</span>
          </div>
        </footer>

        <TermsModal />
      </div>
    );
  }

  // ---------------- Desktop View ----------------
  return (
    <main className="flex flex-col md:flex-row min-h-screen w-full">
      {/* Left Side - Registration Form */}
      <section className="w-full md:w-1/2 bg-white flex flex-col justify-center items-center px-8 lg:px-16 py-12 relative overflow-hidden">
        <div className="w-full max-w-md min-w-[320px] space-y-8">
          <div className="mb-4">
            <img src="/logos/Knova.png" alt="Knova" className="h-16 w-auto" />
          </div>

          <div className="space-y-2 text-left">
            <h1 className="text-[22px] leading-[32px] font-semibold text-[#1a1a1a]">
              Create your account
            </h1>
            <p className="text-[14px] text-[#5c5c5c]">
              Join Knova and start learning.
            </p>
          </div>

          {error && (
            <div className="text-[13px] text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
            <div>
              <label className="block text-[12px] uppercase tracking-wide text-[#594137] mb-2">
                Full Name
              </label>
              <input
                type="text"
                placeholder="John Doe"
                className="w-full h-11 px-4 rounded-lg border border-[#D9D9D9] focus:outline-none focus:border-[#00afef] focus:ring-2 focus:ring-[#00afef]/20 transition-all"
                {...register("name")}
              />
              {errors.name && (
                <p className="text-[12px] text-red-600 mt-1">{errors.name.message}</p>
              )}
            </div>

            <div>
              <label className="block text-[12px] uppercase tracking-wide text-[#594137] mb-2">
                Username
              </label>
              <input
                type="text"
                placeholder="@username (min. 5 characters)"
                className={`w-full h-11 px-4 rounded-lg border focus:outline-none focus:ring-2 transition-all ${usernameBorderClass}`}
                {...register("username")}
              />
              {errors.username ? (
                <p className="text-[12px] text-red-600 mt-1">{errors.username.message}</p>
              ) : (
                <UsernameHint />
              )}
            </div>

            <div>
              <label className="block text-[12px] uppercase tracking-wide text-[#594137] mb-2">
                Email Address
              </label>
              <input
                type="email"
                placeholder="name@example.com"
                className="w-full h-11 px-4 rounded-lg border border-[#D9D9D9] focus:outline-none focus:border-[#00afef] focus:ring-2 focus:ring-[#00afef]/20 transition-all"
                {...register("email")}
              />
              {errors.email && (
                <p className="text-[12px] text-red-600 mt-1">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="block text-[12px] uppercase tracking-wide text-[#594137] mb-2">
                Date of Birth
              </label>
              <input
                type="date"
                className="w-full h-11 px-4 rounded-lg border border-[#D9D9D9] focus:outline-none focus:border-[#00afef] focus:ring-2 focus:ring-[#00afef]/20 transition-all"
                {...register("dateOfBirth")}
              />
              {errors.dateOfBirth && (
                <p className="text-[12px] text-red-600 mt-1">{errors.dateOfBirth.message}</p>
              )}
            </div>

            <div>
              <label className="block text-[12px] uppercase tracking-wide text-[#594137] mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="w-full h-11 px-4 pr-12 rounded-lg border border-[#D9D9D9] focus:outline-none focus:border-[#00afef] focus:ring-2 focus:ring-[#00afef]/20 transition-all"
                  {...register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#5c5c5c] hover:text-[#f36710] transition-colors"
                >
                  <span className="material-symbols-outlined">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
              {errors.password && (
                <p className="text-[12px] text-red-600 mt-1">{errors.password.message}</p>
              )}
            </div>

            <div>
              <label className="block text-[12px] uppercase tracking-wide text-[#594137] mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="w-full h-11 px-4 pr-12 rounded-lg border border-[#D9D9D9] focus:outline-none focus:border-[#00afef] focus:ring-2 focus:ring-[#00afef]/20 transition-all"
                  {...register("confirmPassword")}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#5c5c5c] hover:text-[#f36710] transition-colors"
                >
                  <span className="material-symbols-outlined">
                    {showConfirmPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-[12px] text-red-600 mt-1">{errors.confirmPassword.message}</p>
              )}
            </div>

            <div className="flex items-center gap-2 py-1">
              <input
                type="checkbox"
                id="terms-desktop"
                className="w-4 h-4 rounded border-[#D9D9D9] text-[#f36710] focus:ring-[#f36710]"
                {...register("agreeToTerms")}
              />
              <label htmlFor="terms-desktop" className="text-[14px] text-[#594137]">
                I agree to the{' '}
                <button
                  type="button"
                  onClick={() => setShowTermsModal(true)}
                  className="text-[#00afef] font-semibold hover:underline"
                >
                  Terms &amp; Conditions
                </button>
              </label>
            </div>
            {errors.agreeToTerms && (
              <p className="text-[12px] text-red-600 -mt-2">{errors.agreeToTerms.message}</p>
            )}

            <button
              type="submit"
              disabled={loading || usernameStatus === 'taken' || usernameStatus === 'checking'}
              className="w-full h-11 bg-[#f36710] text-white font-bold rounded-lg hover:brightness-110 active:scale-[0.98] transition-all shadow-sm mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? <ButtonSpinner>Creating account</ButtonSpinner> : "Create Account"}
            </button>
          </form>

          <div className="text-center pt-2">
            <p className="text-[14px] text-[#5c5c5c]">
              Already have an account?{' '}
              <Link href="/login" className="text-[#00afef] font-medium hover:underline">
                Log in
              </Link>
            </p>
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="hidden md:block w-[1px] bg-[#D9D9D9]" />

      {/* Right Side */}
      <section className="w-full md:w-1/2 bg-[#f5f5f5] flex flex-col justify-between p-8 lg:p-12 relative overflow-hidden min-h-[400px] md:min-h-screen">
        <div className="flex justify-end items-center">
          <img src="/logos/KnovaWordmark.svg" alt="Knova" className="w-[160px] h-auto" />
        </div>

        {/* Floating Achievement Cards */}
        <div className="absolute top-1/4 right-8 md:right-16 flex flex-col gap-4 z-10">
          <div
            ref={(el) => { cardRefs.current[0] = el; }}
            className="bg-white/90 backdrop-blur-sm border border-[#D9D9D9] rounded-xl p-4 shadow-lg flex items-center gap-4 min-w-[240px] -rotate-3 transition-transform duration-300 ease-out"
          >
            <div className="w-10 h-10 rounded-full bg-[#FEF3EA] flex items-center justify-center text-[#f36710]">
              <span className="material-symbols-outlined">ads_click</span>
            </div>
            <div className="text-left">
              <p className="text-[14px] font-semibold text-[#1a1a1a]">50 Flashcards created</p>
              <p className="text-[10px] text-[#594137] uppercase tracking-wider"> Streak Active</p>
            </div>
          </div>

          <div
            ref={(el) => { cardRefs.current[1] = el; }}
            className="bg-white/90 backdrop-blur-sm border border-[#D9D9D9] rounded-xl p-4 shadow-lg flex items-center gap-4 min-w-[240px] translate-x-12 rotate-2 transition-transform duration-300 ease-out"
          >
            <div className="w-10 h-10 rounded-full bg-[#E0F6FE] flex items-center justify-center text-[#00658c]">
              <span className="material-symbols-outlined">trending_up</span>
            </div>
            <div className="text-left">
              <p className="text-[14px] font-semibold text-[#1a1a1a]">Upvoted 120 times</p>
              <p className="text-[10px] text-[#594137] uppercase tracking-wider"> Community Leader</p>
            </div>
          </div>

          <div
            ref={(el) => { cardRefs.current[2] = el; }}
            className="bg-white/90 backdrop-blur-sm border border-[#D9D9D9] rounded-xl p-4 shadow-lg flex items-center gap-4 min-w-[240px] translate-x-2 -rotate-2 transition-transform duration-300 ease-out"
          >
            <div className="w-10 h-10 rounded-full bg-[#FEF3EA] flex items-center justify-center text-[#f36710]">
              <span className="material-symbols-outlined">workspace_premium</span>
            </div>
            <div className="text-left">
              <p className="text-[14px] font-semibold text-[#1a1a1a]">Top Learner this week</p>
              <p className="text-[10px] text-[#594137] uppercase tracking-wider"> Ranking #1</p>
            </div>
          </div>
        </div>

        {/* Headline & Copy */}
        <div className="mt-auto mb-12 max-w-xl">
          <h2 className="font-black leading-[1.1] mb-4 tracking-tight text-left">
            <span className="block text-[48px] md:text-[60px] text-[#1a1a1a]">Your knowledge,</span>
            <span className="block text-[48px] md:text-[60px] text-[#f36710]">amplified.</span>
          </h2>
          <p className="text-[#5c5c5c] text-[16px] leading-relaxed max-w-sm text-left">
            The smarter way to study, create, and grow. All your learning materials in one powerful AI-driven hub.
          </p>
        </div>

        {/* Decorative blobs */}
        <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-[#FEF3EA] rounded-full blur-3xl opacity-50 pointer-events-none" />
        <div className="absolute top-1/2 left-0 w-32 h-32 bg-[#E0F6FE] rounded-full blur-2xl opacity-40 pointer-events-none" />
      </section>

      <TermsModal />
    </main>
  );
}