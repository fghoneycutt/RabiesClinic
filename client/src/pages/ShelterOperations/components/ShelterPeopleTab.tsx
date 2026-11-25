import { useMemo, useState } from 'react';
import {
  Card,
  Form,
  Table
} from 'react-bootstrap';

import type { ShelterPerson } from '../shelterOperations.types';

interface Props {
  people: ShelterPerson[];
}

function getPersonName(person: ShelterPerson): string {
  if (person.display_name) return person.display_name;

  if (person.organization_name) return person.organization_name;

  return [
    person.first_name,
    person.last_name
  ].filter(Boolean).join(' ') || 'Unnamed person';
}

function getAddress(person: ShelterPerson): string {
  const firstLine = person.address || '';
  const secondLine = person.secondary_address || '';

  const cityStateZip = [
    person.city,
    person.state,
    person.zip_code
  ].filter(Boolean).join(' ');

  return [
    firstLine,
    secondLine,
    cityStateZip
  ].filter(Boolean).join(', ') || '—';
}

function formatDate(value?: string | null): string {
  if (!value) return '—';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '—';

  return date.toLocaleDateString();
}

export default function ShelterPeopleTab({ people }: Props) {
  const [search, setSearch] = useState('');

  const filteredPeople = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return people;

    return people.filter((person) => {
      const searchable = [
        getPersonName(person),
        getAddress(person),
        person.phone,
        person.email
      ].filter(Boolean).join(' ').toLowerCase();

      return searchable.includes(term);
    });
  }, [people, search]);

  return (
    <div>
      <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-3 mb-3">
        <div>
          <h4 className="fw-bold mb-1">People</h4>
          <div className="text-muted small">
            {filteredPeople.length} {filteredPeople.length === 1 ? 'record' : 'records'}
          </div>
        </div>

        <Form.Control
          type="search"
          placeholder="Search people..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          style={{ maxWidth: '320px' }}
        />
      </div>

      <Card className="border-0 shadow-sm">
        <Card.Body className="p-0">
          <div className="table-responsive">
            <Table hover className="mb-0 align-middle">
              <thead className="table-light">
                <tr>
                  <th>Updated At</th>
                  <th>Name</th>
                  <th>Address</th>
                  <th>Phone</th>
                  <th>Email</th>
                </tr>
              </thead>

              <tbody>
                {filteredPeople.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-5 text-muted">
                      No people found.
                    </td>
                  </tr>
                ) : (
                  filteredPeople.map((person) => (
                    <tr key={person.id}>
                      <td>
                        {formatDate(person.updated_at || person.created_at)}
                      </td>
                      <td className="fw-semibold">
                        {getPersonName(person)}
                      </td>
                      <td>{getAddress(person)}</td>
                      <td>{person.phone || '—'}</td>
                      <td>{person.email || '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          </div>
        </Card.Body>
      </Card>
    </div>
  );
}