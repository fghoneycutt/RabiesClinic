import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';
import Spinner from 'react-bootstrap/Spinner';

type Props = {
  show: boolean;
  onHide: () => void;
  userName: string;
  userEmail: string;
  onDeleted: () => Promise<void> | void;
  deleting?: boolean;
};

export default function DeleteUserModal({
  show,
  onHide,
  userName,
  userEmail,
  onDeleted,
  deleting = false
}: Props) {

  const handleDelete = async () => {
    await onDeleted();
  };


  return (
    <Modal
      show={show}
      onHide={onHide}
      centered
    >

      <Modal.Header closeButton>
        <Modal.Title className="text-danger">
          <i className="fas fa-user-slash me-2"></i>
          Delete User
        </Modal.Title>
      </Modal.Header>


      <Modal.Body>

        <p>
          Are you sure you want to delete this user?
        </p>


        <div className="border rounded p-3 bg-light">

          <strong>
            {userName || 'Unnamed User'}
          </strong>

          <br />

          <span className="text-muted">
            {userEmail}
          </span>

        </div>


        <p className="mt-3 mb-0 text-danger small">
          This action cannot be undone.
        </p>

      </Modal.Body>


      <Modal.Footer>

        <Button
          variant="secondary"
          onClick={onHide}
          disabled={deleting}
        >
          Cancel
        </Button>


        <Button
          variant="danger"
          onClick={handleDelete}
          disabled={deleting}
        >

          {deleting ? (
            <>
              <Spinner
                animation="border"
                size="sm"
                className="me-2"
              />
              Deleting...
            </>
          ) : (
            <>
              <i className="fas fa-trash-alt me-2"></i>
              Delete User
            </>
          )}

        </Button>

      </Modal.Footer>

    </Modal>
  );
}