import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

import Card from 'react-bootstrap/Card';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Alert from 'react-bootstrap/Alert';

import PasswordInput from '../components/input/PasswordInput';

export default function LoginPage() {
  document.title = 'Login';

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as any)?.from?.pathname || '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setLoading(true);
    setError('');

    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch {
      setError('Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="d-flex justify-content-center mt-5">
      <Card style={{ width: 400 }}>
        <Card.Body>

          <h3 className="mb-3">Login</h3>

          {error && (
            <Alert variant="danger">
              {error}
            </Alert>
          )}

          <Form.Group className="mb-3">
            <Form.Label>Email</Form.Label>

            <Form.Control
              type="email"
              value={email}
              autoComplete="username"
              onChange={(e) => setEmail(e.target.value)}
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <PasswordInput
              label="Password"
              value={password}
              required
              autoComplete="current-password"
              onChange={setPassword}
            />
          </Form.Group>

          <Button
            className="w-100"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? 'Logging in...' : 'Login'}
          </Button>

        </Card.Body>
      </Card>
    </div>
  );
}