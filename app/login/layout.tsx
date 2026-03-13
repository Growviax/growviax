import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Login',
    description: 'Sign in to your GrowViax account and start trading crypto.',
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
