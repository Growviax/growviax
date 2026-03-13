import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Sign Up',
    description: 'Create your GrowViax account and start trading crypto today.',
};

export default function SignupLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
