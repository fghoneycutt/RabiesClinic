import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/api';

import PasswordInput from '../components/input/PasswordInput';

import Card from 'react-bootstrap/Card';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';

export default function AdminCreateUserPage() {
  const navigate = useNavigate();
  document.title="Create User"

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'staff' | 'admin'>('staff');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [signature, setSignature] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createUser = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await api.post('/auth/register', {
        email,
        password,
        name,
        role,
        license_number: licenseNumber
      });

      if (signature) {
        const formData = new FormData();
        formData.append('signature', signature);

        await api.post(
          `/users/${res.data.id}/signature`,
          formData
        );
      }

      navigate('/admin/users');

    } catch (err: any) {
      console.error(err);
      setError(
        err?.response?.data?.message || 'Failed to create user'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      <Card>
        <Card.Body>

          <h4 className="mb-3">Create Staff User</h4>

          <Form.Group className="mb-2">
            <Form.Label>Name</Form.Label>
            <Form.Control value={name} onChange={e => setName(e.target.value)} />
          </Form.Group>

          <Form.Group className="mb-2">
            <Form.Label>Email</Form.Label>
            <Form.Control value={email} onChange={e => setEmail(e.target.value)} />
          </Form.Group>

          {/* PASSWORD FIELD - FIXED FOR CUSTOM PROPS */}
          <Form.Group className="mb-2">
            <PasswordInput
              label="Password"
              value={password}
              onChange={(val) => setPassword(val)}
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Role</Form.Label>
            <Form.Select
              value={role}
              onChange={e => setRole(e.target.value as any)}
            >
              <option value="staff">Staff</option>
              <option value="admin">Admin</option>
            </Form.Select>
          </Form.Group>

          {/* LICENSE NUMBER FIELD */}
          <Form.Group className="mb-3">
            <Form.Label>License Number</Form.Label>
            <Form.Control 
              type="text"
              value={licenseNumber} 
              onChange={e => setLicenseNumber(e.target.value)} 
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Signature (Optional)</Form.Label>
            <Form.Control
              type="file"
              accept="image/png,image/jpeg"
              onChange={e => {
                const file = (e.target as HTMLInputElement).files?.[0] ?? null;
                setSignature(file);
              }}
            />
            <Form.Text muted>
              Upload a scanned signature (PNG or JPEG).
            </Form.Text>
          </Form.Group>

          <Button onClick={createUser} disabled={loading}>
            {loading ? 'Creating...' : 'Create User'}
          </Button>

          {error && (
            <p className="mt-3 mb-0 text-danger">
              {error}
            </p>
          )}

        </Card.Body>
      </Card>
    </div>
  );
}