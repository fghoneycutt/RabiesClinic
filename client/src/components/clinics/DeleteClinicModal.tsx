// components/modals/DeleteClinicModal.tsx

import { useState, useEffect } from 'react';

import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';

type Props = {
  show: boolean;
  onHide: () => void;

  clinicId: string;
  clinicName: string;

  onDelete: () => Promise<void>;
};

export default function DeleteClinicModal({
  show,
  onHide,
  clinicId,
  clinicName,
  onDelete
}: Props) {

  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (show) {
      setConfirmed(false);
      setLoading(false);
    }
  }, [show]);

  const handleDelete = async () => {
    try {
      setLoading(true);

      await onDelete();

      onHide();

    } catch (err) {
      console.error(err);
      alert('Failed to delete clinic');

    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      show={show}
      onHide={onHide}
      centered
    >
      <Modal.Header closeButton>
        <Modal.Title>
          Delete Clinic
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>

        <p className="mb-4">
          Are you sure you want to delete{' '}
          <strong>{clinicName}</strong>? This cannot be undone. 
        </p>

        <Form.Check
          type="checkbox"
          id="confirm-delete-clinic"
          checked={confirmed}
          onChange={(e) =>
            setConfirmed(e.target.checked)
          }
          label={`Yes, I want to delete "${clinicName}"`}
        />

      </Modal.Body>

      <Modal.Footer>

        <Button
          variant="secondary"
          onClick={onHide}
          disabled={loading}
        >
          Cancel
        </Button>

        <Button
          variant="danger"
          onClick={handleDelete}
          disabled={!confirmed || loading}
        >
          {loading
            ? 'Deleting...'
            : 'Delete Clinic'}
        </Button>

      </Modal.Footer>
    </Modal>
  );
}