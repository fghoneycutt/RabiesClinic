import { useEffect, useState } from 'react';

import { api } from '../api/api';

import type {
  Clinic
} from '../types/intake';

export type ClinicWithStats = Clinic & {
  registered_owners: number;
  registered_animals: number;
};

export function useClinic(id?: string) {

  const [clinic, setClinic] =
    useState<ClinicWithStats | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {

    if (!id) return;

    const fetchClinic = async () => {

      try {

        setLoading(true);

        setError(null);

        const res = await api.get(
          `/clinics/${id}`
        );

        // The backend response is already structured perfectly.
        // We pass res.data directly to preserve the database layout.
        setClinic(res.data);

      } catch (err: any) {

        console.error(err);

        setError(
          err?.response?.data?.error ||
          'Failed to load clinic'
        );

      } finally {

        setLoading(false);

      }
    };

    fetchClinic();

  }, [id]);

  return {
    clinic,
    loading,
    error
  };
}