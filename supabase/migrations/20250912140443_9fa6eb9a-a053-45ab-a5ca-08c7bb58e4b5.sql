-- Allow authenticated users to insert new companies
CREATE POLICY "Authenticated users can insert companies" 
ON public.sats_companies 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Allow authenticated users to insert new locations
CREATE POLICY "Authenticated users can insert locations" 
ON public.sats_locations 
FOR INSERT 
TO authenticated 
WITH CHECK (true);