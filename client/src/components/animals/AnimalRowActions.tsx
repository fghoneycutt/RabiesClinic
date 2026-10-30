
import Button from 'react-bootstrap/Button';
import type { Animal, Vaccination } from '../../types/intake';

type Props = {
  animal: Animal;
  editing: boolean;
  hasRabies: boolean;
  latestRabies: Vaccination | null;
  vaccineExpanded: boolean;
  setShowRabiesModal: (show: boolean) => void;
  setShowDeleteModal: (show: boolean) => void;
  setVaccineExpanded: (expanded: boolean) => void;
  saveEdit: () => void;
  cancelEdit: () => void;
  toggleAnimalEdit: (id: string) => void;
};

export default function AnimalRowActions({
  animal,
  editing,
  hasRabies,
  latestRabies,
  vaccineExpanded,
  setShowRabiesModal,
  setShowDeleteModal,
  setVaccineExpanded,
  saveEdit,
  cancelEdit,
  toggleAnimalEdit
}: Props) {
  return (
    <div
      className="animal-controls-content d-flex align-items-start gap-3"
      style={{
        display: 'flex',
        flexDirection: 'row',
        flexWrap: 'nowrap',
        width: '100%'
      }}
    >
      {/* Actions */}
      <div
        className="animal-mobile-control-group"
        style={{
          flex: '1 1 50%',
          minWidth: 0
        }}
      >
        <strong className="d-block mb-2">Actions</strong>

        <div className="d-flex flex-wrap gap-2">
          {!editing ? (
            <Button
              size="sm"
              variant="outline-primary"
              onClick={() => toggleAnimalEdit(animal.id)}
            >
              <i className="fas fa-edit" /> Edit
            </Button>
          ) : (
            <>
              <Button
                size="sm"
                variant="success"
                onClick={saveEdit}
              >
                <i className="fas fa-save" /> Save
              </Button>

              <Button
                size="sm"
                variant="outline-secondary"
                onClick={cancelEdit}
              >
                <i className="fas fa-times" /> Cancel
              </Button>
            </>
          )}

          {editing && (
            <Button
              size="sm"
              variant="outline-danger"
              onClick={() => setShowDeleteModal(true)}
            >
              <i className="fas fa-trash-alt" /> Delete
            </Button>
          )}
        </div>
      </div>

      {/* Rabies */}
      <div
        className="animal-mobile-control-group"
        style={{
          flex: '1 1 50%',
          minWidth: 0
        }}
      >
        <strong className="d-block mb-2">Rabies</strong>

        {!hasRabies ? (
          <Button
            size="sm"
            variant="outline-success"
            onClick={() => setShowRabiesModal(true)}
          >
            <i className="fas fa-plus" /> Add
          </Button>
        ) : (
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <div
              className="d-flex align-items-center gap-1"
              style={{ cursor: 'pointer', userSelect: 'none' }}
              onClick={() => setVaccineExpanded(!vaccineExpanded)}
            >
              <strong>{latestRabies?.rabies_tag_number}</strong>

              <span className="text-muted small">
                {latestRabies?.vaccine_type === 'rabies_1_year'
                  ? '1 Yr'
                  : latestRabies?.vaccine_type === 'rabies_3_year'
                  ? '3 Yr'
                  : ''}
              </span>

              <span className="text-primary small">
                {vaccineExpanded
                  ? <i className="fas fa-caret-down" />
                  : <i className="fas fa-caret-right" />}
              </span>
            </div>

            <Button
              size="sm"
              variant="outline-secondary"
              href={`${import.meta.env.VITE_API_URL}/api/vaccinations/${latestRabies?.id}/certificate`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Download rabies certificate"
            >
              <i className="fas fa-file-pdf text-danger" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}