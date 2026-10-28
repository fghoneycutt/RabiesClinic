
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/api';

type ClinicRouteTarget = {
  id: string;
  clinic_date: string;
  start_time?: string | null;
};

function getEasternToday(): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());

  const values = Object.fromEntries(
    parts.map(({ type, value }) => [type, value])
  );

  return `${values.year}-${values.month}-${values.day}`;
}

function dateOnly(value: string): string {
  return value.slice(0, 10);
}

function timeOnly(value?: string | null): string {
  return value?.slice(0, 5) ?? '';
}

function compareStartTime(
  a: ClinicRouteTarget,
  b: ClinicRouteTarget
): number {
  return timeOnly(a.start_time).localeCompare(
    timeOnly(b.start_time)
  );
}

export default function NextClinicRegistrationPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  document.title = 'Pre-Register';

  useEffect(() => {
    let cancelled = false;

    async function selectClinic() {
      try {
        const response = await api.get<ClinicRouteTarget[]>(
          '/clinics'
        );

        if (cancelled) return;

        const clinics = response.data;
        const today = getEasternToday();

        // Prefer a clinic scheduled for today.
        // Do not use end_time: registration stays open all day.
        const todaysClinics = clinics
          .filter(c => dateOnly(c.clinic_date) === today)
          .sort(compareStartTime);

        if (todaysClinics.length > 0) {
          navigate(
            `/clinics/${todaysClinics[0].id}/register`,
            { replace: true }
          );
          return;
        }

        // Otherwise choose the earliest upcoming clinic.
        const upcomingClinics = clinics
          .filter(c => dateOnly(c.clinic_date) > today)
          .sort((a, b) =>
            dateOnly(a.clinic_date).localeCompare(
              dateOnly(b.clinic_date)
            ) || compareStartTime(a, b)
          );

        if (upcomingClinics.length > 0) {
          navigate(
            `/clinics/${upcomingClinics[0].id}/register`,
            { replace: true }
          );
          return;
        }

        // No future clinics: use the most recent clinic.
        // Its existing page will display the post-event message.
        const mostRecentClinic = [...clinics]
          .sort((a, b) =>
            dateOnly(b.clinic_date).localeCompare(
              dateOnly(a.clinic_date)
            ) || compareStartTime(b, a)
          )[0];

        if (mostRecentClinic) {
          navigate(
            `/clinics/${mostRecentClinic.id}/register`,
            { replace: true }
          );
          return;
        }

        setError(
          'No clinics are available for registration at this time.'
        );
      } catch (err) {
        console.error(err);

        if (!cancelled) {
          setError(
            'Unable to find the next clinic. Please try again later.'
          );
        }
      }
    }

    selectClinic();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <main
      style={{
        maxWidth: 600,
        margin: '80px auto',
        padding: 24,
        textAlign: 'center',
      }}
    >
      {error ? (
        <>
          <h2>Registration Unavailable</h2>
          <p>{error}</p>
        </>
      ) : (
        <>
          <h2>Finding Your Clinic</h2>
          <p>Please wait while we direct you to registration.</p>
        </>
      )}
    </main>
  );
}
