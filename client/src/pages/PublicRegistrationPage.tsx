import { useState } from 'react';
import { useParams } from 'react-router-dom';

import { api } from '../api/api';
import { useClinic } from '../hooks/useClinics';

import OwnerForm from '../components/OwnerForm';
import AnimalForm from '../components/AnimalForm';

import Button from 'react-bootstrap/Button';
import Alert from 'react-bootstrap/Alert';

import type { OwnerDraft, AnimalDraft } from '../types/intake';

// ----------------------
// EMPTY OWNER
// ----------------------
const EMPTY_OWNER: OwnerDraft = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  county: '',
  state: 'NC',
  zip_code: ''
};

// ----------------------
// EMPTY ANIMAL
// ----------------------
const EMPTY_ANIMAL: AnimalDraft = {
  name: '',
  species: '',
  sex: '',

  altered_status: null,

  primary_breed: '',
  secondary_breed: '',

  age_years: null,
  age_months: null,

  primary_color: '',
  secondary_color: '',

  pattern: '',

  rabies_tag_number: '',
  microchip_number: ''
};

export default function PublicRegistrationPage() {
  const { id } = useParams();

  const { clinic, loading } = useClinic(id);

  document.title = 'Pre-Registration';

  const [owner, setOwner] =
    useState<OwnerDraft>(EMPTY_OWNER);

  const [animals, setAnimals] = useState<
    AnimalDraft[]
  >([{ ...EMPTY_ANIMAL }]);

  const [submitting, setSubmitting] =
    useState(false);

  const [submitted, setSubmitted] =
    useState(false);

  const [error, setError] = useState('');

  const [noEmail, setNoEmail] = useState(false);

  // ----------------------
  // ADD ANIMAL
  // ----------------------
  const addAnimal = () => {
    setAnimals(prev => [
      ...prev,
      { ...EMPTY_ANIMAL }
    ]);
  };

  // ----------------------
  // CLONE LAST ANIMAL
  // ----------------------
  const cloneLastAnimal = () => {
    setAnimals(prev => {
      if (prev.length === 0) {
        return [{ ...EMPTY_ANIMAL }];
      }

      const lastAnimal =
        prev[prev.length - 1];

      const cloned: AnimalDraft = {
        ...lastAnimal,
        name: ''
      };

      return [...prev, cloned];
    });
  };

  // ----------------------
  // REMOVE ANIMAL
  // ----------------------
  const removeAnimal = (
    indexToRemove: number
  ) => {
    setAnimals(prev => {
      if (prev.length === 1) {
        return prev;
      }

      return prev.filter(
        (_, i) => i !== indexToRemove
      );
    });
  };

  // ----------------------
  // UPDATE ANIMAL
  // ----------------------
  const updateAnimal = (
    index: number,
    field: keyof AnimalDraft,
    value: any
  ) => {
    setAnimals(prev => {
      const updated = [...prev];

      updated[index] = {
        ...updated[index],
        [field]: value
      };

      return updated;
    });
  };

  // ----------------------
  // VALIDATION
  // ----------------------
  const isOwnerValid = () => {
    return (
      owner.first_name.trim() !== '' &&
      owner.last_name.trim() !== '' &&
      owner.phone.trim() !== '' &&
      owner.address?.trim() !== '' &&
      owner.city?.trim() !== '' &&
      owner.county?.trim() !== '' &&
      owner.state?.trim() !== '' &&
      owner.zip_code?.trim().length === 5
    );
  };

  const isAnimalValid = (
    animal: AnimalDraft
  ) => {
    const hasAge =
      animal.age_years !== null ||
      animal.age_months !== null;

    return (
      animal.name.trim() !== '' &&
      animal.species.trim() !== '' &&
      animal.sex.trim() !== '' &&
      animal.primary_breed?.trim() !== '' &&
      animal.primary_color?.trim() !== '' &&
      hasAge
    );
  };

  const canSubmit =
    isOwnerValid() &&
    animals.length > 0 &&
    animals.every(isAnimalValid);

  // ----------------------
  // SUBMIT
  // ----------------------
  const submit = async () => {
    if (!canSubmit) {
      setError(
        'Please complete all required fields before submitting.'
      );
      return;
    }

    setError('');
    setSubmitting(true);

    try {
      await api.post('/intake', {
        owner,
        owner_id: null,
        animals,
        clinic_id: id
      });

      setSubmitted(true);

    } catch (err) {
      console.error(err);

      setError(
        'Unable to submit registration. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ----------------------
  // SUBMIT MORE
  // ----------------------
  const submitMore = () => {
    setOwner({ ...EMPTY_OWNER });
    setAnimals([{ ...EMPTY_ANIMAL }]);
    setError('');
    setSubmitted(false);

    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  if (loading || !clinic) {
    return <p>Loading clinic...</p>;
  }

  // ----------------------
  // SUCCESS PAGE
  // ----------------------
  if (submitted) {
    const formatClinicDateTime = (
      date: string,
      start: string,
      end: string | null
    ) => {
      const d = new Date(`${date}T00:00:00`);

      const weekday =
        d.toLocaleDateString('en-US', {
          weekday: 'long'
        });

      const month =
        d.toLocaleDateString('en-US', {
          month: 'long'
        });

      const day = d.getDate();
      const year = d.getFullYear();

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

      const formatTime = (t: string) => {
        if (!t) return '';

        const [h, m] = t.split(':');

        let hour = parseInt(h, 10);

        const ampm =
          hour >= 12 ? 'PM' : 'AM';

        hour = hour % 12 || 12;

        return `${hour}:${m} ${ampm}`;
      };

      return `${weekday}, ${month} ${day}${suffix(day)}, ${year} • ${formatTime(
        start
      )} - ${formatTime(end || '')}`;
    };

    return (
      <div
        style={{
          maxWidth: 800,
          margin: '0 auto'
        }}
      >
        <h2 className="mb-4">
          Thank You For Pre-Registering for the{' '}
          {clinic.name}!
        </h2>

        <p>
          We appreciate your help keeping your pets
          safe and healthy.
        </p>

        <p>
          Please note that pre-registering does not
          guarantee you a spot and that we provide
          service on a first-come, first-served basis
          while supplies last.
        </p>

        <p>
          If you have any questions, please contact
          the shelter at{' '}
          <a href="tel:+13365971741">
            (336) 597-1741
          </a>.
        </p>

        <p className="text-muted">
          (You do not need to call to confirm your
          registration.)
        </p>

        <hr className="my-4" />

        <h4 className="mb-3">
          Clinic Information
        </h4>

        <div className="mb-3">
          <strong>Location:</strong>
          <br />
          {clinic.location_name}
        </div>

        <div className="mb-3">
          <strong>Address:</strong>
          <br />
          {clinic.address}
          <br />
          {clinic.city}, {clinic.state}{' '}
          {clinic.zip_code}
        </div>

        <div className="mb-4">
          <strong>Date & Time:</strong>
          <br />
          {formatClinicDateTime(
            clinic.clinic_date,
            clinic.start_time,
            clinic.end_time
          )}
        </div>

        <div className="d-flex gap-3 flex-wrap">
          <Button
            variant="primary"
            onClick={submitMore}
          >
            Submit More Animals
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        maxWidth: 900,
        margin: '0 auto'
      }}
    >
      <h2 className="mb-4">
        {clinic.name} Pre-Registration
      </h2>

      {error && (
        <Alert
          variant="danger"
          className="mb-4"
        >
          {error}
        </Alert>
      )}

      {/* OWNER */}
      <h4 className="mb-4">
        Owner Information
      </h4>

      <OwnerForm
        owner={owner}
        setOwner={setOwner}
        noEmail={noEmail}
        setNoEmail={setNoEmail}
      />

      <hr className="my-4" />

      {/* ANIMALS */}
      <h4 className="mb-4">Animals</h4>

      {animals.map((animal, i) => (
        <AnimalForm
          key={i}
          mode="multi"
          index={i}
          animal={animal}
          showClinicFields={false}
          removeAnimal={removeAnimal}
          updateAnimal={(field, value) =>
            updateAnimal(i, field, value)
          }
        />
      ))}

      {/* ACTIONS */}
      <div className="d-flex gap-3 mt-4">
        <Button
          onClick={addAnimal}
          variant="secondary"
        >
          + Add Another Animal
        </Button>

        <Button
          onClick={cloneLastAnimal}
          variant="outline-secondary"
        >
          + Clone Animal
        </Button>

        <Button
          onClick={submit}
          variant="primary"
          disabled={submitting || !canSubmit}
        >
          {submitting
            ? 'Submitting...'
            : 'Submit Pre-Registration'}
        </Button>
      </div>
    </div>
  );
}