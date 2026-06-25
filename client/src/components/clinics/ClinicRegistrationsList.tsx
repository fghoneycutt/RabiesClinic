import { useEffect, useState } from 'react';
import { api } from '../../api/api';

import Card from 'react-bootstrap/Card';
import Button from 'react-bootstrap/Button';
import Spinner from 'react-bootstrap/Spinner';
import Badge from 'react-bootstrap/Badge';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft, faChevronRight, faUsers } from '@fortawesome/free-solid-svg-icons';

type AnimalResult = {
  id: string;
  name: string;
  species?: string | null;
  breed?: string | null;
  sex?: string | null;
  altered?: boolean | null;
  age?: string;
  color?: string | null;
  pattern?: string | null;
  rabies_tag_number?: string | null;
  vaccine_type?: string | null;
  microchip_number?: string | null;
};

type OwnerRegistration = {
  owner_id: string;
  owner_name: string;
  address: string;
  email: string;
  phone: string;
  animals: AnimalResult[];
};

type Props = {
  clinicId: string;
  onOwnerClick: (ownerId: string) => void;
  searchTerm: string;
};

const formatAge = (age?: string) => {
  if (!age) return '—';
  const y = age.match(/(\d+)\s*y/);
  const m = age.match(/(\d+)\s*m/);
  if (y && m) return `${y[1]} years, ${m[1]} months`;
  return y ? `${y[1]} years` : m ? `${m[1]} months` : age;
};

const capitalize = (v?: string | null) => (v ? v.charAt(0).toUpperCase() + v.slice(1) : '—');

export default function ClinicRegistrationsList({ clinicId, onOwnerClick, searchTerm }: Props) {
  const [owners, setOwners] = useState<OwnerRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  const recordsPerPage = 15; // Clean sizing benchmark

  useEffect(() => {
    let active = true;

    async function fetchPage() {
      try {
        setLoading(true);
        const res = await api.get(`/clinics/${clinicId}/registrations?page=${page}&limit=${recordsPerPage}`);
        if (active && res.data?.success) {
          setOwners(res.data.owners || []);
          setTotalPages(res.data.pagination?.totalPages || 1);
          setTotalRecords(res.data.pagination?.totalRecords || 0);
        }
      } catch (err) {
        console.error('Error loading registrations:', err);
      } finally {
        if (active) setLoading(false);
      }
    }

    fetchPage();
    return () => { active = false; };
  }, [clinicId, page]);

  if (searchTerm.trim().length > 0) {
    return null; // Instantly hides the component when the user types
  }

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" variant="primary" />
        <div className="text-muted small mt-2">Loading recent records...</div>
      </div>
    );
  }

  if (owners.length === 0) {
    return (
      <div className="text-center py-5 text-muted border rounded bg-white mt-3">
        <FontAwesomeIcon icon={faUsers} className="fs-2 mb-2 text-black-50" />
        <div>No owners registered at this clinic yet.</div>
      </div>
    );
  }

  return (
    <div className="mt-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h5 className="mb-0 fw-bold">
            Registrations 
            {totalRecords > 0 && (
              <span className="text-muted fw-normal ms-2 fs-6">
                ({totalRecords} owners total)
              </span>
            )}
          </h5>
        </div>

        {/* PAGINATION TOOLBAR */}
        {totalPages > 1 && (
          <div className="d-flex gap-2 align-items-center">
            <Button
              variant="outline-secondary"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
            >
              <FontAwesomeIcon icon={faChevronLeft} />
            </Button>
            <span className="small text-muted px-1">
              Page <strong>{page}</strong> of {totalPages}
            </span>
            <Button
              variant="outline-secondary"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            >
              <FontAwesomeIcon icon={faChevronRight} />
            </Button>
          </div>
        )}
      </div>

      <div className="d-flex flex-column gap-3">
        {owners.map(owner => (
          <Card key={owner.owner_id} className="border shadow-sm">
            <Card.Body style={{ cursor: 'pointer' }} onClick={() => onOwnerClick(owner.owner_id)}>
              <div className="d-flex justify-content-between flex-wrap gap-3">
                <div>
                  <div className="fw-bold fs-5 text-primary">{owner.owner_name}</div>
                  <div className="text-muted small">{owner.address}</div>
                  {owner.phone && <div className="small text-dark">{owner.phone}</div>}
                  {owner.email && <div className="small text-secondary">{owner.email}</div>}
                </div>
                <Badge bg="secondary" className="align-self-start">
                  {owner.animals?.length || 0} pet{(owner.animals?.length !== 1) ? 's' : ''}
                </Badge>
              </div>

              {owner.animals?.length > 0 && (
                <div className="mt-3" style={{ overflowX: 'auto' }} onClick={e => e.stopPropagation()}>
                  <div className="small fw-bold text-muted mb-2">Animals</div>
                  <div
                    className="d-grid small fw-bold text-muted border-bottom pb-2 mb-2"
                    style={{
                      gridTemplateColumns: '1.2fr 0.9fr 1fr 0.9fr 0.9fr 0.9fr 1fr 1fr 1.2fr 1.2fr',
                      gap: '8px',
                      minWidth: '850px'
                    }}
                  >
                    <div>Name</div>
                    <div>Species</div>
                    <div>Breed</div>
                    <div>Sex</div>
                    <div>Altered</div>
                    <div>Age</div>
                    <div>Color</div>
                    <div>Pattern</div>
                    <div>Rabies</div>
                    <div>Microchip</div>
                  </div>

                  <div className="d-flex flex-column gap-1">
                    {owner.animals.map(animal => (
                      <div
                        key={animal.id}
                        className="d-grid small py-2 border-bottom align-items-center"
                        style={{
                          gridTemplateColumns: '1.2fr 0.9fr 1fr 0.9fr 0.9fr 0.9fr 1fr 1fr 1.2fr 1.2fr',
                          gap: '8px',
                          minWidth: '850px'
                        }}
                      >
                        <div className="fw-bold text-dark">{animal.name}</div>
                        <div>{capitalize(animal.species)}</div>
                        <div className="text-truncate">{animal.breed || '—'}</div>
                        <div>{capitalize(animal.sex)}</div>
                        <div>{animal.altered ? 'Yes' : 'Unknown'}</div>
                        <div>{formatAge(animal.age)}</div>
                        <div className="text-truncate">{animal.color || '—'}</div>
                        <div className="text-truncate">{animal.pattern || '—'}</div>
                        <div>
                          {animal.rabies_tag_number
                            ? `${animal.vaccine_type === 'rabies_3_year' ? '3 Yr' : '1 Yr'} • ${animal.rabies_tag_number}`
                            : 'None'}
                        </div>
                        <div>{animal.microchip_number || '—'}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card.Body>
          </Card>
        ))}
      </div>
    </div>
  );
}