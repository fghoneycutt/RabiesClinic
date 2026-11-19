
import { useEffect, useRef, useState } from 'react';
import {
  Badge,
  Button,
  Card,
  Col,
  Form,
  Modal,
  Row,
  Spinner,
  Toast,
  ToastContainer
} from 'react-bootstrap';

import {
  FaEdit,
  FaPowerOff,
  FaTrash
} from 'react-icons/fa';

import {
  api,
  getLobbySlides,
  createLobbySlide,
  updateLobbySlide,
  deleteLobbySlide
} from '../../api/api';

import type { LobbySlide } from '../../api/api';

function LobbySlides() {
  document.title = 'Lobby Slides';

  const [slides, setSlides] = useState<LobbySlide[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [editingSlide, setEditingSlide] = useState<LobbySlide | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [active, setActive] = useState(true);
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [displayOrder, setDisplayOrder] = useState(0);
  const [durationSeconds, setDurationSeconds] = useState(15);

  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastVariant, setToastVariant] = useState<'success' | 'danger'>('success');

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [slideToDelete, setSlideToDelete] = useState<LobbySlide | null>(null);
  const [deletingSlide, setDeletingSlide] = useState(false);

  const notify = (
    message: string,
    variant: 'success' | 'danger' = 'success'
  ) => {
    setToastMessage(message);
    setToastVariant(variant);
    setShowToast(true);
  };

  const loadSlides = async () => {
    try {
      setLoading(true);

      const data = await getLobbySlides();
      setSlides(data);
    } catch (err) {
      console.error('Error loading lobby slides:', err);
      notify('Unable to load lobby slides.', 'danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSlides();
  }, []);

  useEffect(() => {
    return () => {
      if (imagePreview.startsWith('blob:')) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setActive(true);
    setStartsAt('');
    setEndsAt('');
    setDisplayOrder(slides.length);
    setDurationSeconds(15);
    setImageFile(null);
    setImagePreview('');

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const openCreateModal = () => {
    setEditingSlide(null);
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (slide: LobbySlide) => {
    setEditingSlide(slide);

    setTitle(slide.title);
    setDescription(slide.description || '');
    setActive(slide.active);
    setStartsAt(toDateTimeLocal(slide.starts_at));
    setEndsAt(toDateTimeLocal(slide.ends_at));
    setDisplayOrder(slide.display_order);
    setDurationSeconds(slide.duration_seconds);

    setImageFile(null);
    setImagePreview(slide.image_url);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    setShowModal(true);
  };

  const toDateTimeLocal = (value: string | null) => {
    if (!value) return '';

    const date = new Date(value);

    const offset = date.getTimezoneOffset();
    const localDate = new Date(date.getTime() - offset * 60000);

    return localDate.toISOString().slice(0, 16);
  };

  const handleImageChange = (file: File | null) => {
    setImageFile(file);

    if (!file) {
      setImagePreview(editingSlide?.image_url || '');
      return;
    }

    if (imagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(imagePreview);
    }

    setImagePreview(URL.createObjectURL(file));
  };

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!title.trim()) {
      notify('Please enter a slide title.', 'danger');
      return;
    }

    if (!editingSlide && !imageFile) {
      notify('Please select an image for this slide.', 'danger');
      return;
    }

    if (startsAt && endsAt && new Date(endsAt) <= new Date(startsAt)) {
      notify('The end date must be later than the start date.', 'danger');
      return;
    }

    if (durationSeconds < 1 || durationSeconds > 300) {
      notify('Display duration must be between 1 and 300 seconds.', 'danger');
      return;
    }

    try {
      setSaving(true);

      if (editingSlide) {
        await updateLobbySlide(editingSlide.id, {
          title: title.trim(),
          description: description.trim() || null,
          active,
          starts_at: startsAt
            ? new Date(startsAt).toISOString()
            : null,
          ends_at: endsAt
            ? new Date(endsAt).toISOString()
            : null,
          display_order: Number(displayOrder),
          duration_seconds: Number(durationSeconds)
        });

        if (imageFile) {
          const formData = new FormData();
          formData.append('image', imageFile);

          await api.put(
            `/slides/${editingSlide.id}/image`,
            formData
          );
        }

        notify('Slide updated successfully.');
      } else {
        const formData = new FormData();

        formData.append('image', imageFile!);
        formData.append('title', title.trim());
        formData.append('description', description.trim());
        formData.append('active', String(active));
        formData.append(
          'starts_at',
          startsAt ? new Date(startsAt).toISOString() : ''
        );
        formData.append(
          'ends_at',
          endsAt ? new Date(endsAt).toISOString() : ''
        );
        formData.append('display_order', String(displayOrder));
        formData.append('duration_seconds', String(durationSeconds));

        await createLobbySlide(formData);

        notify('Slide created successfully.');
      }

      setShowModal(false);
      resetForm();
      await loadSlides();
    } catch (err: any) {
      console.error('Error saving lobby slide:', err);

      notify(
        err?.response?.data?.message ||
        'Unable to save the slide. Please try again.',
        'danger'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (slide: LobbySlide) => {
    setSlideToDelete(slide);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!slideToDelete) return;

    try {
      setDeletingSlide(true);

      await deleteLobbySlide(slideToDelete.id);

      setShowDeleteModal(false);
      setSlideToDelete(null);

      notify('Slide deleted successfully.');
      await loadSlides();
    } catch (err: any) {
      console.error('Error deleting lobby slide:', err);

      notify(
        err?.response?.data?.message ||
        'Unable to delete the slide.',
        'danger'
      );
    } finally {
      setDeletingSlide(false);
    }
  };

  const handleToggleActive = async (slide: LobbySlide) => {
    try {
      await updateLobbySlide(slide.id, {
        active: !slide.active
      });

      notify(
        slide.active
          ? 'Slide deactivated successfully.'
          : 'Slide activated successfully.'
      );

      await loadSlides();
    } catch (err: any) {
      console.error('Error updating slide status:', err);

      notify(
        err?.response?.data?.message ||
        'Unable to update slide status.',
        'danger'
      );
    }
  };

  const formatDate = (value: string | null) => {
    if (!value) return 'No date set';

    return new Date(value).toLocaleString();
  };

  const getScheduleText = (slide: LobbySlide) => {
    if (!slide.starts_at && !slide.ends_at) {
      return 'Permanent slide';
    }

    if (slide.starts_at && slide.ends_at) {
      return `${formatDate(slide.starts_at)} – ${formatDate(slide.ends_at)}`;
    }

    if (slide.starts_at) {
      return `Starts ${formatDate(slide.starts_at)}`;
    }

    return `Ends ${formatDate(slide.ends_at)}`;
  };

  return (
    <>
      <ToastContainer
        position="top-end"
        className="p-3"
        style={{ zIndex: 9999 }}
      >
        <Toast
          show={showToast}
          onClose={() => setShowToast(false)}
          delay={toastVariant === 'success' ? 3000 : 5000}
          autohide
          bg={toastVariant}
        >
          <Toast.Header>
            <strong className="me-auto">ShelterHelper</strong>
          </Toast.Header>
          <Toast.Body className="text-white">
            {toastMessage}
          </Toast.Body>
        </Toast>
      </ToastContainer>

      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
        <div>
          <h2 className="mb-1">Lobby Slides</h2>
          <p className="text-muted mb-0">
            Manage custom slides displayed alongside adoptable animals on the lobby TV.
          </p>
        </div>

        <Button onClick={openCreateModal}>
          + Add Slide
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-5">
          <Spinner animation="border" />
          <p className="text-muted mt-2">Loading slides...</p>
        </div>
      ) : slides.length === 0 ? (
        <Card className="text-center p-5">
          <h5>No lobby slides yet</h5>
          <p className="text-muted">
            Add your first custom slide to get started.
          </p>
          <div>
            <Button onClick={openCreateModal}>
              Add Your First Slide
            </Button>
          </div>
        </Card>
      ) : (
        <Row className="g-4">
          {slides.map((slide) => (
            <Col key={slide.id} xs={12} md={6} xl={4}>
              <Card className="h-100 shadow-sm">
                <div
                  style={{
                    height: '210px',
                    backgroundColor: '#eee',
                    overflow: 'hidden'
                  }}
                >
                  <Card.Img
                    src={slide.image_url}
                    alt={slide.title}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain'
                    }}
                  />
                </div>

                <Card.Body className="d-flex flex-column">
                  <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
                    <Card.Title className="mb-0">
                      {slide.title}
                    </Card.Title>

                    <Badge bg={slide.active ? 'success' : 'secondary'}>
                      {slide.active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>

                  {slide.description && (
                    <Card.Text className="text-muted">
                      {slide.description}
                    </Card.Text>
                  )}

                  <div className="small text-muted mb-3">
                    <div>
                      <strong>Duration:</strong> {slide.duration_seconds} seconds
                    </div>
                    <div className="mt-2">
                      <strong>Schedule:</strong>
                      <br />
                      {getScheduleText(slide)}
                    </div>
                  </div>

                  <div className="mt-auto d-flex gap-2 flex-wrap">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => openEditModal(slide)}
                    >
                      <FaEdit className="me-1" />
                      Edit
                    </Button>

                    <Button
                      variant={slide.active ? 'outline-secondary' : 'outline-success'}
                      size="sm"
                      onClick={() => handleToggleActive(slide)}
                    >
                      <FaPowerOff className="me-1" />
                      {slide.active ? 'Deactivate' : 'Activate'}
                    </Button>

                    <Button
                      variant="outline-danger"
                      size="sm"
                      onClick={() => handleDelete(slide)}
                    >
                      <FaTrash className="me-1" />
                      Delete
                    </Button>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      <Modal
        show={showModal}
        onHide={() => {
          if (!saving) {
            setShowModal(false);
            resetForm();
          }
        }}
        size="lg"
        centered
      >
        <Form onSubmit={handleSave}>
          <Modal.Header closeButton={!saving}>
            <Modal.Title>
              {editingSlide ? 'Edit Lobby Slide' : 'Add Lobby Slide'}
            </Modal.Title>
          </Modal.Header>

          <Modal.Body>
            <Row className="g-3">
              <Col xs={12}>
                <Form.Group>
                  <Form.Label>Slide Title</Form.Label>
                  <Form.Control
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </Form.Group>
              </Col>

              <Col xs={12}>
                <Form.Group>
                  <Form.Label>Description</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Optional description or additional information."
                  />
                </Form.Group>
              </Col>

              <Col xs={12}>
                <Form.Group>
                  <Form.Label>
                    Image {editingSlide && '(Optional replacement)'}
                  </Form.Label>

                  <Form.Control
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => {
                      const target = e.currentTarget as HTMLInputElement;
                      const file = target.files?.[0] || null;
                      handleImageChange(file);
                    }}
                    required={!editingSlide}
                  />

                  <Form.Text className="text-muted">
                    JPG, PNG, or WebP. Maximum file size: 10 MB.
                  </Form.Text>
                </Form.Group>
              </Col>

              {imagePreview && (
                <Col xs={12}>
                  <div className="border rounded p-2 text-center bg-light">
                    <img
                      src={imagePreview}
                      alt="Slide preview"
                      style={{
                        maxWidth: '100%',
                        maxHeight: '300px',
                        objectFit: 'contain'
                      }}
                    />
                  </div>
                </Col>
              )}

              <Col xs={12}>
                <Form.Check
                  type="switch"
                  label="Active"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                />
                <Form.Text className="text-muted">
                  Inactive slides will not appear on the lobby TV.
                </Form.Text>
              </Col>

              <Col md={6}>
                <Form.Group>
                  <Form.Label>Start Date (Optional)</Form.Label>
                  <Form.Control
                    type="datetime-local"
                    value={startsAt}
                    onChange={(e) => setStartsAt(e.target.value)}
                  />
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group>
                  <Form.Label>End Date (Optional)</Form.Label>
                  <Form.Control
                    type="datetime-local"
                    value={endsAt}
                    onChange={(e) => setEndsAt(e.target.value)}
                  />
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group>
                  <Form.Label>Display Duration (Seconds)</Form.Label>
                  <Form.Control
                    type="number"
                    min="1"
                    max="300"
                    value={durationSeconds}
                    onChange={(e) => setDurationSeconds(Number(e.target.value))}
                    required
                  />
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>

          <Modal.Footer>
            <Button
              variant="secondary"
              onClick={() => {
                setShowModal(false);
                resetForm();
              }}
              disabled={saving}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              disabled={saving}
            >
              {saving ? (
                <>
                  <Spinner
                    size="sm"
                    animation="border"
                    className="me-2"
                  />
                  Saving...
                </>
              ) : (
                editingSlide ? 'Save Changes' : 'Create Slide'
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
      <Modal
        show={showDeleteModal}
        onHide={() => {
          if (!deletingSlide) {
            setShowDeleteModal(false);
            setSlideToDelete(null);
          }
        }}
        centered
      >
        <Modal.Header closeButton={!deletingSlide}>
          <Modal.Title>Delete Lobby Slide</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          Are you sure you want to delete{' '}
          <strong>{slideToDelete?.title}</strong>?

          <p className="text-danger small mt-2 mb-0">
            This action cannot be undone.
          </p>
        </Modal.Body>

        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => {
              setShowDeleteModal(false);
              setSlideToDelete(null);
            }}
            disabled={deletingSlide}
          >
            Cancel
          </Button>

          <Button
            variant="danger"
            onClick={confirmDelete}
            disabled={deletingSlide}
          >
            {deletingSlide ? (
              <>
                <Spinner
                  size="sm"
                  animation="border"
                  className="me-2"
                />
                Deleting...
              </>
            ) : (
              'Delete Slide'
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}

export default LobbySlides;
