import Form from 'react-bootstrap/Form';
import Select from 'react-select';

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
};


const selectContainerStyle = {
  width: '220px'
};

const selectStyles = {
  menu: (provided: any) => ({
    ...provided,
    zIndex: 9999
  }),
  menuPortal: (provided: any) => ({
    ...provided,
    zIndex: 9999
  })
};


export default function AnimalEditableCells({
  animal,
  editing,
  updateAnimalLocal
}: Props) {

  const species =
    animal.species;


  const breedOptions =
    species === 'dog'
      ? DOG_BREEDS
      : species === 'cat'
      ? CAT_BREEDS
      : [];


  const colorOptions =
    species === 'dog'
      ? DOG_COLORS
      : species === 'cat'
      ? CAT_COLORS
      : [];


  const patternOptions =
    species === 'dog'
      ? DOG_PATTERNS
      : species === 'cat'
      ? CAT_PATTERNS
      : [];


  const breedSelectOptions =
    breedOptions.map(breed => ({
      value: breed,
      label: breed
    }));


  const colorSelectOptions =
    colorOptions.map(color => ({
      value: color,
      label: color
    }));


  const patternSelectOptions =
    patternOptions.map(pattern => ({
      value: pattern,
      label: pattern
    }));


  return (
    <>

      {/* NAME */}
      <td
        style={
          editing
            ? { minWidth: '180px' }
            : undefined
        }
      >

        {editing ? (

          <Form.Control
            size="sm"
            value={animal.name || ''}
            onChange={(e) =>
              updateAnimalLocal(
                animal.id,
                'name',
                e.target.value
              )
            }
          />

        ) : (

          animal.name

        )}

      </td>



      {/* SPECIES */}
      <td
        style={
          editing
            ? { minWidth: '130px' }
            : undefined
        }
      >

        {editing ? (

          <Form.Select
            size="sm"
            value={animal.species ?? ''}
            onChange={(e) => {

              const value =
                e.target.value as
                '' | 'dog' | 'cat';

              updateAnimalLocal(
                animal.id,
                'species',
                value
              );

            }}
          >

            <option value="">
              
            </option>

            <option value="dog">
              Dog
            </option>

            <option value="cat">
              Cat
            </option>

          </Form.Select>

        ) : (

          formatSpecies(
            animal.species
          )

        )}

      </td>



      {/* BREED */}
      <td
        style={
          editing
            ? { minWidth: '250px' }
            : undefined
        }
      >

        {editing ? (

          <div className="d-flex flex-column gap-1">

            <div style={selectContainerStyle}>

              <Select
                styles={selectStyles}
                menuPortalTarget={document.body}
                isDisabled={!animal.species}
                options={breedSelectOptions}

                value={
                  animal.primary_breed
                    ? {
                        value: animal.primary_breed,
                        label: animal.primary_breed
                      }
                    : null
                }

                onChange={(selected) =>
                  updateAnimalLocal(
                    animal.id,
                    'primary_breed',
                    selected?.value || ''
                  )
                }

                placeholder="Primary breed..."
                isClearable

              />

            </div>


            <div style={selectContainerStyle}>

              <Select
                styles={selectStyles}
                menuPortalTarget={document.body}
                isDisabled={!animal.species}
                options={breedSelectOptions}

                value={
                  animal.secondary_breed
                    ? {
                        value: animal.secondary_breed,
                        label: animal.secondary_breed
                      }
                    : null
                }

                onChange={(selected) =>
                  updateAnimalLocal(
                    animal.id,
                    'secondary_breed',
                    selected?.value || ''
                  )
                }

                placeholder="Secondary breed..."
                isClearable

              />

            </div>

          </div>

        ) : (

          `${animal.primary_breed || ''}${
            animal.secondary_breed
              ? ` / ${animal.secondary_breed}`
              : ''
          }`

        )}

      </td>



      {/* SEX */}
      <td
        style={
          editing
            ? { minWidth: '120px' }
            : undefined
        }
      >

        {editing ? (

          <Form.Select
            size="sm"
            value={animal.sex ?? ''}
            onChange={(e) => {

              const value =
                e.target.value as
                '' | 'male' | 'female';

              updateAnimalLocal(
                animal.id,
                'sex',
                value
              );

            }}
          >

            <option value="">
              
            </option>

            <option value="male">
              Male
            </option>

            <option value="female">
              Female
            </option>

          </Form.Select>

        ) : (

          formatSex(
            animal.sex
          )

        )}

      </td>



      {/* ALTERED */}
      <td
        style={
          editing
            ? { minWidth: '130px' }
            : undefined
        }
      >

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

              const value =
                e.target.value === 'yes'
                  ? true
                  : e.target.value === 'no'
                  ? false
                  : null;


              updateAnimalLocal(
                animal.id,
                'altered_status',
                value
              );

            }}
          >

            <option value="unknown">
              Unknown
            </option>

            <option value="yes">
              Yes
            </option>

            <option value="no">
              No
            </option>

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
      <td
        style={
          editing
            ? { minWidth: '220px' }
            : undefined
        }
      >

        {editing ? (

          <div className="d-flex gap-1 align-items-center">

            <Form.Control
              size="sm"
              type="number"
              min={0}
              style={{
                width: '70px'
              }}

              value={
                animal.age_years ?? ''
              }

              onChange={(e) =>
                updateAnimalLocal(
                  animal.id,
                  'age_years',
                  e.target.value === ''
                    ? null
                    : Number(e.target.value)
                )
              }

            />

            <span>
              yr
            </span>


            <Form.Control
              size="sm"
              type="number"
              min={0}
              max={11}
              style={{
                width: '70px'
              }}

              value={
                animal.age_months ?? ''
              }

              onChange={(e) =>
                updateAnimalLocal(
                  animal.id,
                  'age_months',
                  e.target.value === ''
                    ? null
                    : Number(e.target.value)
                )
              }

            />


            <span>
              mo
            </span>

          </div>

        ) : (

          formatAge(
            animal.age_years,
            animal.age_months
          )

        )}

      </td>
            {/* COLOR */}
      <td
        style={
          editing
            ? { minWidth: '250px' }
            : undefined
        }
      >

        {editing ? (

          <div className="d-flex flex-column gap-1">

            <div style={selectContainerStyle}>

              <Select
                styles={selectStyles}
                menuPortalTarget={document.body}
                isDisabled={!animal.species}
                options={colorSelectOptions}

                value={
                  animal.primary_color
                    ? {
                        value: animal.primary_color,
                        label: animal.primary_color
                      }
                    : null
                }

                onChange={(selected) =>
                  updateAnimalLocal(
                    animal.id,
                    'primary_color',
                    selected?.value || ''
                  )
                }

                placeholder="Primary color..."
                isClearable

              />

            </div>


            <div style={selectContainerStyle}>

              <Select
                styles={selectStyles}
                menuPortalTarget={document.body}
                isDisabled={!animal.species}
                options={colorSelectOptions}

                value={
                  animal.secondary_color
                    ? {
                        value: animal.secondary_color,
                        label: animal.secondary_color
                      }
                    : null
                }

                onChange={(selected) =>
                  updateAnimalLocal(
                    animal.id,
                    'secondary_color',
                    selected?.value || ''
                  )
                }

                placeholder="Secondary color..."
                isClearable

              />

            </div>

          </div>

        ) : (

          `${animal.primary_color || ''}${
            animal.secondary_color
              ? ` / ${animal.secondary_color}`
              : ''
          }`

        )}

      </td>



      {/* PATTERN */}
      <td
        style={
          editing
            ? { minWidth: '220px' }
            : undefined
        }
      >

        {editing ? (

          <div style={selectContainerStyle}>

            <Select
              styles={selectStyles}
              menuPortalTarget={document.body}
              isDisabled={!animal.species}
              options={patternSelectOptions}

              value={
                animal.pattern
                  ? {
                      value: animal.pattern,
                      label: animal.pattern
                    }
                  : null
              }

              onChange={(selected) =>
                updateAnimalLocal(
                  animal.id,
                  'pattern',
                  selected?.value || ''
                )
              }

              placeholder="Pattern..."
              isClearable

            />

          </div>

        ) : (

          animal.pattern || '-'

        )}

      </td>


    </>
  );
}