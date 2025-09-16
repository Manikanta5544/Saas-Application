import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase URL and/or Anon Key not found. Please check your .env file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function createTestUsers() {
  if (process.env.NODE_ENV === 'production') {
    console.warn('Test user creation script should not be run in production.');
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
        console.error(`Error creating ${email}:`, error.message);
      } else if (!data) {
        console.warn(`Signup for ${email} returned no data.`);
      } else {
        console.log(`Successfully created or found user: ${email}`);
      }
    } catch (err) {
      console.error(`Failed to create ${email}:`, err);
    }
  }
}

createTestUsers().then(() => {
  console.log('Test user creation script finished.');
  process.exit();
}).catch((err) => {
  console.error('An unexpected error occurred:', err);
  process.exit(1);
});