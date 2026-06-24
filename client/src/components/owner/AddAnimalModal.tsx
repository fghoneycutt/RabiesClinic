import { useState } from 'react';
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';

import { api } from '../../api/api';
import type { Animal } from '../../types/intake';

import AnimalForm from '../AnimalForm';

type Props = {
  show: boolean;
  onHide: () => void;
  ownerId: string;
  clinicId: string;
  onAnimalCreated: (animal: Animal) => void;
};

const emptyAnimal: Omit<Animal, 'id'> = {
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
  const [loading, setLoading] =
    useState(false);

  const [animal, setAnimal] =
    useState(emptyAnimal);

  const updateAnimal = (
    field: keyof Animal,
    value: any
  ) => {
    setAnimal(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // ----------------------
  // VALIDATION
  // ----------------------
  const isAnimalValid = () => {
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

  const submit = async () => {
    if (!isAnimalValid()) {
      alert(
        'Please complete all required fields before adding the animal.'
      );
      return;
    }

    try {
      setLoading(true);

      const res = await api.post(
        '/animals',
        {
          owner_id: ownerId,
          clinic_id: clinicId,
          ...animal
        }
      );

      onAnimalCreated(
        res.data.animal
      );

      setAnimal(emptyAnimal);
      onHide();
    } catch (err) {
      console.error(err);

      alert(
        'Failed to create animal'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      show={show}
      onHide={onHide}
      size="lg"
      centered
    >
      <Modal.Header closeButton>
        <Modal.Title>
          Add Animal
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        <AnimalForm
          animal={animal as Animal}
          mode="single"
          updateAnimal={updateAnimal}
        />
      </Modal.Body>

      <Modal.Footer>
        <Button
          variant="secondary"
          onClick={onHide}
        >
          Cancel
        </Button>

        <Button
          variant="primary"
          onClick={submit}
          disabled={
            loading ||
            !isAnimalValid()
          }
        >
          {loading
            ? 'Saving...'
            : 'Add Animal'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}