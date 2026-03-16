'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) { toast.error('Passwords do not match'); return; }
    if (password.length < 8) { toast.error('Password must be at least 8 characters'); return; }

    setIsLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success('Password updated successfully');
      router.push('/dashboard');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 data-testid="reset-heading" className="text-3xl font-bold text-[var(--foreground)]">Set new password</h2>
        <p className="text-sm text-[var(--muted-foreground)]">Enter your new password below.</p>
      </div>

      <form data-testid="reset-form" className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <Label htmlFor="password">New Password</Label>
          <div className="relative">
            <Input
              id="password" type={showPassword ? 'text' : 'password'}
              data-testid="reset-password"
              placeholder="Min. 8 characters" value={password}
              onChange={(e) => setPassword(e.target.value)} disabled={isLoading}
              className="h-12 rounded-xl pr-10" minLength={8}
            />
            <button type="button" data-testid="reset-toggle-password" onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm-password">Confirm Password</Label>
          <Input
            id="confirm-password" type="password" placeholder="Confirm your password"
            data-testid="reset-confirm-password"
            value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={isLoading} className="h-12 rounded-xl"
          />
        </div>
        <Button type="submit" data-testid="reset-submit" className="w-full h-12 rounded-xl" disabled={isLoading}>
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Update Password'}
        </Button>
      </form>
    </div>
  );
}
