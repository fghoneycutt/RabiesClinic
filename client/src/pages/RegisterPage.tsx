import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { registerUser } from '../api/api';

import Card from 'react-bootstrap/Card';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';

export default function RegisterPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'staff'>('staff');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    setLoading(true);
    setError('');

    try {
      await registerUser({
        email,
        password,
        role
      });

      alert('User created successfully');

      navigate('/login');

    } catch (err: any) {
      setError(
        err?.response?.data?.error ||
          'Failed to register user'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="d-flex justify-content-center">
      <Card style={{ width: 400 }}>
        <Card.Body>

          <h4 className="mb-3">
            Create User
          </h4>

          <Form.Group className="mb-3">
            <Form.Label>Email</Form.Label>
            <Form.Control
              value={email}
              onChange={e =>
                setEmail(e.target.value)
              }
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Password</Form.Label>
            <Form.Control
              type="password"
              value={password}
              onChange={e =>
                setPassword(e.target.value)
              }
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Role</Form.Label>
            <Form.Select
              value={role}
              onChange={e =>
                setRole(
                  e.target.value as
                    | 'admin'
                    | 'staff'
                )
              }
            >
              <option value="staff">
                Staff
              </option>
              <option value="admin">
                Admin
              </option>
            </Form.Select>
          </Form.Group>

          {error && (
            <p className="text-danger">
              {error}
            </p>
          )}

          <Button
            onClick={submit}
            disabled={loading}
            className="w-100"
          >
            {loading
              ? 'Creating...'
              : 'Create User'}
          </Button>

        </Card.Body>
      </Card>
    </div>
  );
}