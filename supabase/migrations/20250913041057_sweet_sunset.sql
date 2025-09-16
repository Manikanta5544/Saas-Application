-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create tenants table
CREATE TABLE IF NOT EXISTS tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  subscription_plan text NOT NULL DEFAULT 'free' CHECK (subscription_plan IN ('free', 'pro')),
  note_limit integer NOT NULL DEFAULT 3,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create user profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create notes table
CREATE TABLE IF NOT EXISTS notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_tenant_id ON user_profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_notes_tenant_id ON notes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_notes_user_id ON notes(user_id);
CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug);

-- RLS Policies for tenants table
CREATE POLICY "Users can view their own tenant"
  ON tenants
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT tenant_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can update their tenant"
  ON tenants
  FOR UPDATE
  TO authenticated
  USING (
    id IN (
      SELECT tenant_id FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for user_profiles table
CREATE POLICY "Users can view profiles in their tenant"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can view their own profile"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users can update their own profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid());

-- RLS Policies for notes table
CREATE POLICY "Users can view notes in their tenant"
  ON notes
  FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can create notes in their tenant"
  ON notes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE id = auth.uid()
    )
    AND user_id = auth.uid()
  );

CREATE POLICY "Users can update their own notes"
  ON notes
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own notes"
  ON notes
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Insert test tenants
INSERT INTO tenants (name, slug, subscription_plan, note_limit) VALUES
  ('Acme Corp', 'acme', 'free', 3),
  ('Globex Corporation', 'globex', 'free', 3)
ON CONFLICT (slug) DO NOTHING;

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  tenant_id_val uuid;
  user_role text;
BEGIN
  IF NEW.email LIKE '%@acme.test' THEN
    SELECT id INTO tenant_id_val FROM tenants WHERE slug = 'acme';
    IF NEW.email LIKE 'admin@%' THEN
      user_role := 'admin';
    ELSE
      user_role := 'member';
    END IF;
  ELSIF NEW.email LIKE '%@globex.test' THEN
    SELECT id INTO tenant_id_val FROM tenants WHERE slug = 'globex';
    IF NEW.email LIKE 'admin@%' THEN
      user_role := 'admin';
    ELSE
      user_role := 'member';
    END IF;
  ELSE
    SELECT id INTO tenant_id_val FROM tenants ORDER BY created_at LIMIT 1;
    user_role := 'member';
  END IF;

  -- Insert user profile
  INSERT INTO user_profiles (id, tenant_id, email, role)
  VALUES (NEW.id, tenant_id_val, NEW.email, user_role);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registration
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

CREATE OR REPLACE FUNCTION check_note_limit()
RETURNS TRIGGER AS $$
DECLARE
  current_count integer;
  tenant_limit integer;
  user_tenant_id uuid;
BEGIN
  SELECT tenant_id INTO user_tenant_id 
  FROM user_profiles 
  WHERE id = NEW.user_id;
  
  SELECT COUNT(*), t.note_limit 
  INTO current_count, tenant_limit
  FROM notes n
  JOIN tenants t ON t.id = user_tenant_id
  WHERE n.tenant_id = user_tenant_id
  GROUP BY t.note_limit;
 
  IF current_count IS NULL THEN
    current_count := 0;
    SELECT note_limit INTO tenant_limit FROM tenants WHERE id = user_tenant_id;
  END IF;

  -- Enforce limit for 'free' plan
  IF (SELECT subscription_plan FROM tenants WHERE id = user_tenant_id) = 'free' 
     AND current_count >= tenant_limit THEN
    RAISE EXCEPTION 'Note limit exceeded. Upgrade to Pro plan for unlimited notes.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to enforce note limits
DROP TRIGGER IF EXISTS enforce_note_limit ON notes;
CREATE TRIGGER enforce_note_limit
  BEFORE INSERT ON notes
  FOR EACH ROW EXECUTE FUNCTION check_note_limit();