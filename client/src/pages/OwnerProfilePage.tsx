import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import { api } from '../api/api';
import { useClinic } from '../hooks/useClinics';

import ClinicHeader from '../components/ClinicHeader';
import OwnerCard from '../components/owner/OwnerCard';
import AnimalsTable from '../components/owner/AnimalsTable';
import AddAnimalModal from '../components/owner/AddAnimalModal';

import Button from 'react-bootstrap/Button';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus } from '@fortawesome/free-solid-svg-icons';

import type { Owner, Animal } from '../types/intake';

type UserOption = {
  id: string;
  name: string;
};



export default function OwnerProfilePage() {
  const { clinicId, ownerId } = useParams();

  // -------------------------
  // CLINIC
  // -------------------------
  const { clinic, loading: clinicLoading } = useClinic(clinicId);

  // -------------------------
  // STATE
  // -------------------------
  const [owner, setOwner] = useState<Owner | null>(null);
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);

  const [loading, setLoading] = useState(true);

  const [editingOwner, setEditingOwner] = useState(false);
  const [editingAnimals, setEditingAnimals] = useState<Set<string>>(new Set());

  const [showAddAnimalModal, setShowAddAnimalModal] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    document.title = owner
      ? `${owner.first_name} ${owner.last_name} Profile`
      : 'Owner Profile';
  }, [owner]);

  const onDeleteAnimal = async (animalId: string) => {
    try {
      await api.delete(`/animals/${animalId}`);

      // remove from UI
      setAnimals(prev => prev.filter(a => a.id !== animalId));
    } catch (err) {
      console.error(err);
      alert('Failed to delete animal');
    }
  };

  // -------------------------
  // FETCH USERS
  // -------------------------
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await api.get('/users');
        setUsers(res.data || []);
      } catch (err) {
        console.error('Failed to load users:', err);
        setUsers([]);
      }
    };

    fetchUsers();
  }, []);

  const goToIntake = () => {
    navigate(`/clinics/${clinicId}/intake?mode=staff`, {
      state: clinic
    });
  };

  // -------------------------
  // NORMALIZE ANIMAL
  // -------------------------
  const normalizeAnimal = (a: any): Animal => ({
    ...a,

    species: a.species === 'dog' || a.species === 'cat' ? a.species : '',

    altered_status:
      a.altered_status === true
        ? true
        : a.altered_status === false
        ? false
        : null,

    // 🔥 CRITICAL FIX: ALWAYS ARRAY
    vaccinations: Array.isArray(a.vaccinations)
      ? [...a.vaccinations].sort(
          (x, y) =>
            new Date(y.date_time_administered).getTime() -
            new Date(x.date_time_administered).getTime()
        )
      : []
  });

  // -------------------------
  // FETCH OWNER
  // -------------------------
  useEffect(() => {
    const fetchOwner = async () => {
      try {
        setLoading(true);

        // 🔥 FIX: Pass clinicId context to the backend using Axios params config
        const res = await api.get(`/owners/${ownerId}`, {
          params: { clinicId }
        });

        setOwner(res.data.owner);

        setAnimals(
          (res.data.animals || []).map(normalizeAnimal)
        );
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (ownerId) fetchOwner();
  }, [ownerId, clinicId]); // Add clinicId here to re-fetch if it changes

  // -------------------------
  // OWNER UPDATE LOCAL
  // -------------------------
  const updateOwnerField = (field: keyof Owner, value: any) => {
    if (!owner) return;

    setOwner(prev =>
      prev
        ? {
            ...prev,
            [field]: value
          }
        : prev
    );
  };

  // -------------------------
  // SAVE OWNER
  // -------------------------
  const saveOwner = async () => {
    if (!owner) return;

    try {
      await api.put(`/owners/${owner.id}`, owner);
      setEditingOwner(false);
    } catch (err) {
      console.error(err);
      alert('Failed to update owner');
    }
  };

  // -------------------------
  // ANIMAL UPDATE LOCAL
  // -------------------------
  const updateAnimalLocal = (
    animalId: string,
    field: keyof Animal,
    value: any
  ) => {
    setAnimals(prev =>
      prev.map(a =>
        a.id === animalId ? { ...a, [field]: value } : a
      )
    );
  };

  // -------------------------
  // SAVE ANIMAL FIELD
  // -------------------------
  const saveAnimalField = async (
    animalId: string,
    field: keyof Animal,
    value: any
  ) => {
    try {
      // Automatically include the active clinicId from the URL params
      await api.put(`/animals/${animalId}`, {
        [field]: value,
        clinic_id: clinicId
      });
    } catch (err) {
      console.error(err);
      alert('Failed to update animal');
    }
  };

  // -------------------------
  // TOGGLE EDIT
  // -------------------------
  const toggleAnimalEdit = (animalId: string) => {
    setEditingAnimals(prev => {
      const next = new Set(prev);
      next.has(animalId)
        ? next.delete(animalId)
        : next.add(animalId);
      return next;
    });
  };

  // -------------------------
  // LOADING GUARD
  // -------------------------
  if (loading || clinicLoading) {
    return <p>Loading owner...</p>;
  }

  if (!owner) {
    return <p>Owner not found</p>;
  }

  if (!clinic) {
    return <p>Clinic not found</p>;
  }

  // -------------------------
  // RENDER
  // -------------------------
  return (
    <div
      style={{
        maxWidth: 1400,
        margin: '0 auto',
        paddingTop: '1.5rem'
      }}
    >
      <ClinicHeader
        clinic={clinic}
        rightSlot={
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
        }
      />

      <OwnerCard
        owner={owner}
        editing={editingOwner}
        setEditing={setEditingOwner}
        updateOwnerField={updateOwnerField}
        saveOwner={saveOwner}
      />

      <AnimalsTable
        animals={animals}
        clinic={clinic}
        users={users}
        editingAnimals={editingAnimals}
        toggleAnimalEdit={toggleAnimalEdit}
        updateAnimalLocal={updateAnimalLocal}
        saveAnimalField={saveAnimalField}
        onAddAnimal={() => setShowAddAnimalModal(true)}
        onDeleteAnimal={onDeleteAnimal}
      />

      <AddAnimalModal
        show={showAddAnimalModal}
        onHide={() => setShowAddAnimalModal(false)}
        ownerId={owner.id}
        clinicId={clinicId!}
        onAnimalCreated={(animal) => {
          setAnimals(prev => [
            normalizeAnimal(animal),
            ...prev
          ]);
        }}
      />
    </div>
  );
}