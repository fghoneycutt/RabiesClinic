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

    const changedFields =
      Object.keys(draftAnimal).filter(
        key =>
          draftAnimal[key as AnimalField] !==
          animal[key as AnimalField]
      );


    for (const key of changedFields) {

      const field =
        key as AnimalField;

      await saveAnimalField(
        animal.id,
        field,
        draftAnimal[field]
      );

      updateAnimalLocal(
        animal.id,
        field,
        draftAnimal[field]
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


        {/* MICROCHIP */}

        {clinic.offerings?.microchip?.enabled && (

          <td>

            <Form.Control
              size="sm"
              value={
                formatMicrochip(
                  displayedAnimal.microchip_number || ''
                )
              }

              onChange={(e) =>
                updateDraftAnimal(
                  animal.id,
                  'microchip_number',
                  unformatMicrochip(
                    e.target.value
                  )
                )
              }

              onCopy={(e) => {

                e.preventDefault();

                navigator.clipboard.writeText(
                  displayedAnimal.microchip_number || ''
                );

              }}

            />

          </td>

        )}


        {/* ACTIONS */}

        <td>
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