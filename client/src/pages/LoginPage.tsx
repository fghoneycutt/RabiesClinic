import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

import Card from 'react-bootstrap/Card';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';

export default function LoginPage() {

  document.title="Login"
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as any)?.from?.pathname || '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);

    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      alert('Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="d-flex justify-content-center mt-5">
      <Card style={{ width: 400 }}>
        <Card.Body>

          <h3 className="mb-3">Login</h3>

          <Form.Group className="mb-3">
            <Form.Label>Email</Form.Label>
            <Form.Control
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Password</Form.Label>
            <Form.Control
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
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