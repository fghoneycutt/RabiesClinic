import { useState, useEffect } from 'react';
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';

import { api } from '../../api/api';
import type { Animal } from '../../types/intake';

import AnimalForm from './AnimalForm';

type Props = {
  show: boolean;
  onHide: () => void;
  ownerId: string;
  clinicId: string;
  onAnimalCreated: (animal: Animal) => void;
};

// ----------------------
// EMPTY ANIMAL SCHEMA
// ----------------------
const EMPTY_ANIMAL: Omit<Animal, 'id'> = {
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
  rabies_tag_number: null,
  microchip_number: null
};

export default function AddAnimalModal({
  show,
  onHide,
  ownerId,
  clinicId,
  onAnimalCreated
}: Props) {
  const [loading, setLoading] = useState(false);
  
  // Track an array of animals exactly like WalkinIntake
  const [animals, setAnimals] = useState<Omit<Animal, 'id'>[]>([
    { ...EMPTY_ANIMAL }
  ]);

  // Reset modal state back to a single blank form whenever it opens
  useEffect(() => {
    if (show) {
      setAnimals([{ ...EMPTY_ANIMAL }]);
    }
  }, [show]);

  // ----------------------
  // ARRAY STATE ACTIONS
  // ----------------------
  const addAnimal = () => {
    setAnimals(prev => [...prev, { ...EMPTY_ANIMAL }]);
  };

  const cloneLastAnimal = () => {
    setAnimals(prev => {
      if (prev.length === 0) {
        return [{ ...EMPTY_ANIMAL }];
      }
      const lastAnimal = prev[prev.length - 1];
      
      // Clone everything except the unique identifiers
      const cloned = {
        ...lastAnimal,
        name: '',
        rabies_tag_number: null,
        microchip_number: null
      };
      return [...prev, cloned];
    });
  };

  const removeAnimal = (indexToRemove: number) => {
    setAnimals(prev => {
      if (prev.length === 1) return prev; // Keep at least one form open
      return prev.filter((_, i) => i !== indexToRemove);
    });
  };

  const updateAnimal = (index: number, field: keyof Animal, value: any) => {
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
  const isAnimalValid = (ani: Omit<Animal, 'id'>) => {
    const hasAge = ani.age_years !== null || ani.age_months !== null;
    return (
      ani.name.trim() !== '' &&
      ani.species.trim() !== '' &&
      ani.sex.trim() !== '' &&
      ani.primary_breed?.trim() !== '' &&
      ani.primary_color?.trim() !== '' &&
      hasAge
    );
  };

  const canSubmit = animals.length > 0 && animals.every(isAnimalValid);

  // ----------------------
  // SUBMIT BATCH TO API
  // ----------------------
  const submit = async () => {
    if (!canSubmit) {
      alert('Please complete all required fields for each animal.');
      return;
    }

    try {
      setLoading(true);

      // FIX: Combined 'animal Data' into a single variable name 'animalData'
      for (const animalData of animals) {
        const res = await api.post('/animals', {
          owner_id: ownerId,
          clinic_id: clinicId,
          ...animalData
        });
        
        // Notify the parent UI profile list of each new creation
        onAnimalCreated(res.data.animal);
      }

      onHide();
    } catch (err) {
      console.error(err);
      alert('Failed to save animals. Some records may not have saved.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title>Add Animals to Profile</Modal.Title>
      </Modal.Header>

      <Modal.Body style={{ maxHeight: '65vh', overflowY: 'auto' }}>
        {animals.map((animal, i) => (
          <div key={i} className={i > 0 ? "mt-4 pt-4 border-top" : ""}>
            <AnimalForm
              animal={animal as Animal}
              mode="multi"
              index={i}
              showClinicFields={true}
              removeAnimal={removeAnimal}
              updateAnimal={(field, value) => updateAnimal(i, field, value)}
            />
          </div>
        ))}
      </Modal.Body>

      <Modal.Footer>
        <div className="d-flex justify-content-between w-100">
          
          {/* Layout Controls identical to WalkinIntake workspace layout */}
          <div className="d-flex gap-2">
            <Button variant="secondary" onClick={addAnimal} disabled={loading}>
              + Add Another Animal
            </Button>

            <Button variant="outline-secondary" onClick={cloneLastAnimal} disabled={loading}>
              + Clone Animal
            </Button>
          </div>
          
          {/* Modal Commit State Actions */}
          <div className="d-flex gap-2">
            <Button variant="secondary" onClick={onHide} disabled={loading}>
              Cancel
            </Button>

            <Button
              variant="primary"
              onClick={submit}
              disabled={loading || !canSubmit}
            >
              {loading ? 'Saving Records...' : `Add ${animals.length} Animal${animals.length > 1 ? 's' : ''}`}
            </Button>
          </div>
        </div>
      </Modal.Footer>
    </Modal>
  );
}