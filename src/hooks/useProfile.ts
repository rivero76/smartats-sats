import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

interface Profile {
  id?: string;
  user_id: string;
  full_name?: string;
  email?: string;
  phone?: string;
  location?: string;
  professional_summary?: string;
  linkedin_url?: string;
  portfolio_url?: string;
}

export interface ProfileFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  location: string;
  professional_summary: string;
  linkedin_url: string;
  portfolio_url: string;
}

export const useProfile = () => {
  const { user, satsUser } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Fetch profile data
  const fetchProfile = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Try to get existing profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Error fetching profile:', profileError);
        throw profileError;
      }

      // If no profile exists, create one with basic info
      if (!profileData) {
        const newProfile: Omit<Profile, 'id'> = {
          user_id: user.id,
          email: user.email || '',
          full_name: satsUser?.name || user.user_metadata?.name || user.user_metadata?.full_name || '',
        };

        const { data: createdProfile, error: createError } = await supabase
          .from('profiles')
          .insert(newProfile)
          .select()
          .single();

        if (createError) {
          console.error('Error creating profile:', createError);
          throw createError;
        }

        setProfile(createdProfile);
      } else {
        setProfile(profileData);
      }
    } catch (error) {
      console.error('Error in fetchProfile:', error);
      toast({
        variant: "destructive",
        title: "Error loading profile",
        description: "Could not load your profile information."
      });
    } finally {
      setLoading(false);
    }
  };

  // Convert profile to form data
  const getFormData = (): ProfileFormData => {
    // Parse full name into first and last name
    const fullName = profile?.full_name || satsUser?.name || user?.user_metadata?.name || user?.user_metadata?.full_name || '';
    const nameParts = fullName.trim().split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    return {
      firstName,
      lastName,
      email: profile?.email || user?.email || '',
      phone: profile?.phone || '',
      location: profile?.location || '',
      professional_summary: profile?.professional_summary || '',
      linkedin_url: profile?.linkedin_url || '',
      portfolio_url: profile?.portfolio_url || '',
    };
  };

  // Save profile data
  const saveProfile = async (formData: ProfileFormData) => {
    if (!user) return false;

    try {
      setSaving(true);

      const updatedProfile: Partial<Profile> = {
        full_name: `${formData.firstName} ${formData.lastName}`.trim(),
        email: formData.email,
        phone: formData.phone || null,
        location: formData.location || null,
        professional_summary: formData.professional_summary || null,
        linkedin_url: formData.linkedin_url || null,
        portfolio_url: formData.portfolio_url || null,
      };

      const { data, error } = await supabase
        .from('profiles')
        .update(updatedProfile)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating profile:', error);
        throw error;
      }

      setProfile(data);
      
      toast({
        title: "Profile updated",
        description: "Your profile has been successfully updated."
      });

      return true;
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({
        variant: "destructive",
        title: "Error saving profile",
        description: "Could not save your profile changes."
      });
      return false;
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user, satsUser]);

  return {
    profile,
    loading,
    saving,
    getFormData,
    saveProfile,
    refetch: fetchProfile,
  };
};