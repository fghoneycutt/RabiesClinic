import { useMemo, useState } from 'react';
import {
  Badge,
  Button,
  Card,
  Form,
  Table
} from 'react-bootstrap';

import type { ShelterAnimal } from '../shelterOperations.types';

interface Props {
  animals: ShelterAnimal[];
}

type AnimalFilter = 'custody' | 'all';

function formatDate(value?: string | null): string {
  if (!value) return '—';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '—';

  return date.toLocaleDateString();
}

function getAnimalName(animal: ShelterAnimal): string {
  return animal.name?.trim() || 'Unnamed animal';
}

function getBreed(animal: ShelterAnimal): string {
  return [
    animal.primary_breed,
    animal.secondary_breed
  ].filter(Boolean).join(' / ') || '—';
}

function getColor(animal: ShelterAnimal): string {
  return [
    animal.primary_color,
    animal.secondary_color
  ].filter(Boolean).join(' / ') || '—';
}

function getAge(animal: ShelterAnimal): string {
  const years = animal.age_years;
  const months = animal.age_months;

  if (years == null && months == null) return '—';

  const parts: string[] = [];

  if (years != null && years > 0) {
    parts.push(`${years} ${years === 1 ? 'year' : 'years'}`);
  }

  if (months != null && months > 0) {
    parts.push(`${months} ${months === 1 ? 'month' : 'months'}`);
  }

  return parts.length ? parts.join(', ') : 'Under 1 month';
}

function isInCustody(animal: ShelterAnimal): boolean {
  if (typeof animal.is_in_custody === 'boolean') {
    return animal.is_in_custody;
  }

  const status = String(
    animal.custody_status || animal.status || ''
  ).toLowerCase();

  return [
    'in custody',
    'in_custody',
    'housed',
    'sheltered',
    'available',
    'hold'
  ].includes(status);
}

function getStatus(animal: ShelterAnimal): string {
  return animal.status || animal.custody_status || 'Not recorded';
}

export default function ShelterAnimalsTab({ animals }: Props) {
  const [filter, setFilter] = useState<AnimalFilter>('custody');
  const [search, setSearch] = useState('');

  const filteredAnimals = useMemo(() => {
    let results = animals;

    if (filter === 'custody') {
      results = results.filter(isInCustody);
    }

    const term = search.trim().toLowerCase();

    if (term) {
      results = results.filter((animal) => {
        const searchable = [
          animal.name,
          animal.species,
          animal.primary_breed,
          animal.secondary_breed,
          animal.primary_color,
          animal.secondary_color,
          animal.sex,
          animal.status,
          animal.location
        ].filter(Boolean).join(' ').toLowerCase();

        return searchable.includes(term);
      });
    }

    return results;
  }, [animals, filter, search]);

  return (
    <div>
      <div className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-3 mb-3">
        <div>
          <h4 className="fw-bold mb-1">Animals</h4>
          <div className="text-muted small">
            {filteredAnimals.length} {filteredAnimals.length === 1 ? 'animal' : 'animals'}
          </div>
        </div>

        <div className="d-flex flex-column flex-sm-row gap-2">
          <div className="btn-group" role="group" aria-label="Animal filter">
            <Button
              variant={filter === 'custody' ? 'primary' : 'outline-primary'}
              onClick={() => setFilter('custody')}
            >
              In Custody
            </Button>

            <Button
              variant={filter === 'all' ? 'primary' : 'outline-primary'}
              onClick={() => setFilter('all')}
            >
              All Animals
            </Button>
          </div>

          <Form.Control
            type="search"
            placeholder="Search animals..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            style={{ minWidth: '220px' }}
          />
        </div>
      </div>

      <Card className="border-0 shadow-sm">
        <Card.Body className="p-0">
          <div className="table-responsive">
            <Table hover className="mb-0 align-middle">
              <thead className="table-light">
                <tr>
                  <th>Intake Date</th>
                  <th>Name</th>
                  <th>Species</th>
                  <th>Breed</th>
                  <th>Color</th>
                  <th>Sex</th>
                  <th>Age</th>
                  <th>Location</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {filteredAnimals.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-5 text-muted">
                      {filter === 'custody'
                        ? 'No animals with a recorded in-custody status were found.'
                        : 'No animals found.'}
                    </td>
                  </tr>
                ) : (
                  filteredAnimals.map((animal) => (
                    <tr key={animal.id}>
                      <td>
                        {formatDate(animal.intake_date || animal.created_at)}
                      </td>
                      <td className="fw-semibold">
                        {getAnimalName(animal)}
                      </td>
                      <td>{animal.species || '—'}</td>
                      <td>{getBreed(animal)}</td>
                      <td>{getColor(animal)}</td>
                      <td>{animal.sex || '—'}</td>
                      <td>{getAge(animal)}</td>
                      <td>{animal.location || '—'}</td>
                      <td>
                        <Badge bg="secondary">
                          {getStatus(animal)}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          </div>
        </Card.Body>
      </Card>

      {filter === 'custody' && (
        <div className="small text-muted mt-2">
          In-custody filtering currently depends on a status field being returned by the API.
          Animals without a recognized custody status appear under All Animals.
        </div>
      )}
    </div>
  );
}