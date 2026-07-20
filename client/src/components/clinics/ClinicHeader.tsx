import type { Clinic } from '../../types/intake';
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

    const d = new Date(`${date}T00:00:00`);

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
    <div className="mb-4">

      {/* HEADER ROW */}
      <div className="d-flex flex-column flex-lg-row justify-content-between align-items-start">

        {/* NON-CLICKABLE CONTAINER */}
        <div style={{ flex: 1 }}>
          
          {/* ONLY THE TITLE IS A LINK */}
          <Link 
            to={linkTo} 
            className="text-decoration-none text-dark hover-opacity"
            style={{ display: 'inline-block' }}
          >
            <h2 className="mb-1">{clinic.name}</h2>
          </Link>

          <p className="text-muted mb-1">
            {clinic.location_name}
          </p>

          <p className="text-muted mb-1 small">
            {clinic.address}, {clinic.city}, {clinic.state}{' '}
            {clinic.zip_code}
          </p>

          <p className="text-muted mb-0 small">
            {formatClinicDateTime(
              clinic.clinic_date,
              clinic.start_time,
              clinic.end_time
            )}
          </p>

          {title && (
            <h3 className="mt-3 mb-0">
              {title}
            </h3>
          )}
        </div>

        {/* DESKTOP BUTTONS */}
        <div className="ms-lg-3 d-none d-lg-block">
          {rightSlot}
        </div>

      </div>

      {/* MOBILE/TABLET BUTTONS */}
      <div className="mt-3 d-lg-none">
        {rightSlot}
      </div>

    </div>
  );
}