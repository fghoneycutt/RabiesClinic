import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';

import type { Owner } from '../../types/intake';

type Props = {
  show: boolean;
  onHide: () => void;
  owner: Owner;
  onDeleted: () => void;
};

export default function DeleteOwnerModal({
  show,
  onHide,
  owner,
  onDeleted
}: Props) {

  return (
    <Modal
      show={show}
      onHide={onHide}
      centered
    >

      <Modal.Header closeButton>
        <Modal.Title>
          <i className="fas fa-exclamation-triangle text-danger me-2"></i>
          Delete Owner Profile
        </Modal.Title>
      </Modal.Header>


      <Modal.Body>

        <p>
          Are you sure you want to delete:
        </p>

        <p className="fw-bold">
          {owner.first_name} {owner.last_name}
        </p>

        <p className="text-danger mb-0">
          This will permanently delete the owner profile,
          all associated animals, and vaccination records.
          This action cannot be undone.
        </p>

      </Modal.Body>


      <Modal.Footer>

        <Button
          variant="outline-secondary"
          onClick={onHide}
        >
          Cancel
        </Button>


        <Button
          variant="danger"
          onClick={() => {
            onDeleted();
            onHide();
          }}
        >
          <i className="fas fa-trash-alt me-1"></i>
          Delete Permanently
        </Button>

      </Modal.Footer>

    </Modal>
  );
}