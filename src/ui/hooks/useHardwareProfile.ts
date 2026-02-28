import { useState, useEffect } from 'react';
import type { SystemProfile } from '../../types';
import { profileSystem } from '../../engine';

export function useHardwareProfile() {
  const [profile, setProfile] = useState<SystemProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    profileSystem()
      .then((p) => {
        if (!cancelled) setProfile(p);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { profile, loading, error };
}
