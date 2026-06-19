import Form from 'react-bootstrap/Form';

import {
  DOG_BREEDS,
  CAT_BREEDS,
  DOG_COLORS,
  CAT_COLORS,
  DOG_PATTERNS,
  CAT_PATTERNS
} from '../../constants/animalOptions';

import {
  formatSpecies,
  formatSex,
  formatAge
} from '../../utils/animalFormatters';

import type { Animal } from '../../types/intake';

type AnimalField = keyof Animal;

type Props = {
  animal: Animal;
  editing: boolean;

  updateAnimalLocal: (
    animalId: string,
    field: AnimalField,
    value: any
  ) => void;

  saveAnimalField: (
    animalId: string,
    field: AnimalField,
    value: any
  ) => Promise<void>;
};

export default function AnimalEditableCells({
  animal,
  editing,
  updateAnimalLocal,
  saveAnimalField
}: Props) {
  const species = animal.species;

  const breedOptions = species === 'dog' ? DOG_BREEDS : CAT_BREEDS;
  const colorOptions = species === 'dog' ? DOG_COLORS : CAT_COLORS;
  const patternOptions = species === 'dog' ? DOG_PATTERNS : CAT_PATTERNS;

  return (
    <>
      {/* NAME */}
      <td>
        {editing ? (
          <Form.Control
            size="sm"
            value={animal.name}
            onChange={(e) =>
              updateAnimalLocal(animal.id, 'name', e.target.value)
            }
            onBlur={(e) =>
              saveAnimalField(animal.id, 'name', e.target.value)
            }
          />
        ) : (
          animal.name
        )}
      </td>

      {/* SPECIES */}
      <td>
        {editing ? (
          <Form.Select
            size="sm"
            value={animal.species ?? ''}
            onChange={(e) => {
              const val = e.target.value as '' | 'dog' | 'cat';

              updateAnimalLocal(animal.id, 'species', val);
              saveAnimalField(animal.id, 'species', val);
            }}
          >
            <option value=""></option>
            <option value="dog">Dog</option>
            <option value="cat">Cat</option>
          </Form.Select>
        ) : (
          formatSpecies(animal.species)
        )}
      </td>

      {/* BREED */}
      <td>
        {editing ? (
          <>
            <Form.Select
              size="sm"
              value={animal.primary_breed || ''}
              onChange={(e) => {
                updateAnimalLocal(
                  animal.id,
                  'primary_breed',
                  e.target.value
                );
                saveAnimalField(
                  animal.id,
                  'primary_breed',
                  e.target.value
                );
              }}
            >
              <option value=""></option>
              {breedOptions.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </Form.Select>

            <Form.Select
              size="sm"
              value={animal.secondary_breed || ''}
              onChange={(e) => {
                updateAnimalLocal(
                  animal.id,
                  'secondary_breed',
                  e.target.value
                );
                saveAnimalField(
                  animal.id,
                  'secondary_breed',
                  e.target.value
                );
              }}
            >
              <option value=""></option>
              {breedOptions.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </Form.Select>
          </>
        ) : (
          `${animal.primary_breed || ''}${
            animal.secondary_breed ? ` / ${animal.secondary_breed}` : ''
          }`
        )}
      </td>

      {/* SEX */}
      <td>
        {editing ? (
          <Form.Select
            size="sm"
            value={animal.sex ?? ''}
            onChange={(e) => {
              const val = e.target.value as '' | 'male' | 'female';

              updateAnimalLocal(animal.id, 'sex', val);
              saveAnimalField(animal.id, 'sex', val);
            }}
          >
            <option value=""></option>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </Form.Select>
        ) : (
          formatSex(animal.sex)
        )}
      </td>

      {/* ALTERED */}
      <td>
        {editing ? (
          <Form.Select
            size="sm"
            value={
              animal.altered_status === true
                ? 'yes'
                : animal.altered_status === false
                ? 'no'
                : 'unknown'
            }
            onChange={(e) => {
              const val =
                e.target.value === 'yes'
                  ? true
                  : e.target.value === 'no'
                  ? false
                  : null;

              updateAnimalLocal(animal.id, 'altered_status', val);
              saveAnimalField(animal.id, 'altered_status', val);
            }}
          >
            <option value="unknown">Unknown</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </Form.Select>
        ) : (
          animal.altered_status === true
            ? 'Yes'
            : animal.altered_status === false
            ? 'No'
            : 'Unknown'
        )}
      </td>

      {/* AGE */}
      <td>
        {editing ? (
          <div className="d-flex gap-1">
            <Form.Control
              size="sm"
              type="number"
              min={0}
              style={{ width: '70px' }}
              value={animal.age_years ?? ''}
              onChange={(e) => {
                const val = e.target.value === '' ? null : Number(e.target.value);

                updateAnimalLocal(animal.id, 'age_years', val);
              }}
              onBlur={(e) =>
                saveAnimalField(
                  animal.id,
                  'age_years',
                  e.target.value === '' ? null : Number(e.target.value)
                )
              }
            />

            <span className="align-self-center">yr</span>

            <Form.Control
              size="sm"
              type="number"
              min={0}
              max={11}
              style={{ width: '70px' }}
              value={animal.age_months ?? ''}
              onChange={(e) => {
                const val = e.target.value === '' ? null : Number(e.target.value);

                updateAnimalLocal(animal.id, 'age_months', val);
              }}
              onBlur={(e) =>
                saveAnimalField(
                  animal.id,
                  'age_months',
                  e.target.value === '' ? null : Number(e.target.value)
                )
              }
            />

            <span className="align-self-center">mo</span>
          </div>
        ) : (
          formatAge(animal.age_years, animal.age_months)
        )}
      </td>

      {/* COLOR */}
      <td>
        {editing ? (
          <>
            <Form.Select
              size="sm"
              value={animal.primary_color || ''}
              onChange={(e) => {
                updateAnimalLocal(
                  animal.id,
                  'primary_color',
                  e.target.value
                );
                saveAnimalField(
                  animal.id,
                  'primary_color',
                  e.target.value
                );
              }}
            >
              <option value=""></option>
              {colorOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Form.Select>

            <Form.Select
              size="sm"
              value={animal.secondary_color || ''}
              onChange={(e) => {
                updateAnimalLocal(
                  animal.id,
                  'secondary_color',
                  e.target.value
                );
                saveAnimalField(
                  animal.id,
                  'secondary_color',
                  e.target.value
                );
              }}
            >
              <option value=""></option>
              {colorOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Form.Select>
          </>
        ) : (
          `${animal.primary_color || ''}${
            animal.secondary_color ? ` / ${animal.secondary_color}` : ''
          }`
        )}
      </td>

      {/* PATTERN */}
      <td>
        {editing ? (
          <Form.Select
            size="sm"
            value={animal.pattern || ''}
            onChange={(e) => {
              updateAnimalLocal(animal.id, 'pattern', e.target.value);
              saveAnimalField(animal.id, 'pattern', e.target.value);
            }}
          >
            <option value=""></option>
            {patternOptions.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </Form.Select>
        ) : (
          animal.pattern || '-'
        )}
      </td>
    </>
  );
}