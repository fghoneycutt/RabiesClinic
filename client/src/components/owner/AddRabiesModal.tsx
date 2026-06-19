import { useEffect, useState } from 'react';

import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';

import { api } from '../../api/api';

import type { Vaccination, Clinic } from '../../types/intake';

import { RABIES_PRODUCT_MANUFACTURER } from '../../constants/animalOptions';
import { useAuth } from '../../auth/AuthContext';

type VaccineType = '' | 'rabies_1_year' | 'rabies_3_year';

type UserOption = {
  id: string;
  name: string;
};

type Props = {
  show: boolean;
  onHide: () => void;

  animalId: string;
  animalName: string;

  clinic: Clinic;

  onSave: (vaccination: Vaccination) => void;
};

export default function AddRabiesModal({
  show,
  onHide,
  animalId,
  animalName,
  clinic,
  onSave
}: Props) {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserOption[]>([]);

  // -----------------------------
  // CLEAN HELPER (CRITICAL FIX)
  // -----------------------------
  const clean = (v: any) => (v === '' ? null : v);

  // -----------------------------
  // LOAD USERS
  // -----------------------------
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await api.get('/users');
        setUsers(res.data || []);
      } catch (err) {
        console.error('Failed to load users:', err);
      }
    };

    fetchUsers();
  }, []);

  // -----------------------------
  // HELPERS
  // -----------------------------
  const formatDateTimeLocal = (date: Date) => {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
      date.getDate()
    )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  const buildDueDate = (years: number) => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + years);
    d.setHours(0, 0, 0, 0);
    return formatDateTimeLocal(d);
  };

  const extractManufacturer = (product: string): string => {
    const match = product.match(/\(([^)]+)\)$/);
    return match ? match[1].trim() : '';
  };

  // -----------------------------
  // EMPTY FORM
  // -----------------------------
  const createEmptyForm = (): Vaccination => {
    const savedVetId = clinic?.default_veterinarian;
    const matchingVet = users.find(u => u.id === savedVetId);

    return {
      id: crypto.randomUUID(),
      animal_id: animalId,
      vaccine_type: '',
      product: '',
      manufacturer: '',
      rabies_tag_number: '',
      lot_number: '',
      product_expiration_date: '',
      notes: '',
      vaccinated_by: user?.name || '',
      supervising_veterinarian: matchingVet?.name || '',
      date_time_administered: formatDateTimeLocal(new Date()),
      date_time_due: ''
    };
  };

  const [form, setForm] = useState<Vaccination>(createEmptyForm());

  useEffect(() => {
    if (show) {
      setForm(createEmptyForm());
    }
  }, [show, animalId, user, clinic, users]);

  // -----------------------------
  // DEFAULTS
  // -----------------------------
  const getDefaults = (type: VaccineType) => {
    if (!clinic?.offerings) return null;

    if (type === 'rabies_1_year') return clinic.offerings.rabies_1_year;
    if (type === 'rabies_3_year') return clinic.offerings.rabies_3_year;

    return null;
  };

  const update = (field: keyof Vaccination, value: any) => {
    setForm(prev => (prev ? { ...prev, [field]: value } : prev));
  };

  const handleTypeChange = (value: string) => {
    const type = value as VaccineType;
    const defaults = getDefaults(type);

    const dueDate =
      type === 'rabies_1_year'
        ? buildDueDate(1)
        : type === 'rabies_3_year'
        ? buildDueDate(3)
        : '';

    const savedVetId = clinic?.default_veterinarian;
    const matchingVet = users.find(u => u.id === savedVetId);

    setForm(prev => ({
      ...prev,
      vaccine_type: type,
      date_time_due: dueDate,

      product: defaults?.default_product ?? '',
      manufacturer: defaults?.default_manufacturer ?? '',

      lot_number: defaults?.default_lot_number ?? '',
      product_expiration_date:
        defaults?.default_product_expiration_date ?? '',

      supervising_veterinarian: matchingVet?.name || prev.supervising_veterinarian || '',
      vaccinated_by: prev.vaccinated_by || user?.name || ''
    }));
  };

  // -----------------------------
  // VALIDATION
  // -----------------------------
  const isFormValid =
    !!form.vaccine_type &&
    !!form.rabies_tag_number?.trim() &&
    !!form.product?.trim() &&
    !!form.lot_number?.trim() &&
    !!form.product_expiration_date &&
    !!form.vaccinated_by?.trim() &&
    !!form.supervising_veterinarian?.trim() &&
    !!form.date_time_administered &&
    !!form.date_time_due;

  // -----------------------------
  // SAVE
  // -----------------------------
  const save = async () => {
    if (!isFormValid) return;

    try {
      const { id, ...cleanForm } = form;

      const payload = {
        ...cleanForm,
        animal_id: animalId,

        date_time_due: clean(form.date_time_due),
        date_time_administered: clean(form.date_time_administered),

        product: clean(form.product),
        manufacturer:
          clean(form.manufacturer) ||
          getDefaults(form.vaccine_type as VaccineType)?.default_manufacturer ||
          null
      };

      const res = await api.post(`/vaccinations/${animalId}`, payload);

      onSave(res.data);
      onHide();
    } catch (err: any) {
      console.error('Failed to save vaccination:', err?.response?.data || err);

      alert(err?.response?.data?.message || 'Failed to save vaccination');
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>
          <i className="fas fa-syringes text-success me-2"></i>
          Add Rabies Vaccine
          {animalName ? ` - ${animalName}` : ''}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        <Form.Group className="mb-3">
          <Form.Label>Vaccine Type</Form.Label>
          <Form.Select
            value={form.vaccine_type}
            isInvalid={!form.vaccine_type}
            onChange={e => handleTypeChange(e.target.value)}
          >
            <option value="">Select vaccine type...</option>
            <option value="rabies_1_year">1 Year Rabies</option>

            {clinic?.offerings?.rabies_3_year?.enabled && (
              <option value="rabies_3_year">3 Year Rabies</option>
            )}
          </Form.Select>
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Rabies Tag #</Form.Label>
          <Form.Control
            value={form.rabies_tag_number || ''}
            isInvalid={!form.rabies_tag_number?.trim()}
            onChange={e => update('rabies_tag_number', e.target.value)}
          />
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Product</Form.Label>
          <Form.Select
            value={form.product}
            isInvalid={!form.product?.trim()}
            onChange={e => {
              const value = e.target.value;
              update('product', value);
              update('manufacturer', extractManufacturer(value));
            }}
          >
            <option value="">Select product...</option>
            {RABIES_PRODUCT_MANUFACTURER.map(p => (
              <option
                key={`${p.product}-${p.manufacturer}`}
                value={p.product}
              >
                {p.product} ({p.manufacturer})
              </option>
            ))}
          </Form.Select>
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Lot Number</Form.Label>
          <Form.Control
            value={form.lot_number || ''}
            isInvalid={!form.lot_number?.trim()}
            onChange={e => update('lot_number', e.target.value)}
          />
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Expiration Date</Form.Label>
          <Form.Control
            type="date"
            value={form.product_expiration_date || ''}
            isInvalid={!form.product_expiration_date}
            onChange={e => update('product_expiration_date', e.target.value)}
          />
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Vaccinated By</Form.Label>
          <Form.Select
            value={form.vaccinated_by || ''}
            isInvalid={!form.vaccinated_by?.trim()}
            onChange={e => update('vaccinated_by', e.target.value)}
          >
            <option value="">Select user...</option>
            {users.map(u => (
              <option key={u.id} value={u.name}>
                {u.name}
              </option>
            ))}
          </Form.Select>
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Supervising Veterinarian</Form.Label>
          <Form.Control
            value={form.supervising_veterinarian || ''}
            isInvalid={!form.supervising_veterinarian?.trim()}
            onChange={e => update('supervising_veterinarian', e.target.value)}
          />
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Date / Time Administered</Form.Label>
          <Form.Control
            type="datetime-local"
            value={form.date_time_administered}
            onChange={e => update('date_time_administered', e.target.value)}
          />
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Date / Time Due</Form.Label>
          <Form.Control
            type="datetime-local"
            value={form.date_time_due || ''}
            onChange={e => update('date_time_due', e.target.value)}
          />
        </Form.Group>

        <Form.Group>
          <Form.Label>Notes</Form.Label>
          <Form.Control
            as="textarea"
            rows={3}
            value={form.notes || ''}
            onChange={e => update('notes', e.target.value)}
          />
        </Form.Group>
      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Cancel
        </Button>

        <Button variant="success" onClick={save} disabled={!isFormValid}>
          Save Vaccine
        </Button>
      </Modal.Footer>
    </Modal>
  );
}