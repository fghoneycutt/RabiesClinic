import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';

import type { Vaccination } from '../../types/intake';

type Props = {
  show: boolean;
  onHide: () => void;

  vaccination: Vaccination;

  onDeleted: () => void; // parent handles delete + API + state
};

export default function DeleteVaccineModal({
  show,
  onHide,
  vaccination,
  onDeleted
}: Props) {
  const handleConfirm = () => {
    onDeleted();
    onHide();
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>Delete Vaccine</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        Are you sure you want to delete this vaccination record?

        <div className="mt-2">
          <strong>Type:</strong>{' '}
          {vaccination.vaccine_type === 'rabies_1_year'
            ? '1 Year Rabies'
            : vaccination.vaccine_type === 'rabies_3_year'
            ? '3 Year Rabies'
            : vaccination.vaccine_type || '-'}
        </div>

        <div>
          <strong>Lot #:</strong> {vaccination.lot_number || '-'}
        </div>

        <div>
          <strong>Tag #:</strong> {vaccination.rabies_tag_number || '-'}
        </div>
      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Cancel
        </Button>

        <Button variant="danger" onClick={handleConfirm}>
          Delete
        </Button>
      </Modal.Footer>
    </Modal>
  );
}