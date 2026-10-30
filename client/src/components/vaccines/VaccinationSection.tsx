import { useState } from 'react';

import Form from 'react-bootstrap/Form';
import Table from 'react-bootstrap/Table';
import Card from 'react-bootstrap/Card';
import Button from 'react-bootstrap/Button';

import {
  faEdit,
  faSave,
  faTimes,
  faTrashAlt
} from '@fortawesome/free-solid-svg-icons';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import { api } from '../../api/api';
import { RABIES_PRODUCT_MANUFACTURER } from '../../constants/animalOptions';

import DeleteVaccineModal from './DeleteVaccineModal';

import type { Animal, Vaccination, Clinic } from '../../types/intake';

type UserOption = {
  id: string;
  name: string;
};

type VaccineType = '' | 'rabies_1_year' | 'rabies_3_year';

type Props = {
  animal: Animal;
  clinic: Clinic;
  users: UserOption[];
  isMobile?: boolean;

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
};

export default function VaccineSection({
  animal,
  clinic,
  users,
  isMobile = false,
  updateAnimalLocal
}: Props) {
  const [editing, setEditing] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const vaccination = animal.vaccinations?.[0];
  const [form, setForm] = useState<Vaccination | null>(null);
  if (!vaccination) return null;

  const clean = (v: any) => (v === '' ? null : v);

  // -----------------------------
  // DATE HELPERS
  // -----------------------------
  const formatDisplayDate = (value?: string | null) => {
    if (!value) return '-';
    
    // If it's a date-only string (YYYY-MM-DD), append midnight local time 
    // to force JavaScript to parse it in the user's current timezone.
    let dateString = value;
    if (typeof value === 'string' && value.length === 10 && value.includes('-')) {
      dateString = `${value}T00:00:00`;
    }

    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '-';

    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  const formatDateOnly = (value?: string | null) => {
    if (!value) return '';
    return value.includes('T') ? value.split('T')[0] : value;
  };

  const pad = (n: number) => n.toString().padStart(2, '0');

  const formatDateTimeLocal = (date: Date) =>
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
      date.getDate()
    )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;

  const buildDueDate = (years: number) => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + years);
    d.setHours(0, 0, 0, 0);
    return formatDateTimeLocal(d);
  };

  // -----------------------------
  // DEFAULTS
  // -----------------------------
  const getDefaults = (type: VaccineType) => {
    if (!clinic?.offerings) return null;

    if (type === 'rabies_1_year') return clinic.offerings.rabies_1_year;
    if (type === 'rabies_3_year') return clinic.offerings.rabies_3_year;

    return null;
  };

  // -----------------------------
  // EDIT MODE
  // -----------------------------
  const startEdit = () => {
    setForm({ ...vaccination });
    setEditing(true);
  };

  const cancelEdit = () => {
    setForm(null);
    setEditing(false);
  };

  const update = (field: keyof Vaccination, value: any) => {
    setForm(prev => (prev ? { ...prev, [field]: value } : prev));
  };

  const handleTypeChange = (value: VaccineType) => {
    const defaults = getDefaults(value);

    const dueDate =
      value === 'rabies_1_year'
        ? buildDueDate(1)
        : value === 'rabies_3_year'
        ? buildDueDate(3)
        : '';

    setForm(prev =>
      prev
        ? {
            ...prev,
            vaccine_type: value,
            date_time_due: dueDate,

            product: defaults?.default_product ?? '',
            manufacturer: defaults?.default_manufacturer ?? '',
            lot_number: defaults?.default_lot_number ?? '',
            product_expiration_date:
              defaults?.default_product_expiration_date ?? ''
          }
        : prev
    );
  };

  const updateField = (field: keyof Vaccination, value: any) => {
    update(field, value);
  };

  // -----------------------------
  // SAVE
  // -----------------------------
  const saveVaccination = async () => {
    if (!form) return;

    try {
      const payload = {
        ...form,

        vaccine_type: clean(form.vaccine_type),
        product: clean(form.product),
        lot_number: clean(form.lot_number),
        rabies_tag_number: clean(form.rabies_tag_number),
        product_expiration_date: clean(form.product_expiration_date),

        vaccinated_by: clean(form.vaccinated_by),
        supervising_veterinarian: clean(form.supervising_veterinarian),

        date_time_due: clean(form.date_time_due),
        date_time_administered: clean(form.date_time_administered)
      };

      await api.put(`/vaccinations/${form.id}`, payload);

      updateAnimalLocal(animal.id, 'vaccinations', [form]);

      setEditing(false);
      setForm(null);
    } catch (err) {
      console.error(err);
      alert('Failed to update vaccination');
    }
  };

  const active = form || vaccination;

  // -----------------------------
  // COLUMN WIDTHS
  // -----------------------------
  const colStyle = {
    tag: { minWidth: '90px' },
    type: { minWidth: '110px' },
    product: { minWidth: '140px' },
    lot: { minWidth: '105px' },
    date: { minWidth: '115px' },
    vet: { minWidth: '140px' },
    exp: { minWidth: '135px' }
  };

  const vaccineCard = (
      <div className="animal-vaccine-card">
        <Card style={{
          width: '100%',
          margin: 0,
        }}>
        <Card.Body>
          <div className={`vaccine-toolbar d-flex justify-content-start mb-2 gap-2 ${isMobile ? 'vaccine-toolbar-mobile' : ''}`}>
            {editing && (
              <>
                <Button
                  size="sm"
                  variant="outline-secondary"
                  onClick={cancelEdit}
                  className="text-nowrap"
                >
                  <FontAwesomeIcon icon={faTimes} /> Cancel
                </Button>

                <Button
                  size="sm"
                  variant="outline-danger"
                  onClick={() => setShowDeleteModal(true)}
                  className="text-nowrap"
                >
                  <FontAwesomeIcon icon={faTrashAlt} /> Delete
                </Button>
              </>
            )}

            <Button
              size="sm"
              variant={editing ? 'success' : 'outline-primary'}
              onClick={() => {
                if (editing) {
                  saveVaccination();
                } else {
                  startEdit();
                }
              }}
              className="text-nowrap"
            >
              {editing ? (
                <>
                  <FontAwesomeIcon icon={faSave} /> Save
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={faEdit} /> Edit Vaccine
                </>
              )}
            </Button>
          </div>

          <Table
            size="sm"
            bordered
            className={isMobile ? 'vaccine-table-mobile' : 'vaccine-table-desktop'}
            style={{
              tableLayout: 'auto',
              width: 'max-content',
              marginBottom: 0
            }}
          >
            <thead>
              <tr>
                <th style={colStyle.tag}>Tag #</th>
                <th style={colStyle.type}>Type</th>
                <th style={colStyle.product}>Product</th>
                <th style={colStyle.lot}>Lot #</th>
                <th style={colStyle.date}>Administered</th>
                <th style={colStyle.date}>Next Due</th>
                <th style={colStyle.vet}>Vaccinated By</th>
                <th style={colStyle.exp}>Product Expiration</th>
              </tr>
            </thead>

            <tbody>
              <tr>
                <td>
                  {editing ? (
                    <Form.Control
                      inputMode="numeric"
                      pattern="[0-9]*"
                      size="sm"
                      value={active.rabies_tag_number || ''}
                      onChange={e =>
                        updateField('rabies_tag_number', e.target.value)
                      }
                    />
                  ) : (
                    active.rabies_tag_number || '-'
                  )}
                </td>

                <td>
                  {editing ? (
                    <Form.Select
                      size="sm"
                      value={active.vaccine_type || ''}
                      onChange={e =>
                        handleTypeChange(e.target.value as VaccineType)
                      }
                    >
                      <option value=""></option>

                      {clinic?.offerings?.rabies_1_year?.enabled && (
                        <option value="rabies_1_year">1 Year</option>
                      )}

                      {clinic?.offerings?.rabies_3_year?.enabled && (
                        <option value="rabies_3_year">3 Year</option>
                      )}
                    </Form.Select>
                  ) : (
                    active.vaccine_type?.includes('1_year')
                      ? '1 Year'
                      : active.vaccine_type?.includes('3_year')
                      ? '3 Year'
                      : '-'
                  )}
                </td>

                <td>
                  {editing ? (
                    <Form.Select
                      size="sm"
                      value={active.product || ''}
                      onChange={e => {
                        const value = e.target.value;
                        const match = RABIES_PRODUCT_MANUFACTURER.find(
                          p => p.product === value
                        );

                        updateField('product', value);
                        updateField('manufacturer', match?.manufacturer || '');
                      }}
                    >
                      <option value=""></option>
                      {RABIES_PRODUCT_MANUFACTURER.map(p => (
                        <option
                          key={`${p.product}-${p.manufacturer}`}
                          value={p.product}
                        >
                          {p.product}
                        </option>
                      ))}
                    </Form.Select>
                  ) : (
                    active.product
                  )}
                </td>

                <td>
                  {editing ? (
                    <Form.Control
                      inputMode="numeric"
                      pattern="[0-9]*"
                      size="sm"
                      value={active.lot_number || ''}
                      onChange={e =>
                        updateField('lot_number', e.target.value)
                      }
                    />
                  ) : (
                    active.lot_number || '-'
                  )}
                </td>

                <td>
                  {editing ? (
                    <Form.Control
                      size="sm"
                      type="date"
                      value={formatDateOnly(active.date_time_administered)}
                      onChange={e =>
                        updateField('date_time_administered', e.target.value)
                      }
                    />
                  ) : (
                    formatDisplayDate(active.date_time_administered)
                  )}
                </td>

                <td>
                  {editing ? (
                    <Form.Control
                      size="sm"
                      type="date"
                      value={formatDateOnly(active.date_time_due)}
                      onChange={e =>
                        updateField('date_time_due', e.target.value)
                      }
                    />
                  ) : (
                    formatDisplayDate(active.date_time_due)
                  )}
                </td>

                <td>
                  {editing ? (
                    <Form.Select
                      size="sm"
                      value={active.vaccinated_by || ''}
                      onChange={e =>
                        updateField('vaccinated_by', e.target.value)
                      }
                    >
                      <option value=""></option>
                      {users.map(u => (
                        <option key={u.id} value={u.name}>
                          {u.name}
                        </option>
                      ))}
                    </Form.Select>
                  ) : (
                    active.vaccinated_by || '-'
                  )}
                </td>

                <td>
                  {editing ? (
                    <Form.Control
                      size="sm"
                      type="date"
                      value={formatDateOnly(active.product_expiration_date)}
                      onChange={e =>
                        updateField('product_expiration_date', e.target.value)
                      }
                    />
                  ) : (
                    formatDisplayDate(active.product_expiration_date)
                  )}
                </td>
              </tr>
            </tbody>
          </Table>
        </Card.Body>
      </Card>
    </div>
  );

  return (
    <>
      {isMobile ? (
        <div className="animal-mobile-vaccine-content">
          {vaccineCard}
        </div>
      ) : (
       <tr className="animal-vaccine-row">
        <td
          colSpan={13}
          style={{
            padding: 0,
            width: '100%',
          }}
        >
          {vaccineCard}
        </td>
</tr>
      )}

      <DeleteVaccineModal
        show={showDeleteModal}
        onHide={() => setShowDeleteModal(false)}
        vaccination={vaccination}
        onDeleted={async () => {
          try {
            await api.delete(`/vaccinations/${vaccination.id}`);

            updateAnimalLocal(animal.id, 'vaccinations', []);
            setEditing(false);
            setForm(null);
            setShowDeleteModal(false);
          } catch (err) {
            console.error('Error deleting vaccination entry:', err);
            alert('Failed to delete vaccination record from the database.');
          }
        }}
      />
    </>
  );
}