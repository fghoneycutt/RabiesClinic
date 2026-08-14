import { useEffect, useState } from 'react';

import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';

import AnimalEditableCells from './AnimalEditableCells';
import VaccineSection from '../vaccines/VaccinationSection';
import AddRabiesModal from '../vaccines/AddRabiesModal';
import DeleteAnimalModal from './DeleteAnimalModal';

import type {
  Animal,
  Vaccination,
  Clinic
} from '../../types/intake';

import { MICROCHIP_ISSUERS } from '../../constants/animalOptions';

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

  const [draftAnimal, setDraftAnimal] =
    useState<Animal>(animal);

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

  const [
    microchipError,
    setMicrochipError
  ] = useState('');

  const [
    breedError,
    setBreedError
  ] = useState('');


  useEffect(() => {
    if (!editing) {
      setDraftAnimal(animal);
    }
  }, [animal, editing]);


  const updateDraftAnimal = (
    _animalId: string,
    field: AnimalField,
    value: any
  ) => {
    setDraftAnimal(prev => ({
      ...prev,
      [field]: value
    }));
  };


  const saveEdit = async () => {
    const microchipNumber =
      draftAnimal.microchip_number?.trim() || '';

    const microchipIssuer =
      draftAnimal.microchip_issuer?.trim() || '';

    if (
      (microchipNumber && !microchipIssuer) ||
      (!microchipNumber && microchipIssuer)
    ) {
      setMicrochipError(
        'Microchip issuer required'
      );
      return;
    }

    // -----------------------------
    // BREED VALIDATION / NORMALIZATION
    // -----------------------------

    const primaryBreed =
      draftAnimal.primary_breed?.trim() || '';

    const secondaryBreed =
      draftAnimal.secondary_breed?.trim() || '';

    // No breed at all = cannot save
    if (!primaryBreed && !secondaryBreed) {
      setBreedError(
        'Primary breed is required'
      );
      return;
    }

    // If there is only a secondary breed,
    // promote it to primary and clear secondary.
    if (!primaryBreed && secondaryBreed) {
      setDraftAnimal(prev => ({
        ...prev,
        primary_breed: secondaryBreed,
        secondary_breed: null
      }));
    }

    setBreedError('');

    setMicrochipError('');

    // IMPORTANT:
    // Use the normalized breed values when determining changes.
    const normalizedDraftAnimal = {
      ...draftAnimal,
      ...( !primaryBreed && secondaryBreed
        ? {
            primary_breed: secondaryBreed,
            secondary_breed: null
          }
        : {}
      )
    };

    const changedFields =
      Object.keys(normalizedDraftAnimal).filter(
        key =>
          normalizedDraftAnimal[key as AnimalField] !==
          animal[key as AnimalField]
      );

    for (const key of changedFields) {
      const field = key as AnimalField;

      await saveAnimalField(
        animal.id,
        field,
        normalizedDraftAnimal[field]
      );

      updateAnimalLocal(
        animal.id,
        field,
        normalizedDraftAnimal[field]
      );
    }

    toggleAnimalEdit(animal.id);
  };


  const cancelEdit = () => {
    setDraftAnimal(animal);
    toggleAnimalEdit(animal.id);
  };


  const vaccinations =
    animal.vaccinations ?? [];


  const latestRabies =
    vaccinations.length
      ? vaccinations[0]
      : null;


  const hasRabies =
    !!latestRabies;


  const addVaccination = (
    vaccination: Vaccination
  ) => {

    updateAnimalLocal(
      animal.id,
      'vaccinations',
      [vaccination]
    );

  };


  const displayedAnimal =
    editing
      ? draftAnimal
      : animal;


  return (
    <>
      <tr>

        <AnimalEditableCells
          animal={displayedAnimal}
          editing={editing}
          breedError={breedError}
          updateAnimalLocal={updateDraftAnimal}
        />

        {/* RABIES */}

        <td>

          {!hasRabies ? (

            <Button
              size="sm"
              variant="outline-success"
              onClick={() =>
                setShowRabiesModal(true)
              }
            >
              <i className="fas fa-plus"></i> Add
            </Button>

          ) : (

            <div className="d-flex align-items-center justify-content-between gap-2">

              <div
                className="d-flex align-items-center gap-1 flex-grow-1"
                style={{
                  cursor: 'pointer',
                  userSelect: 'none'
                }}
                onClick={() =>
                  setVaccineExpanded(
                    prev => !prev
                  )
                }
              >

                <strong>
                  {latestRabies?.rabies_tag_number}
                </strong>


                <span className="text-muted small">

                  {
                    latestRabies?.vaccine_type === 'rabies_1_year'
                      ? '1 Yr'
                      : latestRabies?.vaccine_type === 'rabies_3_year'
                      ? '3 Yr'
                      : ''
                  }

                </span>


                <span className="text-primary small">

                  {
                    vaccineExpanded
                      ? <i className="fas fa-caret-down" />
                      : <i className="fas fa-caret-right" />
                  }

                </span>

              </div>


              <Button
                size="sm"
                variant="outline-secondary"
                href={`${import.meta.env.VITE_API_URL}/api/vaccinations/${latestRabies?.id}/certificate`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <i className="fas fa-file-pdf text-danger" />
              </Button>

            </div>

          )}

        </td>

        {/* MICROCHIP NUMBER */}

        <td
          style={{
            whiteSpace: 'nowrap',
            minWidth: editing ? '260px' : '180px'
          }}
        >

          {editing ? (

            <Form.Control
              size="sm"
              maxLength={19}
              style={{
                width: '250px'
              }}

              value={
                formatMicrochip(
                  displayedAnimal.microchip_number || ''
                )
              }

              placeholder="None"

              onChange={(e) => {

                const value =
                  unformatMicrochip(
                    e.target.value
                  )
                  .slice(0, 15);


                updateDraftAnimal(
                  animal.id,
                  'microchip_number',
                  value
                );


                setMicrochipError('');


                if (!value) {

                  updateDraftAnimal(
                    animal.id,
                    'microchip_issuer',
                    null
                  );

                }

              }}

              onCopy={(e) => {

                e.preventDefault();

                navigator.clipboard.writeText(
                  displayedAnimal.microchip_number || ''
                );

              }}

            />

          ) : (

            displayedAnimal.microchip_number
              ? formatMicrochip(displayedAnimal.microchip_number)
              : '-'

          )}

        </td>


        {/* MICROCHIP ISSUER */}

        <td
          style={{
            whiteSpace: 'nowrap',
            minWidth: editing ? '220px' : '180px'
          }}
        >

          {editing ? (

            <>

              <Form.Select
                size="sm"

                style={{
                  width: '210px'
                }}

                disabled={
                  !displayedAnimal.microchip_number
                }

                value={
                  displayedAnimal.microchip_issuer || ''
                }

                onChange={(e) => {

                  setMicrochipError('');

                  updateDraftAnimal(
                    animal.id,
                    'microchip_issuer',
                    e.target.value || null
                  );

                }}

              >

                <option value="">
                  {displayedAnimal.microchip_number
                    ? 'Select issuer'
                    : 'Enter chip first'}
                </option>


                {MICROCHIP_ISSUERS.map(
                  issuer => (

                    <option
                      key={issuer}
                      value={issuer}
                    >
                      {issuer}
                    </option>

                  )
                )}

              </Form.Select>


              {microchipError && (

                <div
                  className="text-danger small mt-1"
                >
                  {microchipError}
                </div>

              )}

            </>

          ) : (

            displayedAnimal.microchip_issuer || '-'

          )}

        </td>

        {/* ACTIONS */}

        <td
          className="text-center"
          style={{
            position: 'sticky',
            right: 0,
            background: 'white',
            zIndex: 5,
            minWidth: '120px'
          }}
        >
          <div
            className="d-flex flex-column gap-1"
            style={{
              whiteSpace: 'nowrap'
            }}
          >

            {!editing ? (

              <Button
                size="sm"
                variant="outline-primary"
                onClick={() =>
                  toggleAnimalEdit(animal.id)
                }
                className="align-self-start"
              >
                <i className="fas fa-edit"></i> Edit
              </Button>

            ) : (

              <>

                <Button
                  size="sm"
                  variant="success"
                  onClick={saveEdit}
                  className="text-nowrap"
                >
                  <i className="fas fa-save"></i> Save
                </Button>


                <Button
                  size="sm"
                  variant="outline-secondary"
                  onClick={cancelEdit}
                  className="text-nowrap"
                >
                  <i className="fas fa-times"></i> Cancel
                </Button>

              </>

            )}


            {editing && (

              <Button
                size="sm"
                variant="outline-danger"
                onClick={() =>
                  setShowDeleteModal(true)
                }
                className="text-nowrap"
              >
                <i className="fas fa-trash-alt"></i> Delete
              </Button>

            )}

          </div>

        </td>

      </tr>


      {hasRabies &&
        vaccineExpanded &&
        latestRabies && (

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


      <AddRabiesModal
        show={showRabiesModal}
        onHide={() =>
          setShowRabiesModal(false)
        }
        animalId={animal.id}
        animalName={animal.name}
        clinic={clinic}
        onSave={addVaccination}
      />


      <DeleteAnimalModal
        show={showDeleteModal}
        onHide={() =>
          setShowDeleteModal(false)
        }
        animal={animal}
        onDeleted={() =>
          onDeleteAnimal(animal.id)
        }
      />

    </>
  );
}