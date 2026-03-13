'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import axios from 'axios';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { UserIcon, PhoneIcon, EnvelopeIcon, LockClosedIcon, EyeIcon, EyeSlashIcon, KeyIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';

type Step = 'form' | 'otp' | 'forgot' | 'reset';

const slideVariants = {
    enter: { x: 24, opacity: 0 },
    center: { x: 0, opacity: 1 },
    exit: { x: -24, opacity: 0 },
};

const InputField = ({ icon: Icon, label, error, children }: { icon: any; label: string; error?: string; children: React.ReactNode }) => (
    <div className="mb-5 mt-2">
        <label className="form-label">{label}</label>
        <div className="relative">
            <Icon className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
            {children}
        </div>
        {error && <p className="text-neon-red text-xs mt-1.5 ml-1">{error}</p>}
    </div>
);

const LoadingSpinner = () => (
    <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
        <path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" fill="currentColor" className="opacity-75" />
    </svg>
);

function SignupContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const isForgot = searchParams.get('forgot') === 'true';

    const [step, setStep] = useState<Step>(isForgot ? 'forgot' : 'form');
    const [loading, setLoading] = useState(false);
    const [showPw, setShowPw] = useState(false);
    const [showCpw, setShowCpw] = useState(false);

    // Form fields
    const [inviteCode, setInviteCode] = useState('');
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');

    // Inline validation errors
    const [errors, setErrors] = useState<Record<string, string>>({});

    const validate = (): boolean => {
        const errs: Record<string, string> = {};
        if (!name.trim()) errs.name = 'Full name is required';
        if (!phone.trim() || phone.length < 10) errs.phone = 'Valid phone number is required';
        if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) errs.email = 'Valid email is required';
        if (!password || password.length < 6) errs.password = 'Password must be at least 6 characters';
        if (password !== confirmPassword) errs.confirmPassword = 'Passwords do not match';
        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const sendOTP = async () => {
        if (!validate()) return;
        setLoading(true);
        try {
            await axios.post('/api/auth/send-otp', { email });
            toast.success('OTP sent to your email');
            setStep('otp');
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Failed to send OTP');
        } finally { setLoading(false); }
    };

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!otp || otp.length !== 6) { toast.error('Please enter 6-digit OTP'); return; }

        setLoading(true);
        try {
            const res = await axios.post('/api/auth/signup', {
                inviteCode: inviteCode || undefined, name, phone, email, otp, password, confirmPassword,
            });
            toast.success(res.data.message);
            router.push('/dashboard');
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Signup failed');
        } finally { setLoading(false); }
    };

    const handleForgotRequest = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) { toast.error('Enter a valid email'); return; }
        setLoading(true);
        try {
            await axios.post('/api/auth/forgot-password', { email, step: 'request' });
            toast.success('OTP sent if email exists');
            setStep('reset');
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Failed');
        } finally { setLoading(false); }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!otp || otp.length !== 6) { toast.error('Enter 6-digit OTP'); return; }
        if (!newPassword || newPassword.length < 6) { toast.error('Password must be at least 6 characters'); return; }
        setLoading(true);
        try {
            await axios.post('/api/auth/forgot-password', { email, otp, newPassword, step: 'reset' });
            toast.success('Password reset successfully');
            router.push('/login');
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Reset failed');
        } finally { setLoading(false); }
    };

    return (
        <div className="min-h-screen flex items-center justify-center px-5 py-8 relative">
            <motion.div
                initial={{ opacity: 0, y: 24, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                className="w-full max-w-[440px]"
            >
                <div className="glass-card p-8 sm:p-10">
                    {/* Logo */}
                    <div className="flex justify-center mb-8">
                        <Image src="/img/logo.png" alt="GrowViax" width={180} height={54} priority className="h-14 w-auto" />
                    </div>

                    <AnimatePresence mode="wait">
                        {/* ---- Forgot Password: Request OTP ---- */}
                        {step === 'forgot' && (
                            <motion.div key="forgot" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.35 }}>
                                <div className="text-center mb-8">
                                    <h1 className="text-2xl font-extrabold tracking-tight mb-2">Forgot Password</h1>
                                    <p className="text-text-secondary text-sm">We&apos;ll send a reset code to your email</p>
                                </div>
                                <form onSubmit={handleForgotRequest}>
                                    <InputField icon={EnvelopeIcon} label="Email Address">
                                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="glass-input pl-12" />
                                    </InputField>
                                    <button type="submit" disabled={loading} className="btn-glow w-full">
                                        {loading ? <span className="flex items-center justify-center gap-2"><LoadingSpinner /> Sending...</span> : 'Send Reset Code'}
                                    </button>
                                </form>
                                <div className="divider" />
                                <Link href="/login" className="flex items-center justify-center gap-2 text-sm text-text-secondary hover:text-neon-green transition-colors">
                                    <ArrowLeftIcon className="w-4 h-4" /> Back to Login
                                </Link>
                            </motion.div>
                        )}

                        {/* ---- Forgot Password: Reset ---- */}
                        {step === 'reset' && (
                            <motion.div key="reset" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.35 }}>
                                <div className="text-center mb-8">
                                    <h1 className="text-2xl font-extrabold tracking-tight mb-2">Reset Password</h1>
                                    <p className="text-text-secondary text-sm">Enter the code sent to <span className="text-neon-green font-medium">{email}</span></p>
                                </div>
                                <form onSubmit={handleResetPassword}>
                                    <div className="mb-5 mt-2">
                                        <label className="form-label">Verification Code</label>
                                        <input type="text" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                            placeholder="• • • • • •" className="glass-input text-center tracking-[0.4em] text-xl font-bold" maxLength={6} />
                                    </div>
                                    <InputField icon={LockClosedIcon} label="New Password">
                                        <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Min 6 characters" className="glass-input pl-12" />
                                    </InputField>
                                    <button type="submit" disabled={loading} className="btn-glow w-full">
                                        {loading ? <span className="flex items-center justify-center gap-2"><LoadingSpinner /> Resetting...</span> : 'Reset Password'}
                                    </button>
                                </form>
                            </motion.div>
                        )}

                        {/* ---- Signup Form ---- */}
                        {step === 'form' && (
                            <motion.div key="form" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.35 }}>
                                <div className="text-center mb-8">
                                    <h1 className="text-2xl font-extrabold tracking-tight mb-2">Create Account</h1>
                                    <p className="text-text-secondary text-sm">Join GrowViax and start trading</p>
                                </div>
                                <form onSubmit={(e) => { e.preventDefault(); sendOTP(); }}>
                                    {/* Invite Code - Optional */}
                                    <InputField icon={KeyIcon} label="Invite Code (Optional)">
                                        <input type="text" value={inviteCode} onChange={(e) => setInviteCode(e.target.value)}
                                            placeholder="Enter referral code" className="glass-input pl-12" />
                                    </InputField>

                                    <InputField icon={UserIcon} label="Full Name" error={errors.name}>
                                        <input type="text" value={name} onChange={(e) => { setName(e.target.value); setErrors(p => ({ ...p, name: '' })); }}
                                            placeholder="John Doe" className="glass-input pl-12" />
                                    </InputField>

                                    <InputField icon={PhoneIcon} label="Phone Number" error={errors.phone}>
                                        <input type="tel" value={phone} onChange={(e) => { setPhone(e.target.value); setErrors(p => ({ ...p, phone: '' })); }}
                                            placeholder="+91 9876543210" className="glass-input pl-12" />
                                    </InputField>

                                    <InputField icon={EnvelopeIcon} label="Email Address" error={errors.email}>
                                        <input type="email" value={email} onChange={(e) => { setEmail(e.target.value); setErrors(p => ({ ...p, email: '' })); }}
                                            placeholder="you@example.com" className="glass-input pl-12" />
                                    </InputField>

                                    <InputField icon={LockClosedIcon} label="Password" error={errors.password}>
                                        <input type={showPw ? 'text' : 'password'} value={password}
                                            onChange={(e) => { setPassword(e.target.value); setErrors(p => ({ ...p, password: '' })); }}
                                            placeholder="Min 6 characters" className="glass-input pl-12 pr-12" />
                                        <button type="button" onClick={() => setShowPw(!showPw)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary">
                                            {showPw ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                                        </button>
                                    </InputField>

                                    <InputField icon={LockClosedIcon} label="Confirm Password" error={errors.confirmPassword}>
                                        <input type={showCpw ? 'text' : 'password'} value={confirmPassword}
                                            onChange={(e) => { setConfirmPassword(e.target.value); setErrors(p => ({ ...p, confirmPassword: '' })); }}
                                            placeholder="Re-enter password" className="glass-input pl-12 pr-12" />
                                        <button type="button" onClick={() => setShowCpw(!showCpw)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary">
                                            {showCpw ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                                        </button>
                                    </InputField>

                                    <button type="submit" disabled={loading} className="btn-glow w-full text-base mt-2">
                                        {loading ? <span className="flex items-center justify-center gap-2"><LoadingSpinner /> Sending OTP...</span> : 'Continue'}
                                    </button>
                                </form>
                                <div className="divider" />
                                <p className="text-center text-sm text-text-secondary">
                                    Already have an account?{' '}
                                    <Link href="/login" className="text-neon-green hover:text-neon-green-dim font-semibold transition-colors">Sign In</Link>
                                </p>
                            </motion.div>
                        )}

                        {/* ---- OTP Verification ---- */}
                        {step === 'otp' && (
                            <motion.div key="otp" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.35 }}>
                                <div className="text-center mb-8">
                                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-neon-green/10 flex items-center justify-center">
                                        <EnvelopeIcon className="w-8 h-8 text-neon-green" />
                                    </div>
                                    <h1 className="text-2xl font-extrabold tracking-tight mb-2">Verify Email</h1>
                                    <p className="text-text-secondary text-sm">Enter 6-digit code sent to <br /><span className="text-neon-green font-medium">{email}</span></p>
                                </div>
                                <form onSubmit={handleSignup} className="space-y-6">
                                    <input
                                        type="text" value={otp}
                                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                        placeholder="• • • • • •"
                                        className="glass-input text-center tracking-[0.5em] text-3xl py-5 font-bold"
                                        maxLength={6} autoFocus
                                    />
                                    <button type="submit" disabled={loading || otp.length !== 6} className="btn-glow w-full text-base">
                                        {loading ? <span className="flex items-center justify-center gap-2"><LoadingSpinner /> Creating Account...</span> : 'Verify & Create Account'}
                                    </button>
                                </form>
                                <div className="flex justify-between items-center mt-6">
                                    <button onClick={() => setStep('form')} className="flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary transition-colors">
                                        <ArrowLeftIcon className="w-4 h-4" /> Go Back
                                    </button>
                                    <button onClick={sendOTP} disabled={loading} className="text-sm text-neon-green hover:text-neon-green-dim font-medium transition-colors">
                                        Resend OTP
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <p className="text-center text-xs text-text-muted mt-6">
                    By signing up, you agree to our Terms & Privacy Policy
                </p>
            </motion.div>
        </div>
    );
}

export default function SignupPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="skeleton h-[600px] w-full max-w-[440px] mx-4" /></div>}>
            <SignupContent />
        </Suspense>
    );
}
