/*
  # Create profiles and business interests tables

  1. New Tables
    - `profiles`
      - `id` (uuid, primary key, references auth.users)
      - `full_name` (text)
      - `avatar_url` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `business_interests`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `business_type` (text)
      - `investment_amount` (numeric)
      - `expected_roi` (numeric)
      - `location_preference` (text)
      - `experience` (text)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  full_name text,
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create business interests table
CREATE TABLE IF NOT EXISTS business_interests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles ON DELETE CASCADE,
  business_type text NOT NULL,
  investment_amount numeric NOT NULL,
  expected_roi numeric NOT NULL,
  location_preference text,
  experience text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_interests ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Users can view their own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Create policies for business interests
CREATE POLICY "Users can view all business interests"
  ON business_interests
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create their own business interests"
  ON business_interests
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own business interests"
  ON business_interests
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own business interests"
  ON business_interests
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);