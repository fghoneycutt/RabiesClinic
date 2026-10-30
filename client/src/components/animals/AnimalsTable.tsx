import Table from 'react-bootstrap/Table';
import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';
import './AnimalTable.css';
import { useState } from 'react';

import {
  faPlus
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import type {
  Animal,
  Clinic
} from '../../types/intake';

import AnimalRow from './AnimalRow';
import VaccineSection from '../vaccines/VaccinationSection';

type UserOption = {
  id: string;
  name: string;
};

type Props = {
  animals: Animal[];
  ownerId: string;
  clinic: Clinic;
  users: UserOption[];
  editingAnimals: Set<string>;

  toggleAnimalEdit: (
    animalId: string
  ) => void;

  updateAnimalLocal: (
    animalId: string,
    field: keyof Animal,
    value: any
  ) => void;

  saveAnimalField: (
    animalId: string,
    field: keyof Animal,
    value: any
  ) => Promise<void>;

  onDeleteAnimal: (
    animalId: string
  ) => void;

  onAddAnimal?: () => void;
};

export default function AnimalsTable({
  animals,
  ownerId,
  clinic,
  users,
  editingAnimals,
  toggleAnimalEdit,
  updateAnimalLocal,
  saveAnimalField,
  onDeleteAnimal,
  onAddAnimal
}: Props) {

  const [expandedMobileVaccines, setExpandedMobileVaccines] =
    useState<Set<string>>(new Set());

  const handleVaccineExpandChange = (
    animalId: string,
    expanded: boolean
  ) => {
    setExpandedMobileVaccines(previous => {
      const next = new Set(previous);

      if (expanded) {
        next.add(animalId);
      } else {
        next.delete(animalId);
      }

      return next;
    });
  };

  const hasRabiesCertificates = animals.some(
    animal =>
      animal.vaccinations &&
      animal.vaccinations.length > 0
  );
  const printAllCertificates = () => {

    window.open(
      `${import.meta.env.VITE_API_URL}/api/vaccinations/owner/${ownerId}/clinic/${clinic.id}/certificates`,
      '_blank',
      'noopener,noreferrer'
    );

  };

  return (
    <Card>

      <Card.Body>

        {/* HEADER */}
        <div className="d-flex justify-content-between align-items-center mb-3">

          <h5 className="mb-0">
            Animals
          </h5>


          <div className="d-flex gap-2">

            {hasRabiesCertificates && (
              <Button
                size="sm"
                variant="outline-secondary"
                onClick={printAllCertificates}
              >
                <i className="fas fa-file-pdf text-danger"></i> Print All Rabies
              </Button>
            )}


            <Button
              size="sm"
              variant="success"
              onClick={() =>
                onAddAnimal?.()
              }
            >
              <FontAwesomeIcon
                icon={faPlus}
                className="me-2"
              />
              Add Animal
            </Button>

          </div>

        </div>
        <div
          className="animal-desktop-table"
          style={{
            position: 'relative',
            overflowX: 'auto'
          }}
        >
        {/* TABLE */}
        <Table
          striped
          bordered
          hover
          className="animal-table"
          style={{
            minWidth: '1500px'
          }}
        >

          <thead>
            <tr>
              <th className="animal-name-header">Name</th>
              <th>Species</th>
              <th>Breed</th>
              <th>Sex</th>
              <th>Altered</th>
              <th>Age</th>
              <th>Weight</th>
              <th>Color</th>
              <th>Pattern</th>
              <th>Microchip Number</th>
              <th>Microchip Issuer</th>
              <th
                className="animal-rabies-cell"
                style={{
                  position: 'sticky',
                  right: '90px',
                  background: 'white',
                  zIndex: 5,
                  whiteSpace: 'nowrap'
                }}
              >
                Rabies
              </th>

              <th
                className="animal-actions-cell text-center"
                style={{
                  width: '90px',
                  whiteSpace: 'nowrap',
                  position: 'sticky',
                  right: 0,
                  background: 'white',
                  zIndex: 6
                }}
              >
                Actions
              </th>
            </tr>
          </thead>

          <tbody>

            {animals.map(animal => (
              <AnimalRow
                key={animal.id}
                animal={animal}
                clinic={clinic}
                users={users}
                editing={editingAnimals.has(animal.id)}
                toggleAnimalEdit={toggleAnimalEdit}
                updateAnimalLocal={updateAnimalLocal}
                saveAnimalField={saveAnimalField}
                onDeleteAnimal={onDeleteAnimal}
              />
            ))}

          </tbody>

        </Table>
      </div>
      {/* MOBILE ANIMAL LIST */}
        <div className="animal-mobile-list">

          {animals.map(animal => (
            <div
              key={animal.id}
              className="animal-mobile-item"
            >

              <div className="animal-mobile-table-scroll">

                <Table
                  striped
                  bordered
                  hover
                  className="animal-table"
                  style={{ minWidth: '1500px' }}
                >

                  {/* MOBILE TABLE HEADERS */}
                  <thead>
                    <tr>
                      <th className="animal-name-header">Name</th>
                      <th>Species</th>
                      <th>Breed</th>
                      <th>Sex</th>
                      <th>Altered</th>
                      <th>Age</th>
                      <th>Weight</th>
                      <th>Color</th>
                      <th>Pattern</th>
                      <th>Microchip Number</th>
                      <th>Microchip Issuer</th>
                    </tr>
                  </thead>

                  <tbody>
                    <AnimalRow
                      animal={animal}
                      clinic={clinic}
                      users={users}
                      editing={editingAnimals.has(animal.id)}
                      isMobile={true}
                      onVaccineExpandChange={handleVaccineExpandChange}
                      toggleAnimalEdit={toggleAnimalEdit}
                      updateAnimalLocal={updateAnimalLocal}
                      saveAnimalField={saveAnimalField}
                      onDeleteAnimal={onDeleteAnimal}
                    />
                  </tbody>

                </Table>

              </div>

              {/* MOBILE ACTIONS */}
              <div className="animal-mobile-actions-slot">
                <div id={`animal-actions-${animal.id}`} />
              </div>
              {/* MOBILE VACCINE INFORMATION */}
              {expandedMobileVaccines.has(animal.id) && (
              <div className="animal-mobile-vaccine-scroll">
                <div className="animal-mobile-vaccine-section">
                  <VaccineSection
                    animal={animal}
                    clinic={clinic}
                    users={users}
                    isMobile={true}
                    updateAnimalLocal={updateAnimalLocal}
                    saveAnimalField={saveAnimalField}
                  />
                </div>
              </div>
            )}

            </div>
          ))}

        </div>
  
      </Card.Body>

    </Card>
  );
}