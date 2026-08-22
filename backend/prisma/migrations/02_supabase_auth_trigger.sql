-- Supabase Auth User Sync Trigger
-- Automatically syncs new users created in Supabase auth.users to public.users table

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (
    id,
    name,
    email,
    roll_number,
    department,
    role,
    password_hash,
    account_status,
    created_at
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    NEW.raw_user_meta_data->>'roll_number',
    NEW.raw_user_meta_data->>'department',
    COALESCE((NEW.raw_user_meta_data->>'role')::public."Role", 'student'::public."Role"),
    'SUPABASE_MANAGED_AUTH',
    COALESCE((NEW.raw_user_meta_data->>'account_status')::public."AccountStatus", 'pending_review'::public."AccountStatus"),
    NEW.created_at
  )
  ON CONFLICT (email) DO UPDATE SET
    name = EXCLUDED.name,
    roll_number = EXCLUDED.roll_number,
    department = EXCLUDED.department,
    role = EXCLUDED.role,
    account_status = EXCLUDED.account_status;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger execution on new Supabase Auth user registration
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();
