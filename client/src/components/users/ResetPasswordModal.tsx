import { useEffect, useState } from 'react';

import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';
import Alert from 'react-bootstrap/Alert';

import PasswordInput from '../input/PasswordInput';

type Props = {
  show: boolean;
  onHide: () => void;
  userName: string;
  onReset: (password: string) => Promise<void>;
  resetting: boolean;
};

export default function ResetPasswordModal({
  show,
  onHide,
  userName,
  onReset,
  resetting
}: Props) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (show) {
      setPassword('');
      setConfirmPassword('');
      setError(null);
    }
  }, [show]);

  async function handleSubmit() {
    setError(null);

    if (!password.trim()) {
      setError('Password is required.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      await onReset(password);
      onHide();
    } catch {
      // Parent component handles API errors.
    }
  }

  return (
    <Modal
      show={show}
      onHide={onHide}
      centered
    >
      <Modal.Header closeButton>
        <Modal.Title>
          Reset Password
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        <p>
          Enter a new password for{' '}
          <strong>{userName}</strong>.
        </p>

        {error && (
          <Alert variant="danger">
            {error}
          </Alert>
        )}

        <PasswordInput
          label="New Password"
          value={password}
          onChange={setPassword}
          required
          autoComplete="new-password"
        />

        <PasswordInput
          label="Confirm Password"
          value={confirmPassword}
          onChange={setConfirmPassword}
          required
          autoComplete="new-password"
        />
      </Modal.Body>

      <Modal.Footer>
        <Button
          variant="secondary"
          onClick={onHide}
          disabled={resetting}
        >
          Cancel
        </Button>

        <Button
          variant="primary"
          onClick={handleSubmit}
          disabled={resetting}
        >
          {resetting
            ? 'Resetting...'
            : 'Reset Password'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}