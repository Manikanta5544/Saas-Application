import { supabase, type User, type UserProfile, type Tenant } from './supabase';
export { type User, type UserProfile, type Tenant };

export class AuthService {
  /** Sign in user with email + password */
  static async signIn(email: string, password: string): Promise<User | null> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error || !data.user) {
        console.error('Sign-in error:', error?.message);
        throw new Error('Invalid email or password');
      }

      return await this.getCurrentUser();
    } catch (err) {
      console.error('Sign-in failed:', err);
      throw new Error('Authentication failed. Please try again.');
    }
  }

  /** Sign out current user */
  static async signOut(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Sign-out error:', error.message);
      throw new Error('Failed to sign out. Please try again.');
    }
  }
  
  static async getCurrentUser(): Promise<User | null> {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) return null;
      
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select(
          `
          *,
          tenant:tenants(*)
          `
        )
        .eq('id', user.id)
        .maybeSingle();

      if (profileError) {
        console.warn('User profile not found:', profileError.message);
        return { id: user.id, email: user.email! };
      }

      return {
        id: user.id,
        email: user.email!,
        profile: profile as UserProfile,
        tenant: (profile?.tenant as Tenant) ?? undefined,
      };
    } catch (err) {
      console.error('Error fetching current user:', err);
      return null;
    }
  }

  /* Create test accounts */
  static async createTestUsers(): Promise<void> {
    if (process.env.NODE_ENV === 'production') {
      console.warn('createTestUsers() should not run in production');
      return;
    }

    const testUsers = [
      { email: 'admin@acme.test', password: 'password' },
      { email: 'user@acme.test', password: 'password' },
      { email: 'admin@globex.test', password: 'password' },
      { email: 'user@globex.test', password: 'password' },
    ];

    for (const { email, password } of testUsers) {
      try {
        const { data, error } = await supabase.auth.signUp({ email, password });
        
        if (error && !error.message.includes('already registered')) {
          console.error(`Supabase API Error creating ${email}:`, error.message);
        } else if (!data) {
          console.warn(`Signup for ${email} returned no data. Check for silent security policies or email provider issues.`);
        } else {
          console.log(`Successfully created or found user: ${email}`);
        }
      } catch (err) {
        console.error(`Failed to create ${email}:`, err);
      }
    }
  }  
}