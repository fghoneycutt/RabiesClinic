import { useState, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import { api } from '../api/api';
import { useClinic } from '../hooks/useClinics';

import ClinicHeader from '../components/ClinicHeader';

import Card from 'react-bootstrap/Card';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import InputGroup from 'react-bootstrap/InputGroup';
import Spinner from 'react-bootstrap/Spinner';
import Badge from 'react-bootstrap/Badge';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCopy,
  faCheck,
  faPenToSquare,
  faFileExport,
  faPlus
} from '@fortawesome/free-solid-svg-icons';

// -----------------------------------
// TYPES
// -----------------------------------
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

type SearchResult = {
  owner_id: string;
  owner_name: string;
  address: string;
  email: string;
  phone: string;
  animals?: AnimalResult[];
};

// -----------------------------------
// DEBOUNCE
// -----------------------------------
function debounce<T extends (...args: any[]) => void>(
  fn: T,
  delay: number
) {
  let timeout: ReturnType<typeof setTimeout>;

  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
}

// -----------------------------------
// AGE FORMATTER
// -----------------------------------
const formatAge = (age?: string) => {
  if (!age) return '—';

  const yearsMatch = age.match(/(\d+)\s*y/);
  const monthsMatch = age.match(/(\d+)\s*m/);

  const years = yearsMatch ? parseInt(yearsMatch[1]) : null;
  const months = monthsMatch ? parseInt(monthsMatch[1]) : null;

  if (years !== null && months !== null) {
    return `${years} years, ${months} months`;
  }

  if (years !== null) {
    return `${years} years`;
  }

  if (months !== null) {
    return `${months} months`;
  }

  return age;
};

const capitalize = (v?: string | null) =>
  v ? v.charAt(0).toUpperCase() + v.slice(1) : '—';

