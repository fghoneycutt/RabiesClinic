import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Container,
  Nav,
  Spinner
} from 'react-bootstrap';
import {
  FaPaw,
  FaUsers,
  FaThLarge
} from 'react-icons/fa';

import { api } from '../../api/api';

import ShelterAnimalsTab from './components/ShelterAnimalsTab';
import ShelterPeopleTab from './components/ShelterPeopleTab';
import ShelterVisualTab from './components/ShelterVisualTab';

import type {
  ShelterAnimal,
  ShelterPerson
} from './shelterOperations.types';

type ActiveTab = 'animals' | 'people' | 'visual';

interface ShelterOperationsHomeProps {
  organizationName?: string;
}

function extractRecords<T>(response: any): T[] {
  const data = response?.data;

  if (Array.isArray(data)) return data;

  if (Array.isArray(data?.animals)) return data.animals;
  if (Array.isArray(data?.owners)) return data.owners;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.results)) return data.results;

  return [];
}

export default function ShelterOperationsHome({
  organizationName = 'Your Organization'
}: ShelterOperationsHomeProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>('animals');

  const [animals, setAnimals] = useState<ShelterAnimal[]>([]);
  const [people, setPeople] = useState<ShelterPerson[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const [animalsResponse, peopleResponse] = await Promise.all([
        api.get('/animals'),
        api.get('/owners')
      ]);

      setAnimals(extractRecords<ShelterAnimal>(animalsResponse));
      setPeople(extractRecords<ShelterPerson>(peopleResponse));
    } catch (err: any) {
      console.error('Error loading Shelter Operations dashboard:', err);

      setError(
        err.response?.data?.message ||
        'Unable to load Shelter Operations records.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  return (
    <Container fluid className="py-4 px-3 px-lg-4">
      <div className="mb-4">
        <h2 className="fw-bold mb-1">{organizationName}</h2>
        <div className="text-muted">
          Shelter Operations
        </div>
      </div>

      <Nav
        variant="tabs"
        activeKey={activeTab}
        onSelect={(key) => {
          if (key) setActiveTab(key as ActiveTab);
        }}
        className="mb-4"
      >
        <Nav.Item>
          <Nav.Link eventKey="animals" className="d-flex align-items-center gap-2">
            <FaPaw />
            Animals
          </Nav.Link>
        </Nav.Item>

        <Nav.Item>
          <Nav.Link eventKey="people" className="d-flex align-items-center gap-2">
            <FaUsers />
            People
          </Nav.Link>
        </Nav.Item>

        <Nav.Item>
          <Nav.Link eventKey="visual" className="d-flex align-items-center gap-2">
            <FaThLarge />
            Visual Shelter
          </Nav.Link>
        </Nav.Item>
      </Nav>

      {error && (
        <Alert variant="danger" className="d-flex justify-content-between align-items-center">
          <span>{error}</span>
          <button
            type="button"
            className="btn btn-sm btn-outline-danger"
            onClick={loadDashboard}
          >
            Try Again
          </button>
        </Alert>
      )}

      {loading ? (
        <div className="d-flex justify-content-center align-items-center py-5">
          <Spinner animation="border" role="status" />
          <span className="ms-3 text-muted">Loading records...</span>
        </div>
      ) : (
        <>
          {activeTab === 'animals' && (
            <ShelterAnimalsTab animals={animals} />
          )}

          {activeTab === 'people' && (
            <ShelterPeopleTab people={people} />
          )}

          {activeTab === 'visual' && (
            <ShelterVisualTab />
          )}
        </>
      )}
    </Container>
  );
}