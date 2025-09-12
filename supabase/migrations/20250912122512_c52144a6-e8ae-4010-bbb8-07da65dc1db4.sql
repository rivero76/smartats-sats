-- Create SATS_users_public table for user metadata
CREATE TABLE public.sats_users_public (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  auth_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Ensure role can only be 'user' or 'admin'
  CONSTRAINT valid_role CHECK (role IN ('user', 'admin')),
  -- Ensure one record per auth user
  CONSTRAINT unique_auth_user UNIQUE (auth_user_id)
);

-- Enable Row Level Security
ALTER TABLE public.sats_users_public ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for SATS_users_public
CREATE POLICY "Users can view their own record" 
ON public.sats_users_public 
FOR SELECT 
USING (auth.uid() = auth_user_id);

CREATE POLICY "Users can update their own record" 
ON public.sats_users_public 
FOR UPDATE 
USING (auth.uid() = auth_user_id);

-- Admins can view all records (using existing has_role function)
CREATE POLICY "Admins can view all users" 
ON public.sats_users_public 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'));

-- Create or replace function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_sats_user_signup()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.sats_users_public (
    auth_user_id,
    name,
    role
  ) VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'name',
      NEW.raw_user_meta_data->>'full_name', 
      split_part(NEW.email, '@', 1)
    ),
    'user'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to automatically create SATS user record on signup
CREATE OR REPLACE TRIGGER on_sats_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_sats_user_signup();

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_sats_users_public_updated_at
  BEFORE UPDATE ON public.sats_users_public
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();