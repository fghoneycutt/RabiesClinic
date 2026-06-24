import { useEffect, useState } from 'react';
import { api } from '../api/api';
import { useNavigate } from 'react-router-dom';

import Tab from 'react-bootstrap/Tab';
import Tabs from 'react-bootstrap/Tabs';
import Card from 'react-bootstrap/Card';
import Button from 'react-bootstrap/Button';

type Clinic = {
  id: string;
  name: string;
  location_name: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;

  clinic_date: string;
  start_time: string;
  end_time: string;
};

// ------------------------------------
// Parse YYYY-MM-DD or ISO timestamps
// without timezone shifting
// ------------------------------------
const parseClinicDate = (dateString: string) => {
  if (!dateString) {
    return null;
  }

  const datePart = dateString.substring(0, 10);

  const parts = datePart.split('-');

  if (parts.length !== 3) {
    return null;
  }

  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);

  return new Date(year, month - 1, day);
};

export default function Home() {
  const navigate = useNavigate();

  document.title = 'Home';

  const [upcoming, setUpcoming] = useState<Clinic[]>([]);
  const [past, setPast] = useState<Clinic[]>([]);

  useEffect(() => {
    const fetchClinics = async () => {
      try {
        const res = await api.get('/clinics');

        const now = new Date();

        const today = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate()
        );

        const upcomingClinics = res.data.filter((c: Clinic) => {
          const clinicDate = parseClinicDate(c.clinic_date);

          if (!clinicDate) {
            return false;
          }

          return clinicDate >= today;
        });

        const pastClinics = res.data.filter((c: Clinic) => {
          const clinicDate = parseClinicDate(c.clinic_date);

          if (!clinicDate) {
            return false;
          }

          return clinicDate < today;
        });

        setUpcoming(upcomingClinics);
        setPast(pastClinics);
      } catch (err) {
        console.error(err);
      }
    };

    fetchClinics();
  }, []);

  const formatDateTime = (
    date: string,
    start: string,
    end: string
  ) => {
    const d = parseClinicDate(date);

    if (!d) {
      return 'Invalid Date';
    }

    const weekday = d.toLocaleDateString('en-US', {
      weekday: 'long'
    });

    const month = d.toLocaleDateString('en-US', {
      month: 'long'
    });

    const day = d.getDate();

    const year = d.getFullYear();

    const getOrdinal = (n: number) => {
      if (n > 3 && n < 21) {
        return 'th';
      }

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

    const formatTime = (time: string) => {
      const [hourStr, minute] = time.split(':');

      let hour = parseInt(hourStr, 10);

      const ampm = hour >= 12 ? 'pm' : 'am';

      hour %= 12;

      if (hour === 0) {
        hour = 12;
      }

      return `${hour}:${minute}${ampm}`;
    };

    return `${weekday}, ${month} ${day}${getOrdinal(
      day
    )}, ${year} • ${formatTime(start)} - ${formatTime(end)}`;
  };

  const ClinicCard = ({
    clinic,
  }: {
    clinic: Clinic;
  }) => {
    return (
      <Card className="mb-3">
        <Card.Body>
          <h5
            style={{ cursor: 'pointer', color: '#0d6efd' }}
            onClick={() => navigate(`/clinics/${clinic.id}`)}
          >
            {clinic.name}
          </h5>

          <p className="mb-1">
            <strong>Location:</strong> {clinic.location_name}
          </p>

          <p className="mb-1">
            {clinic.address}, {clinic.city}, {clinic.state}{' '}
            {clinic.zip_code}
          </p>

          <p className="mb-3">
            {formatDateTime(
              clinic.clinic_date,
              clinic.start_time,
              clinic.end_time
            )}
          </p>
        </Card.Body>
      </Card>
    );
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="mb-0">Clinics</h2>

        <Button
          variant="primary"
          onClick={() => navigate('/clinics/new')}
        >
          + Create Clinic
        </Button>
      </div>

      <Tabs
        defaultActiveKey="upcoming"
        className="mb-3"
      >
        <Tab
          eventKey="upcoming"
          title="Upcoming Clinics"
        >
          {upcoming.length === 0 ? (
            <p>No upcoming clinics.</p>
          ) : (
            upcoming.map((clinic) => (
              <ClinicCard
                key={clinic.id}
                clinic={clinic}
              />
            ))
          )}
        </Tab>

        <Tab
          eventKey="past"
          title="Past Clinics"
        >
          {past.length === 0 ? (
            <p>No past clinics.</p>
          ) : (
            past.map((clinic) => (
              <ClinicCard
                key={clinic.id}
                clinic={clinic}
              />
            ))
          )}
        </Tab>
      </Tabs>
    </div>
  );
}