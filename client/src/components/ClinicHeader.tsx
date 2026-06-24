import type { Clinic } from '../types/intake';
import { Link } from 'react-router-dom';

type Props = {
  clinic: Clinic;
  rightSlot?: React.ReactNode;
  title?: string;
  clinicUrl?: string;
};

export default function ClinicHeader({
  clinic,
  rightSlot,
  title,
  clinicUrl,
}: Props) {
  const formatClinicDateTime = (
    date: string,
    start: string,
    end: string | null
  ) => {
    if (!date) return '';

    // FIX: prevent UTC date shift
    const d = new Date(`${date}T00:00:00`);

    // ✅ added weekday
    const weekday = d.toLocaleDateString('en-US', { weekday: 'long' });
    const month = d.toLocaleDateString('en-US', { month: 'long' });
    const year = d.getFullYear();
    const day = d.getDate();

    const suffix = (n: number) => {
      if (n > 3 && n < 21) return 'th';
      switch (n % 10) {
        case 1:
          return 'st';
        case 2:
          return 'nd';
        case 3:
          return 'rd';
        default:
          return 'th';
      }
    };

    // ✅ updated format includes weekday
    const formattedDate = `${weekday}, ${month} ${day}${suffix(day)}, ${year}`;

    const formatTime = (t: string) => {
      if (!t) return '';
      const [h, m] = t.split(':');
      let hour = parseInt(h, 10);
      const ampm = hour >= 12 ? 'pm' : 'am';
      hour = hour % 12 || 12;
      return `${hour}:${m}${ampm}`;
    };

    return `${formattedDate} • ${formatTime(start)} - ${formatTime(end || '')}`;
  };

  const linkTo = clinicUrl || `/clinics/${clinic.id}`;

  return (
    <div className="d-flex justify-content-between align-items-start mb-4">

      {/* CLICKABLE LEFT SIDE */}
      <Link
        to={linkTo}
        style={{
          textDecoration: 'none',
          color: 'inherit',
          flex: 1
        }}
      >
        <div>
          <h2 className="mb-1">{clinic.name}</h2>

          <p className="text-muted mb-1">
            {clinic.location_name} • {clinic.city}, {clinic.state}
          </p>

          <p className="text-muted mb-1 small">
            {clinic.address}, {clinic.city}, {clinic.state} {clinic.zip_code}
          </p>

          <p className="text-muted mb-0 small">
            {formatClinicDateTime(
              clinic.clinic_date,
              clinic.start_time,
              clinic.end_time
            )}
          </p>

          {title && (
            <h3 className="mt-3 mb-0">{title}</h3>
          )}
        </div>
      </Link>

      {/* RIGHT SLOT */}
      <div className="ms-3">
        {rightSlot}
      </div>
    </div>
  );
}