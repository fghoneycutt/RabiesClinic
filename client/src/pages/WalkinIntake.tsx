import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { api } from '../api/api';
import { useClinic } from '../hooks/useClinics';

import ClinicHeader from '../components/ClinicHeader';
import OwnerForm from '../components/OwnerForm';
import AnimalForm from '../components/AnimalForm';

import Button from 'react-bootstrap/Button';

import type { OwnerDraft, AnimalDraft } from '../types/intake';

// ----------------------
// EMPTY OWNER (FORM STATE)
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
// EMPTY ANIMAL (FORM STATE)
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

export default function WalkinIntake() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();

  const mode = searchParams.get('mode') || 'public';
  const isStaffMode = mode === 'staff';

  const { clinic, loading } = useClinic(id);
  document.title="Walk-In Intake"

  // ----------------------
  // OWNER STATE
  // ----------------------
  const [owner, setOwner] = useState<OwnerDraft>(EMPTY_OWNER);

  // ----------------------
  // ANIMALS STATE
  // ----------------------
  const [animals, setAnimals] = useState<AnimalDraft[]>([
    { ...EMPTY_ANIMAL }
  ]);

  // ----------------------
  // ADD ANIMAL
  // ----------------------
  const addAnimal = () => {
    setAnimals(prev => [...prev, { ...EMPTY_ANIMAL }]);
  };

  // ----------------------
  // CLONE LAST ANIMAL
  // ----------------------
  const cloneLastAnimal = () => {
    setAnimals(prev => {
      if (prev.length === 0) return [{ ...EMPTY_ANIMAL }];

      const lastAnimal = prev[prev.length - 1];

      const cloned: AnimalDraft = {
        ...lastAnimal,
        name: '' // explicitly reset name only
      };

      return [...prev, cloned];
    });
  };

  // ----------------------
  // REMOVE ANIMAL
  // ----------------------
  const removeAnimal = (indexToRemove: number) => {
    setAnimals(prev => {
      if (prev.length === 1) return prev;
      return prev.filter((_, i) => i !== indexToRemove);
    });
  };

  // ----------------------
  // UPDATE ANIMAL FIELD
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
  // SUBMIT
  // ----------------------
  const submit = async () => {
    try {
      const res = await api.post('/intake', {
        owner,
        owner_id: null,
        animals,
        clinic_id: id
      });

      setOwner({ ...EMPTY_OWNER });
      setAnimals([{ ...EMPTY_ANIMAL }]);

      if (isStaffMode) {
        const ownerId = res.data.owner_id;
        navigate(`/clinics/${id}/owners/${ownerId}`);
      } else {
        navigate(`/clinics/${id}/pre-registration-complete`);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to submit intake');
    }
  };

  if (loading || !clinic) {
    return <p>Loading clinic...</p>;
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>

      <ClinicHeader
        clinic={clinic}
        title={isStaffMode ? 'Walk-In Intake' : 'Pre-Registration'}
      />

      {!isStaffMode && (
        <p className="text-muted mb-4">
          Please complete the form below before arriving at the clinic.
        </p>
      )}

      {/* OWNER */}
      <h4 className="mb-4">Owner Information</h4>

      <OwnerForm
        owner={owner}
        setOwner={setOwner}
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
          showClinicFields={isStaffMode}
          removeAnimal={removeAnimal}

          // IMPORTANT FIX: correct closure binding
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
        >
          {isStaffMode
            ? 'Submit Intake'
            : 'Submit Pre-Registration'}
        </Button>

      </div>

    </div>
  );
}