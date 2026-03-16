'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { toast.error('Please enter your email'); return; }

    setIsLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });
      if (error) throw error;
      setSent(true);
      toast.success('Password reset link sent');
    } catch (err: any) {
      toast.error(err.message || 'Failed to send reset link');
    } finally {
      setIsLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="space-y-6 text-center">
        <h2 data-testid="forgot-sent-heading" className="text-3xl font-bold text-[var(--foreground)]">Check your email</h2>
        <p className="text-[var(--muted-foreground)]">We sent a password reset link to <strong>{email}</strong></p>
        <Link href="/auth/login" data-testid="forgot-sent-back-link" className="inline-flex items-center gap-2 text-[#003366] dark:text-blue-400 hover:underline">
          <ArrowLeft className="w-4 h-4" /> Back to login
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 data-testid="forgot-heading" className="text-3xl font-bold text-[var(--foreground)]">Forgot password?</h2>
        <p className="text-sm text-[var(--muted-foreground)]">Enter your email and we&apos;ll send a reset link.</p>
      </div>

      <form data-testid="forgot-form" className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email" type="email" placeholder="you@example.com"
            data-testid="forgot-email"
            value={email} onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading} className="h-12 rounded-xl"
          />
        </div>
        <Button type="submit" data-testid="forgot-submit" className="w-full h-12 rounded-xl" disabled={isLoading}>
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send Reset Link'}
        </Button>
      </form>

      <div className="text-center">
        <Link href="/auth/login" data-testid="forgot-back-link" className="inline-flex items-center gap-2 text-sm text-[#003366] dark:text-blue-400 hover:underline">
          <ArrowLeft className="w-4 h-4" /> Back to login
        </Link>
      </div>
    </div>
  );
}
