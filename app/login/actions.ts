'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export type AuthState = {
  error?: string;
  message?: string;
};

export async function signIn(_state: AuthState, formData: FormData): Promise<AuthState> {
  const email = (formData.get('email') as string).trim();
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { error: 'Email and password are required.' };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message };
  }

  redirect('/dashboard');
}

export async function signUp(_state: AuthState, formData: FormData): Promise<AuthState> {
  const email = (formData.get('email') as string).trim();
  const password = formData.get('password') as string;
  const confirm = formData.get('confirm') as string;

  if (!email || !password) {
    return { error: 'Email and password are required.' };
  }

  if (password.length < 8) {
    return { error: 'Password must be at least 8 characters.' };
  }

  if (password !== confirm) {
    return { error: 'Passwords do not match.' };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({ email, password });

  if (error) {
    return { error: error.message };
  }

  return { message: 'Account created! Check your email to confirm before signing in.' };
}
