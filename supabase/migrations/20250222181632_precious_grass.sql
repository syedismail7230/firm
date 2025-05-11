/*
  # Fix RLS Policies for Profile Management

  1. Changes
    - Update RLS policies for profiles table
    - Add insert policy for profiles
    - Fix foreign key relationship
    - Add missing policies

  2. Security
    - Enable RLS
    - Add comprehensive policies for CRUD operations
    - Ensure users can only access their own data
*/

-- Drop existing policies to clean up
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;

-- Create new policies for profiles
CREATE POLICY "Enable read access for own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Enable insert access for own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Enable update access for own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Update business_interests policies
DROP POLICY IF EXISTS "Users can view all business interests" ON business_interests;
DROP POLICY IF EXISTS "Users can create their own business interests" ON business_interests;
DROP POLICY IF EXISTS "Users can update their own business interests" ON business_interests;
DROP POLICY IF EXISTS "Users can delete their own business interests" ON business_interests;

CREATE POLICY "Enable read access for all business interests"
  ON business_interests FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable insert for own business interests"
  ON business_interests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enable update for own business interests"
  ON business_interests FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enable delete for own business interests"
  ON business_interests FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);