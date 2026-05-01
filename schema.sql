-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles Table
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  full_name TEXT,
  phone_number TEXT UNIQUE,
  email TEXT UNIQUE,
  role TEXT CHECK (role IN ('user', 'driver')) NOT NULL,
  avatar_url TEXT,
  current_purok TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Locations Table (For Active Drivers)
CREATE TABLE locations (
  driver_id UUID REFERENCES profiles(id) PRIMARY KEY,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Rides Table
CREATE TABLE rides (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  driver_id UUID REFERENCES profiles(id),
  pickup_location TEXT NOT NULL,
  destination TEXT NOT NULL,
  fare_estimate NUMERIC NOT NULL,
  status TEXT CHECK (status IN ('pending', 'accepted', 'ongoing', 'completed')) DEFAULT 'pending' NOT NULL,
  vehicle_type TEXT CHECK (vehicle_type IN ('Tricycle', 'E-Trike', 'Car')) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE rides ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Users can view their own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Locations Policies
CREATE POLICY "Anyone can view driver locations" ON locations FOR SELECT USING (true);
CREATE POLICY "Drivers can update their own location" ON locations FOR ALL USING (auth.uid() = driver_id);

-- Rides Policies
CREATE POLICY "Users can view their own rides" ON rides FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Drivers can view pending rides and their assigned rides" ON rides FOR SELECT USING (status = 'pending' OR auth.uid() = driver_id);
CREATE POLICY "Users can insert rides" ON rides FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own rides" ON rides FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Drivers can update their assigned rides" ON rides FOR UPDATE USING (auth.uid() = driver_id OR status = 'pending');

-- Create a trigger to automatically create a profile after signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone_number, email, role)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.phone,
    new.email,
    COALESCE(new.raw_user_meta_data->>'role', 'user')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
