import { useState } from 'react';

import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';

import AnimalEditableCells from './AnimalEditableCells';
import VaccineSection from './VaccinationSection';
import AddRabiesModal from '../owner/AddRabiesModal';
import DeleteAnimalModal from './DeleteAnimalModal';

import type {
  Animal,
  Vaccination,
  Clinic
} from '../../types/intake';

type AnimalField = keyof Animal;

type UserOption = {
  id: string;
  name: string;
};

type Props = {
  animal: Animal;
  clinic: Clinic;
  users: UserOption[];

  editing: boolean;

  updateAnimalLocal: (
    animalId: string,
    field: AnimalField,
    value: any
  ) => void;

  saveAnimalField: (
    animalId: string,
    field: AnimalField,
    value: any
  ) => Promise<void>;

  toggleAnimalEdit: (
    id: string
  ) => void;

  onDeleteAnimal: (
    animalId: string
  ) => void;
};

const formatMicrochip = (value: string) =>
  value
    .replace(/\D/g, '')
    .match(/.{1,3}/g)
    ?.join(' ') ?? '';

const unformatMicrochip = (value: string) =>
  value.replace(/\s+/g, '');


export default function AnimalRow({
  animal,
  clinic,
  users,
  editing,
  updateAnimalLocal,
  saveAnimalField,
  toggleAnimalEdit,
  onDeleteAnimal
}: Props) {

  const [
    showRabiesModal,
    setShowRabiesModal
  ] = useState(false);

  const [
    showDeleteModal,
    setShowDeleteModal
  ] = useState(false);

  const [
    vaccineExpanded,
    setVaccineExpanded
  ] = useState(false);

  // -----------------------------
  // SAFE VACCINE ACCESS
  // -----------------------------
  const vaccinations =
    animal.vaccinations ?? [];

  const latestRabies =
    vaccinations.length > 0
      ? vaccinations[0]
      : null;

  const hasRabies =
    !!latestRabies;

  // -----------------------------
  // ADD VACCINE
  // -----------------------------
  const addVaccination = (
    vaccination: Vaccination
  ) => {
    updateAnimalLocal(
      animal.id,
      'vaccinations',
      [vaccination]
    );
  };

  return (
    <>
      {/* ================= MAIN ROW ================= */}
      <tr>

        {/* ---------------- ANIMAL CELLS ---------------- */}
        <AnimalEditableCells
          animal={animal}
          editing={editing}
          updateAnimalLocal={updateAnimalLocal}
          saveAnimalField={saveAnimalField}
        />

        {/* ---------------- RABIES ---------------- */}
        <td>
          {!hasRabies ? (
            <Button
              size="sm"
              variant="outline-success"
              onClick={() => setShowRabiesModal(true)}
              className="d-inline-flex align-items-center gap-1"
            >
              <i className="fas fa-plus"></i> Add
            </Button>
          ) : (
            <div className="d-flex align-items-center justify-content-between gap-2">

              <div
                className="d-flex align-items-center gap-1 flex-grow-1"
                style={{ cursor: 'pointer', userSelect: 'none' }}
                onClick={() => setVaccineExpanded(p => !p)}
              >
                <strong>{latestRabies?.rabies_tag_number}</strong>

                <span className="text-muted small">
                  {latestRabies?.vaccine_type === 'rabies_1_year'
                    ? '1 Yr'
                    : latestRabies?.vaccine_type === 'rabies_3_year'
                    ? '3 Yr'
                    : ''}
                </span>

                <span className="ms-1 text-primary small">
                  {vaccineExpanded ? (
                    <i className="fas fa-caret-down"></i>
                  ) : (
                    <i className="fas fa-caret-right"></i>
                  )}
                </span>
              </div>

              <Button
                size="sm"
                variant="outline-secondary"
                title="Print Rabies Certificate"
                className="d-inline-flex align-items-center justify-content-center p-1"
                style={{ width: '28px', height: '28px' }}
                href={`${import.meta.env.VITE_API_URL}/api/vaccinations/${latestRabies?.id}/certificate`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <i className="fas fa-file-pdf text-danger"></i>
              </Button>

            </div>
          )}
        </td>

        {/* ---------------- MICROCHIP ---------------- */}
        {clinic.offerings?.microchip?.enabled && (
          <td>
            <div className="position-relative d-flex align-items-center">

              <i
                className="fas fa-microchip text-muted position-absolute ms-2"
                style={{ opacity: 0.4, pointerEvents: 'none' }}
              />

              <Form.Control
                size="sm"
                className="ps-4"
                maxLength={19}
                value={formatMicrochip(animal.microchip_number || '')}
                onChange={(e) => {
                  const rawValue = unformatMicrochip(e.target.value);

                  updateAnimalLocal(
                    animal.id,
                    'microchip_number',
                    rawValue
                  );
                }}
                onBlur={(e) => {
                  const rawValue = unformatMicrochip(e.target.value);

                  saveAnimalField(
                    animal.id,
                    'microchip_number',
                    rawValue
                  );
                }}
                 onCopy={(e) => {
                  e.preventDefault();

                  navigator.clipboard.writeText(
                    animal.microchip_number || ''
                  );
                }}
              />
            </div>
          </td>
        )}

        {/* ---------------- ACTIONS ---------------- */}
        <td>
          <div className="d-flex flex-column gap-1">

            <Button
              size="sm"
              variant={editing ? 'success' : 'outline-primary'}
              onClick={() => toggleAnimalEdit(animal.id)}
              className="d-inline-flex align-items-center justify-content-center gap-1"
            >
              {editing ? (
                <>
                  <i className="fas fa-check"></i> Done
                </>
              ) : (
                <>
                  <i className="fas fa-edit"></i> Edit
                </>
              )}
            </Button>

            {editing && (
              <Button
                size="sm"
                variant="outline-danger"
                onClick={() => setShowDeleteModal(true)}
                className="d-inline-flex align-items-center justify-content-center gap-1"
              >
                <i className="fas fa-trash-alt"></i> Delete
              </Button>
            )}

          </div>
        </td>

      </tr>

      {/* ================= EXPANDED VACCINE ROW (FIXED) ================= */}
      {hasRabies && vaccineExpanded && latestRabies && (
        <tr>
          <td colSpan={999}>
            <VaccineSection
              animal={animal}
              clinic={clinic}
              users={users}
              updateAnimalLocal={updateAnimalLocal}
              saveAnimalField={saveAnimalField}
            />
          </td>
        </tr>
      )}

      {/* ================= MODALS (NO TABLE IMPACT) ================= */}
      <AddRabiesModal
        show={showRabiesModal}
        onHide={() => setShowRabiesModal(false)}
        animalId={animal.id}
        animalName={animal.name}
        clinic={clinic}
        onSave={addVaccination}
      />

      <DeleteAnimalModal
        show={showDeleteModal}
        onHide={() => setShowDeleteModal(false)}
        animal={animal}
        onDeleted={() => onDeleteAnimal(animal.id)}
      />
    </>
  );
}