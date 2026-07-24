import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import Table from 'react-bootstrap/Table';
import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';
import Spinner from 'react-bootstrap/Spinner';
import Alert from 'react-bootstrap/Alert';
import Form from 'react-bootstrap/Form';

import { api } from '../api/api';

import DeleteUserModal from '../components/users/DeleteUserModal';

type User = {
  id: string;
  name: string | null;
  email: string;
  role: 'admin' | 'staff';
  license_number: string | null;
  signature?: boolean;
};

export default function AdminUserListPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // States for handling localized inline editing
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<User>>({});
  const [saveLoading, setSaveLoading] = useState(false);
  const [uploadingSignatureId, setUploadingSignatureId] = useState<string | null>(null);
  const [signatureSuccessId, setSignatureSuccessId] = useState<string | null>(null);
  const [signatureUrls, setSignatureUrls] = useState<Record<string, string>>({});

  const [deleteUserTarget, setDeleteUserTarget] = useState<User | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  document.title="Users"

  useEffect(() => {
    loadUsers();
  }, []);
  useEffect(() => {
    return () => {
      Object.values(signatureUrls).forEach(URL.revokeObjectURL);
    };
  }, [signatureUrls]);

  const loadSignatures = async (users: User[]) => {
    const urls: Record<string, string> = {};

    await Promise.all(
      users.map(async user => {
        if (!user.signature) return;

        try {
          const res = await api.get(
            `/users/${user.id}/signature`,
            {
              responseType: 'blob'
            }
          );

          urls[user.id] = URL.createObjectURL(res.data);

        } catch (err) {
          console.error(
            `Failed loading signature for ${user.name}`,
            err
          );
        }
      })
    );

    setSignatureUrls(prev => {
      Object.values(prev).forEach(URL.revokeObjectURL);
      return urls;
    });
  };

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/users');
      setUsers(res.data);
      await loadSignatures(res.data);
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  // Triggers row editing conversion by initializing raw table fields into matching local input states
  const startEdit = (user: User) => {
    setEditingId(user.id);
    setEditForm({
      name: user.name || '',
      email: user.email,
      role: user.role,
      license_number: user.license_number || ''
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  // Async inline save operation
  const editUser = async (id: string) => {
    try {
      setSaveLoading(true);
      setError(null);

      // Sending updated fields to backend route
      const res = await api.put(`/users/${id}`, {
        name: editForm.name,
        email: editForm.email,
        role: editForm.role,
        license_number: editForm.license_number || null
      });

      // Update state locally with data returned from server to avoid a heavy page reload
      setUsers(prev => prev.map(u => (u.id === id ? res.data : u)));
      setEditingId(null);
      setEditForm({});
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.message || 'Failed to save user updates');
    } finally {
      setSaveLoading(false);
    }
  };

  const deleteUser = async () => {
    if (!deleteUserTarget) return;

    try {
      setDeleteLoading(true);
      setError(null);

      await api.delete(
        `/users/${deleteUserTarget.id}`
      );

      setUsers(prev =>
        prev.filter(
          user => user.id !== deleteUserTarget.id
        )
      );

      setEditingId(null);
      setEditForm({});
      setDeleteUserTarget(null);

    } catch (err: any) {
      console.error(err);

      setError(
        err?.response?.data?.message ||
        'Failed to delete user'
      );

    } finally {
      setDeleteLoading(false);
    }
  };

  const uploadSignature = async (
    id: string,
    file: File
  ) => {
    try {
      setUploadingSignatureId(id);

      const formData = new FormData();
      formData.append('signature', file);

      await api.post(
        `/users/${id}/signature`,
        formData
      );
      const res = await api.get(
        `/users/${id}/signature`,
        {
          responseType: 'blob'
        }
      );

      setSignatureUrls(prev => {
        if (prev[id]) {
          URL.revokeObjectURL(prev[id]);
        }

        return {
          ...prev,
          [id]: URL.createObjectURL(res.data)
        };
      });

      setSignatureSuccessId(id);

      setTimeout(() => {
        setSignatureSuccessId(null);
      }, 2000);

    } catch (err: any) {
      console.error(err);
      setError(
        err?.response?.data?.message || 'Failed to upload signature'
      );
    } finally {
      setUploadingSignatureId(null);
    }
  };

  return (
    <Card>
      <Card.Body>
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h3 className="mb-0">User Management</h3>

          <Link to="/admin/create-users" style={{ textDecoration: 'none' }}>
            <Button>Create User</Button>
          </Link>
        </div>

        {loading && (
          <div className="text-center py-4">
            <Spinner animation="border" />
          </div>
        )}

        {error && <Alert variant="danger">{error}</Alert>}

        {!loading && !error && (
          <Table striped bordered hover responsive className="align-middle">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>License Number</th>
                <th>Signature</th>
                <th style={{ width: 120 }} className="text-center">Actions</th>
              </tr>
            </thead>

            <tbody>
              {users.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center">
                    No users found
                  </td>
                </tr>
              )}

              {users.map(user => {
                const isEditing = editingId === user.id;
                const signatureInputId = `signature-upload-${user.id}`;

                return (
                  <tr key={user.id}>
                    {/* NAME */}
                    <td>
                      {isEditing ? (
                        <Form.Control
                          size="sm"
                          value={editForm.name || ''}
                          onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                        />
                      ) : (
                        user.name || '-'
                      )}
                    </td>

                    {/* EMAIL */}
                    <td>
                      {isEditing ? (
                        <Form.Control
                          size="sm"
                          type="email"
                          value={editForm.email || ''}
                          onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                        />
                      ) : (
                        user.email
                      )}
                    </td>

                    {/* ROLE */}
                    <td className="text-capitalize">
                      {isEditing ? (
                        <Form.Select
                          size="sm"
                          value={editForm.role}
                          onChange={e => setEditForm({ ...editForm, role: e.target.value as any })}
                        >
                          <option value="staff">Staff</option>
                          <option value="admin">Admin</option>
                        </Form.Select>
                      ) : (
                        user.role
                      )}
                    </td>

                    {/* LICENSE NUMBER */}
                    <td>
                      {isEditing ? (
                        <Form.Control
                          size="sm"
                          value={editForm.license_number || ''}
                          onChange={e => setEditForm({ ...editForm, license_number: e.target.value })}
                          placeholder="N/A"
                        />
                      ) : (
                        user.license_number || '-'
                      )}
                    </td>
                    {/* SIGNATURE */}
                    <td className="text-center">
                      {user.signature ? (
                        <img
                          src={signatureUrls[user.id]}
                          alt={`${user.name || 'User'} signature`}
                          style={{
                            maxWidth: '120px',
                            maxHeight: '50px',
                            objectFit: 'contain'
                          }}
                        />
                      ) : (
                        <span className="text-muted">
                          No signature
                        </span>
                      )}
                    </td>

                    {/* INLINE ACTIONS */}
                    <td className="text-center">
                      {isEditing ? (
                        <div className="d-flex justify-content-center gap-2">

                          <Button
                            size="sm"
                            variant="success"
                            onClick={() => editUser(user.id)}
                            disabled={saveLoading}
                            title="Save Changes"
                          >
                            <i className="fas fa-save"></i>
                          </Button>


                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={cancelEdit}
                            disabled={saveLoading}
                            title="Cancel"
                          >
                            <i className="fas fa-times"></i>
                          </Button>


                          <Button
                            size="sm"
                            variant="outline-danger"
                            onClick={() => setDeleteUserTarget(user)}
                            disabled={saveLoading}
                            title="Delete User"
                          >
                            <i className="fas fa-trash-alt"></i>
                          </Button>

                        </div>
                      ) : (
                        <div className="d-flex justify-content-center gap-2">

                          <Button
                            size="sm"
                            variant="outline-primary"
                            onClick={() => startEdit(user)}
                            disabled={editingId !== null}
                            title="Edit User"
                          >
                            <i className="fas fa-edit"></i>
                          </Button>

                          <Button
                            size="sm"
                            variant="outline-success"
                            disabled={uploadingSignatureId === user.id}
                            title="Upload Signature"
                            onClick={() =>
                              document
                                .getElementById(signatureInputId)
                                ?.click()
                            }
                          >
                            {uploadingSignatureId === user.id ? (
                            <Spinner
                              animation="border"
                              size="sm"
                            />
                          ) : signatureSuccessId === user.id ? (
                            <i className="fas fa-check"></i>
                          ) : (
                            <i className="fas fa-file-signature"></i>
                          )}
                          </Button>

                          <Form.Control
                            id={signatureInputId}
                            type="file"
                            accept="image/png,image/jpeg"
                            style={{ display: 'none' }}
                            onChange={e => {
                              const file =
                                (e.target as HTMLInputElement)
                                  .files?.[0];

                              if (file) {
                                uploadSignature(user.id, file);
                              }
                            }}
                          />

                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
        <DeleteUserModal
          show={deleteUserTarget !== null}
          onHide={() => setDeleteUserTarget(null)}
          userName={deleteUserTarget?.name || ''}
          userEmail={deleteUserTarget?.email || ''}
          onDeleted={deleteUser}
          deleting={deleteLoading}
        />
      </Card.Body>
    </Card>
  );
}