export default function ClinicPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { clinic, loading, error } = useClinic(id);

  document.title = `${clinic?.name ?? 'Clinic'}`;

  // -----------------------------------
  // STATE & REFS
  // -----------------------------------
  const searchSectionRef = useRef<HTMLDivElement>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  // -----------------------------------
  // NAVIGATION
  // -----------------------------------
  const goToIntake = () => {
    navigate(`/clinics/${id}/intake?mode=staff`, {
      state: clinic
    });
  };

  const goToOwnerProfile = (ownerId: string) => {
    navigate(`/clinics/${id}/owners/${ownerId}`, {
      state: clinic
    });
  };

  const goToEditClinic = () => {
    navigate(`/clinics/${id}/edit`);
  };

  const copyRegistrationLink = async () => {
    try {
      const registrationUrl =
        `${window.location.origin}/clinics/${id}/register`;

      await navigator.clipboard.writeText(
        registrationUrl
      );

      setLinkCopied(true);

      setTimeout(() => {
        setLinkCopied(false);
      }, 2000);

    } catch (err) {
      console.error(err);
      alert('Failed to copy registration link');
    }
  };

  // -----------------------------------
  // EXPORT
  // -----------------------------------
  const exportClinic = async () => {
    if (!clinic) {
      return;
    }

    try {
      const res = await api.get(
        `/clinics/${id}/export`,
        {
          responseType: 'blob'
        }
      );

      const url = window.URL.createObjectURL(
        new Blob([res.data])
      );

      const link = document.createElement('a');

      link.href = url;

      link.setAttribute(
        'download',
        `${clinic.name.replace(/\s+/g, '_')}_export.xlsx`
      );

      document.body.appendChild(link);

      link.click();

      link.remove();

      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
      alert('Failed to export clinic data');
    }
  };

  // -----------------------------------
  // SEARCH
  // -----------------------------------
  const runSearch = async (value: string) => {
    const trimmed = value.trim();

    if (trimmed.length < 2) {
      setResults([]);
      setHasSearched(false);
      setSearching(false);
      return;
    }

    setSearching(true);
    setHasSearched(true);

    if (searchSectionRef.current) {
      searchSectionRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }

    try {
      const res = await api.get(
        `clinics/${id}/search?query=${encodeURIComponent(trimmed)}`
      );

      setResults(res.data || []);
    } catch (err) {
      console.error(err);
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const debouncedSearch = useMemo(
    () => debounce(runSearch, 350),
    [id]
  );

  // -----------------------------------
  // LOADING
  // -----------------------------------
  if (loading) {
    return (
      <div className="py-5 text-center">
        <Spinner animation="border" />
      </div>
    );
  }

  // -----------------------------------
  // ERROR
  // -----------------------------------
  if (error || !clinic) {
    return (
      <div className="py-5 text-center text-danger">
        {error || 'Failed to load clinic'}
      </div>
    );
  }

  return (
    <div className="px-2" style={{ maxWidth: 1000, margin: '0 auto' }}>
      <ClinicHeader
        clinic={clinic}
        rightSlot={
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, auto)',
              gap: '0.5rem',
              justifyContent: 'start' // Explicitly left-align grid items on all screens
            }}
          >
            <Button
              variant="outline-primary"
              onClick={goToEditClinic}
            >
              <FontAwesomeIcon
                icon={faPenToSquare}
                className="me-2"
              />
              Edit Clinic
            </Button>

            <Button
              variant="success"
              onClick={goToIntake}
            >
              <FontAwesomeIcon
                icon={faPlus}
                className="me-2"
              />
              New Intake
            </Button>

            <Button
              className="d-none d-lg-inline-block"
              variant="outline-success"
              onClick={exportClinic}
            >
              <FontAwesomeIcon
                icon={faFileExport}
                className="me-2"
              />
              Export Data
            </Button>

            <Button
              variant="outline-info"
              onClick={copyRegistrationLink}
            >
              <FontAwesomeIcon
                icon={linkCopied ? faCheck : faCopy}
                className="me-2"
              />
              Registration Link
            </Button>
          </div>
        }
      />

      {/* STATS */}
      <Card className="mt-3 border-0 bg-light shadow-sm">
        <Card.Body className="py-3">
          <div className="d-flex align-items-center gap-5 flex-wrap">
            <div>
              <div className="text-muted small">
                Registered Owners
              </div>

              <div className="fs-3 fw-bold">
                {clinic.registered_owners ?? 0}
              </div>
            </div>

            <div>
              <div className="text-muted small">
                Registered Animals
              </div>

              <div className="fs-3 fw-bold">
                {clinic.registered_animals ?? 0}
              </div>
            </div>
          </div>
        </Card.Body>
      </Card>

      {/* SEARCH */}
      <div ref={searchSectionRef} className="mt-3 scroll-margin-top">
        <Card className="shadow-sm">
          <Card.Body>
            <div className="mb-3">
              <h5 className="mb-1">Search Records</h5>
            </div>

            <InputGroup className="mb-3">
              <Form.Control
                placeholder="Search by owner or pet name"
                value={searchTerm}
                onChange={(e) => {
                  const value = e.target.value;

                  setSearchTerm(value);
                  debouncedSearch(value);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    runSearch(searchTerm);
                  }
                }}
              />

              <Button
                variant="outline-secondary"
                onClick={() => {
                  setSearchTerm('');
                  setResults([]);
                  setHasSearched(false);
                  setSearching(false);
                }}
              >
                Clear
              </Button>
            </InputGroup>

            {/* SEARCHING */}
            {searching && (
              <div className="d-flex align-items-center gap-2">
                <Spinner
                  animation="border"
                  size="sm"
                />
                <span>Searching...</span>
              </div>
            )}

            {/* INITIAL STATE */}
            {!hasSearched && !searching && (
              <div className="text-center py-5 text-muted">
                <div className="mb-2 fs-5">
                  Start typing to search records
                </div>
              </div>
            )}

            {/* RESULT COUNT */}
            {!searching &&
              hasSearched &&
              results.length > 0 && (
                <div className="small text-muted mb-3">
                  {results.length} owner
                  {results.length !== 1 ? 's' : ''} found
                </div>
              )}

            {/* RESULTS */}
            {!searching &&
              results.length > 0 && (
                <div className="d-flex flex-column gap-3">
                  {results.map((owner) => (
                    <Card
                      key={owner.owner_id}
                      className="border shadow-sm"
                    >
                      <Card.Body
                        style={{ cursor: 'pointer' }}
                        onClick={() =>
                          goToOwnerProfile(owner.owner_id)
                        }
                      >
                        <div className="d-flex justify-content-between flex-wrap gap-3">
                          <div>
                            <div className="fw-bold fs-5 text-primary">
                              {owner.owner_name}
                            </div>

                            <div className="text-muted small">
                              {owner.address}
                            </div>

                            {owner.phone && (
                              <div className="small">
                                {owner.phone}
                              </div>
                            )}

                            {owner.email && (
                              <div className="small">
                                {owner.email}
                              </div>
                            )}
                          </div>

                          <Badge
                            bg="secondary"
                            className="align-self-start"
                          >
                            {(owner.animals?.length ?? 0)} pet
                            {(owner.animals?.length ?? 0) !== 1
                              ? 's'
                              : ''}
                          </Badge>
                        </div>

                        {owner.animals?.length ? (
                          <div className="mt-3" style={{ overflowX: 'auto' }}>
                            <div className="small fw-bold text-muted mb-2">
                              Animals
                            </div>

                            <div
                              className="d-grid small fw-bold text-muted border-bottom pb-2 mb-2"
                              style={{
                                gridTemplateColumns:
                                  '1.2fr 0.9fr 1fr 0.9fr 0.9fr 0.9fr 1fr 1fr 1.2fr 1.2fr',
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
                              {owner.animals.map(
                                (animal) => (
                                  <div
                                    key={animal.id}
                                    className="d-grid small py-2 border-bottom align-items-center"
                                    style={{
                                      gridTemplateColumns:
                                        '1.2fr 0.9fr 1fr 0.9fr 0.9fr 0.9fr 1fr 1fr 1.2fr 1.2fr',
                                      gap: '8px',
                                      minWidth: '850px'
                                    }}
                                  >
                                    <div className="fw-bold">
                                      {animal.name}
                                    </div>

                                    <div>
                                      {capitalize(
                                        animal.species
                                      )}
                                    </div>

                                    <div>
                                      {animal.breed || '—'}
                                    </div>

                                    <div>
                                      {capitalize(
                                        animal.sex
                                      )}
                                    </div>

                                    <div>
                                      {animal.altered
                                        ? 'Yes'
                                        : 'Unknown'}
                                    </div>

                                    <div>
                                      {formatAge(
                                        animal.age
                                      )}
                                    </div>

                                    <div>
                                      {animal.color || '—'}
                                    </div>

                                    <div>
                                      {animal.pattern || '—'}
                                    </div>

                                    <div>
                                      {animal.rabies_tag_number
                                        ? `${
                                            animal.vaccine_type ===
                                            'rabies_3_year'
                                              ? '3 Yr'
                                              : '1 Yr'
                                          } • ${
                                            animal.rabies_tag_number
                                          }`
                                        : 'None'}
                                    </div>

                                    <div>
                                      {animal.microchip_number ||
                                        '—'}
                                    </div>
                                  </div>
                                )
                              )}
                            </div>
                          </div>
                        ) : null}
                      </Card.Body>
                    </Card>
                  ))}
                </div>
              )}

            {/* EMPTY */}
            {hasSearched &&
              !searching &&
              searchTerm &&
              results.length === 0 && (
                <div className="text-center py-4 text-muted">
                  No matches found.
                </div>
              )}
          </Card.Body>
        </Card>
      </div>
    </div>
  );
}