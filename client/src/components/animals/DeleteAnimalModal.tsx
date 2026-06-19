import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';

import type { Animal } from '../../types/intake';

type Props = {
  show: boolean;
  onHide: () => void;

  animal: Animal;

  onDeleted: () => void;
};

export default function DeleteAnimalModal({
  show,
  onHide,
  animal,
  onDeleted
}: Props) {
  const handleDelete = () => {
    onDeleted();   // parent does API call
    onHide();
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>Delete Animal</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        Are you sure you want to delete{' '}
        <strong>{animal.name}</strong>?
      </Modal.Body>

      <Modal.Footer>
        <Button
          variant="secondary"
          onClick={onHide}
        >
          Cancel
        </Button>

        <Button
          variant="danger"
          onClick={handleDelete}
        >
          Delete
        </Button>
      </Modal.Footer>
    </Modal>
  );
}