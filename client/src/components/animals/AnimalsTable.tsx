import Table from 'react-bootstrap/Table';
import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';

import type {
  Animal,
  Clinic
} from '../../types/intake';

import AnimalRow from './AnimalRow';

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
              Add Animal
            </Button>

          </div>

        </div>
        <div style={{ overflowX: 'auto' }}>
        {/* TABLE */}
        <Table
          striped
          bordered
          hover
          style={{
            minWidth: '1500px'
          }}
        >

          <thead>
            <tr>
              <th>Name</th>
              <th>Species</th>
              <th>Breed</th>
              <th>Sex</th>
              <th>Altered</th>
              <th>Age</th>
              <th>Color</th>
              <th>Pattern</th>
              <th>Rabies</th>
              <th>Microchip Number</th>
              <th>Microchip Issuer</th>
              <th
                className="text-center"
                style={{
                  width: 120,
                  minWidth: 120,
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
  
      </Card.Body>

    </Card>
  );
}