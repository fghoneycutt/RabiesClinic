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
  clinic,
  users,
  editingAnimals,
  toggleAnimalEdit,
  updateAnimalLocal,
  saveAnimalField,
  onDeleteAnimal,
  onAddAnimal
}: Props) {

  return (
    <Card>

      <Card.Body>

        {/* HEADER */}
        <div className="d-flex justify-content-between align-items-center mb-3">

          <h5 className="mb-0">
            Animals
          </h5>

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

        {/* TABLE */}
        <Table
          striped
          bordered
          hover
          responsive
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
              {clinic.offerings?.microchip?.enabled && <th>Microchip Number</th>}
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

      </Card.Body>

    </Card>
  );
}