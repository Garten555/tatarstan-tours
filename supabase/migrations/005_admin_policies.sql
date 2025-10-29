-- Migration 005: Admin policies for user management
-- Date: 2025-10-28

-- Policy: super_admin can update any profile (including roles)
DROP POLICY IF EXISTS "Super admin can manage all profiles" ON profiles;
CREATE POLICY "Super admin can manage all profiles"
  ON profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'super_admin'
    )
  );

-- Policy: service_role can do everything with profiles (for server-side operations)
DROP POLICY IF EXISTS "service_role can manage profiles" ON profiles;
CREATE POLICY "service_role can manage profiles"
  ON profiles FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

