
const pool = require('../db');
const XLSX = require('xlsx');

// -----------------------------------
// CREATE CLINIC
// -----------------------------------
exports.createClinic = async (req, res) => {
  try {
    const organizationId = req.organizationId;

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: 'Organization context is required.'
      });
    }

    const {
      name,
      location_name,
      address,
      city,
      state,
      zip_code,
      clinic_date,
      start_time,
      end_time,
      offerings,
      default_veterinarian_id,
      notes
    } = req.body;

    const result = await pool.query(
      `
        INSERT INTO clinics (
          organization_id,
          name,
          location_name,
          address,
          city,
          state,
          zip_code,
          clinic_date,
          start_time,
          end_time,
          offerings,
          default_veterinarian,
          notes
        )
        VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13
        )
        RETURNING *
      `,
      [
        organizationId,
        name,
        location_name,
        address,
        city,
        state,
        zip_code,
        clinic_date,
        start_time,
        end_time,
        offerings,
        default_veterinarian_id || null,
        notes
      ]
    );

    return res.status(201).json({
      success: true,
      clinic: result.rows[0]
    });

  } catch (err) {
    console.error('CREATE CLINIC ERROR:', err);

    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

// -----------------------------------
// GET ALL CLINICS
// -----------------------------------
exports.getClinics = async (req, res) => {
  try {
    const organizationId = req.organizationId;

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: 'Organization context is required.'
      });
    }

    const result = await pool.query(
      `
        SELECT *
        FROM clinics
        WHERE organization_id = $1
        ORDER BY clinic_date DESC, start_time DESC
      `,
      [organizationId]
    );

    return res.json(result.rows);

  } catch (err) {
    console.error('GET CLINICS ERROR:', err);

    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

// -----------------------------------
// GET CLINIC BY ID
// -----------------------------------
exports.getClinicById = async (req, res) => {
  try {
    const organizationId = req.organizationId;
    const { id } = req.params;

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: 'Organization context is required.'
      });
    }

    const clinicResult = await pool.query(
      `
        SELECT *
        FROM clinics
        WHERE id = $1
          AND organization_id = $2
      `,
      [id, organizationId]
    );

    if (clinicResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Clinic not found'
      });
    }

    const clinic = clinicResult.rows[0];

    const statsResult = await pool.query(
      `
        SELECT
          (
            SELECT COUNT(DISTINCT o.id)
            FROM owners o
            INNER JOIN animals a
              ON a.owner_id = o.id
              AND a.organization_id = o.organization_id
            WHERE a.clinic_id = $1
              AND a.organization_id = $2
              AND o.organization_id = $2
          ) AS registered_owners,

          (
            SELECT COUNT(*)
            FROM animals
            WHERE clinic_id = $1
              AND organization_id = $2
          ) AS registered_animals
      `,
      [id, organizationId]
    );

    const stats = statsResult.rows[0];

    const response = {
      id: clinic.id,
      name: clinic.name,
      location_name: clinic.location_name,
      address: clinic.address,
      city: clinic.city,
      state: clinic.state,
      zip_code: clinic.zip_code,
      notes: clinic.notes || '',
      default_veterinarian: clinic.default_veterinarian || '',

      clinic_date: clinic.clinic_date
        ? new Date(clinic.clinic_date).toISOString().split('T')[0]
        : '',

      start_time: clinic.start_time
        ? clinic.start_time.toString().slice(0, 5)
        : '',

      end_time: clinic.end_time
        ? clinic.end_time.toString().slice(0, 5)
        : '',

      registered_owners: Number(stats.registered_owners || 0),
      registered_animals: Number(stats.registered_animals || 0),

      offerings: clinic.offerings || {}
    };

    return res.json(response);

  } catch (err) {
    console.error('GET CLINIC BY ID ERROR:', err);

    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

// -----------------------------------
// SEARCH CLINIC OWNERS
// -----------------------------------
exports.searchClinicOwners = async (req, res) => {
  try {
    const organizationId = req.organizationId;
    const { id } = req.params;
    const search = req.query.query || '';

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: 'Organization context is required.'
      });
    }

    // Confirm the clinic belongs to the active organization.
    const clinicResult = await pool.query(
      `
        SELECT id
        FROM clinics
        WHERE id = $1
          AND organization_id = $2
      `,
      [id, organizationId]
    );

    if (clinicResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Clinic not found.'
      });
    }

    const result = await pool.query(
      `
        SELECT
          owners.id AS owner_id,

          CONCAT(
            owners.first_name,
            ' ',
            owners.last_name
          ) AS owner_name,

          CONCAT(
            owners.address, ', ',
            owners.city, ', ',
            owners.state, ' ',
            owners.zip_code
          ) AS address,

          owners.email,
          owners.phone,

          COALESCE(
            json_agg(
              json_build_object(
                'id', animals.id,
                'name', animals.name,
                'species', animals.species,
                'breed', animals.primary_breed,
                'sex', animals.sex,
                'altered', animals.altered_status,

                'age',
                  CONCAT(
                    COALESCE(animals.age_years::text, ''),
                    'y ',
                    COALESCE(animals.age_months::text, ''),
                    'm'
                  ),

                'color', animals.primary_color,
                'pattern', animals.pattern,

                'rabies_tag_number',
                  vaccinations.rabies_tag_number,

                'vaccine_type',
                  vaccinations.vaccine_type,

                'microchip_number',
                  animals.microchip_number
              )
            ) FILTER (
              WHERE animals.id IS NOT NULL
            ),
            '[]'
          ) AS animals

        FROM owners

        INNER JOIN animals
          ON animals.owner_id = owners.id
          AND animals.organization_id = owners.organization_id

        LEFT JOIN LATERAL (
          SELECT
            v.rabies_tag_number,
            v.vaccine_type
          FROM vaccinations v
          WHERE v.animal_id = animals.id
            AND v.organization_id = $3
            AND v.is_active = true
          ORDER BY
            v.date_time_administered DESC,
            v.created_at DESC
          LIMIT 1
        ) vaccinations ON true

        WHERE animals.clinic_id = $1
          AND animals.organization_id = $3
          AND owners.organization_id = $3
          AND (
            LOWER(owners.first_name) LIKE LOWER($2)
            OR LOWER(owners.last_name) LIKE LOWER($2)
            OR LOWER(
              CONCAT(
                owners.first_name,
                ' ',
                owners.last_name
              )
            ) LIKE LOWER($2)
            OR LOWER(owners.email) LIKE LOWER($2)
            OR LOWER(owners.phone) LIKE LOWER($2)
            OR LOWER(owners.address) LIKE LOWER($2)
            OR LOWER(animals.name) LIKE LOWER($2)
          )

        GROUP BY
          owners.id,
          owners.first_name,
          owners.last_name,
          owners.address,
          owners.city,
          owners.state,
          owners.zip_code,
          owners.email,
          owners.phone

        ORDER BY owner_name ASC
      `,
      [id, `%${search}%`, organizationId]
    );

    return res.json(result.rows);

  } catch (err) {
    console.error('SEARCH CLINIC OWNERS ERROR:', err);

    return res.status(500).json({
      message: 'Failed to search clinic owners'
    });
  }
};

// -----------------------------------
// UPDATE CLINIC
// -----------------------------------
exports.updateClinic = async (req, res) => {
  try {
    const organizationId = req.organizationId;
    const { id } = req.params;

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: 'Organization context is required.'
      });
    }

    const {
      name,
      location_name,
      address,
      city,
      state,
      zip_code,
      clinic_date,
      start_time,
      end_time,
      offerings,
      default_veterinarian_id,
      notes
    } = req.body;

    const result = await pool.query(
      `
        UPDATE clinics
        SET
          name = $1,
          location_name = $2,
          address = $3,
          city = $4,
          state = $5,
          zip_code = $6,
          clinic_date = $7,
          start_time = $8,
          end_time = $9,
          offerings = $10,
          default_veterinarian = $11,
          notes = $12
        WHERE id = $13
          AND organization_id = $14
        RETURNING *
      `,
      [
        name,
        location_name,
        address,
        city,
        state,
        zip_code,
        clinic_date,
        start_time,
        end_time,
        offerings,
        default_veterinarian_id || null,
        notes,
        id,
        organizationId
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Clinic not found'
      });
    }

    return res.json({
      success: true,
      clinic: result.rows[0]
    });

  } catch (err) {
    console.error('UPDATE CLINIC ERROR:', err);

    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

// -----------------------------------
// GET PAGINATED CLINIC REGISTRATIONS
// SORTED BY RECENT
// -----------------------------------
exports.getClinicRegistrations = async (req, res) => {
  try {
    const organizationId = req.organizationId;
    const { id: clinicId } = req.params;

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: 'Organization context is required.'
      });
    }

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, parseInt(req.query.limit) || 15);
    const offset = (page - 1) * limit;

    // Verify clinic belongs to the active organization.
    const clinicResult = await pool.query(
      `
        SELECT id
        FROM clinics
        WHERE id = $1
          AND organization_id = $2
      `,
      [clinicId, organizationId]
    );

    if (clinicResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Clinic not found.'
      });
    }

    // 1. Count unique owners registered at this clinic.
    const countRes = await pool.query(
      `
        SELECT COUNT(DISTINCT owner_id)
        FROM animals
        WHERE clinic_id = $1
          AND organization_id = $2
      `,
      [clinicId, organizationId]
    );

    const totalRecords = parseInt(
      countRes.rows[0]?.count || 0
    );

    const totalPages = Math.ceil(totalRecords / limit);

    // 2. Fetch the page of owner IDs ordered by newest registration.
    const ownerIdsRes = await pool.query(
      `
        SELECT o.id
        FROM owners o
        WHERE o.organization_id = $4
          AND o.id IN (
            SELECT DISTINCT owner_id
            FROM animals
            WHERE clinic_id = $1
              AND organization_id = $4
          )
        ORDER BY o.created_at DESC, o.id DESC
        LIMIT $2 OFFSET $3
      `,
      [clinicId, limit, offset, organizationId]
    );

    const targetOwnerIds = ownerIdsRes.rows.map(
      row => row.id
    );

    if (targetOwnerIds.length === 0) {
      return res.json({
        success: true,
        owners: [],
        pagination: {
          page,
          limit,
          totalRecords,
          totalPages
        }
      });
    }

    // 3. Fetch detailed owner, animal, and vaccination data.
    const detailedRes = await pool.query(
      `
        SELECT
          o.id AS owner_id,
          o.first_name,
          o.last_name,
          o.email,
          o.phone,
          o.address,
          o.city,
          o.state,
          o.zip_code,
          o.created_at,

          a.id AS animal_id,
          a.name AS animal_name,
          a.species,
          a.sex,
          a.altered_status,
          a.primary_breed,
          a.secondary_breed,
          a.age_years,
          a.age_months,
          a.primary_color,
          a.secondary_color,
          a.pattern,
          a.microchip_number,

          v.rabies_tag_number,
          v.vaccine_type

        FROM owners o

        LEFT JOIN animals a
          ON o.id = a.owner_id
          AND a.clinic_id = $1
          AND a.organization_id = $3

        LEFT JOIN LATERAL (
          SELECT
            v.rabies_tag_number,
            v.vaccine_type
          FROM vaccinations v
          WHERE v.animal_id = a.id
            AND v.organization_id = $3
            AND v.is_active = true
          ORDER BY
            v.date_time_administered DESC,
            v.created_at DESC
          LIMIT 1
        ) v ON true

        WHERE o.id = ANY($2)
          AND o.organization_id = $3

        ORDER BY
          o.created_at DESC,
          o.id DESC,
          a.name ASC
      `,
      [clinicId, targetOwnerIds, organizationId]
    );

    // 4. Map relational rows into structured owner objects.
    const ownerMap = new Map();

    targetOwnerIds.forEach(id => {
      const matchRow = detailedRes.rows.find(
        row => row.owner_id === id
      );

      if (matchRow) {
        ownerMap.set(id, {
          owner_id: matchRow.owner_id,

          owner_name:
            `${matchRow.first_name} ${matchRow.last_name}`,

          address: [
            matchRow.address,
            matchRow.city,
            matchRow.state,
            matchRow.zip_code
          ]
            .filter(Boolean)
            .join(', '),

          email: matchRow.email,
          phone: matchRow.phone,
          animals: []
        });
      }
    });

    for (const row of detailedRes.rows) {
      if (row.animal_id && ownerMap.has(row.owner_id)) {
        ownerMap.get(row.owner_id).animals.push({
          id: row.animal_id,
          name: row.animal_name,
          species: row.species,

          breed: [
            row.primary_breed,
            row.secondary_breed
          ]
            .filter(Boolean)
            .join(' x '),

          sex: row.sex,
          altered: row.altered_status,

          age: row.age_years
            ? `${row.age_years}y`
            : row.age_months
            ? `${row.age_months}m`
            : '—',

          color: [
            row.primary_color,
            row.secondary_color
          ]
            .filter(Boolean)
            .join(' / '),

          pattern: row.pattern,
          rabies_tag_number: row.rabies_tag_number,
          vaccine_type: row.vaccine_type,
          microchip_number: row.microchip_number
        });
      }
    }

    return res.json({
      success: true,
      owners: Array.from(ownerMap.values()),
      pagination: {
        page,
        limit,
        totalRecords,
        totalPages
      }
    });

  } catch (err) {
    console.error('GET CLINIC REGISTRATIONS ERROR:', err);

    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

// -----------------------------------
// EXPORT CLINIC DATA
// -----------------------------------
exports.exportClinicData = async (req, res) => {
  try {
    const organizationId = req.organizationId;
    const id = req.params.id || req.params.clinicId;

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: 'Organization context is required.'
      });
    }

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Clinic ID is required'
      });
    }

    // Verify clinic belongs to the active organization.
    const clinicResult = await pool.query(
      `
        SELECT id
        FROM clinics
        WHERE id = $1
          AND organization_id = $2
      `,
      [id, organizationId]
    );

    if (clinicResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Clinic not found'
      });
    }

    const result = await pool.query(
      `
        SELECT
          -- OWNER
          o.first_name AS person_first_name,
          o.last_name AS person_last_name,
          o.phone AS phone,
          o.email AS email,
          o.address AS address,
          o.secondary_address AS secondary_address,
          o.city AS city,
          o.county AS county,
          o.state AS state,
          o.zip_code AS zip_code,

          -- ANIMAL
          a.name AS animal_name,
          a.species,
          a.primary_breed,
          a.secondary_breed,
          a.sex,
          a.approximate_weight AS weight,
          a.altered_status,
          a.primary_color,
          a.secondary_color,
          a.pattern,
          a.microchip_number,
          a.microchip_issuer,

          -- AGE
          a.age_years,
          a.age_months,

          -- VACCINATION
          v.vaccine_type,
          v.product,
          v.manufacturer,
          v.lot_number,
          v.rabies_tag_number,
          v.vaccinated_by AS vaccinated_by_name,
          v.supervising_veterinarian,

          COALESCE(
            v.date_time_administered::date,
            c.clinic_date
          ) AS date_vaccinated,

          v.date_time_due::date AS vaccination_expires,
          v.product_expiration_date,

          -- CLINIC CONTEXT
          c.name AS vaccine_location

        FROM animals a

        JOIN owners o
          ON o.id = a.owner_id
          AND o.organization_id = a.organization_id

        JOIN clinics c
          ON c.id = a.clinic_id
          AND c.organization_id = a.organization_id

        LEFT JOIN LATERAL (
          SELECT
            v.vaccine_type,
            v.product,
            v.manufacturer,
            v.lot_number,
            v.rabies_tag_number,
            v.vaccinated_by,
            v.supervising_veterinarian,
            v.date_time_administered,
            v.date_time_due,
            v.product_expiration_date
          FROM vaccinations v
          WHERE v.animal_id = a.id
            AND v.organization_id = $2
            AND v.is_active = true
          ORDER BY
            v.date_time_administered DESC,
            v.created_at DESC
          LIMIT 1
        ) v ON true

        WHERE c.id = $1
          AND c.organization_id = $2
          AND a.organization_id = $2
          AND o.organization_id = $2
          AND (
            NULLIF(
              TRIM(COALESCE(a.microchip_number, '')),
              ''
            ) IS NOT NULL
            OR
            NULLIF(
              TRIM(COALESCE(v.rabies_tag_number, '')),
              ''
            ) IS NOT NULL
          )

        ORDER BY
          o.last_name,
          o.first_name
      `,
      [id, organizationId]
    );

    const rows = result.rows;

    if (!rows.length) {
      return res.status(404).json({
        success: false,
        error: 'No data found for clinic matching export criteria'
      });
    }

    // Create Excel file.
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      'Clinic Export'
    );

    const buffer = XLSX.write(workbook, {
      type: 'buffer',
      bookType: 'xlsx'
    });

    // Send file.
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=clinic_${id}_export.xlsx`
    );

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );

    return res.send(buffer);

  } catch (err) {
    console.error('EXPORT CLINIC DATA ERROR:', err);

    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

// -----------------------------------
// DELETE CLINIC
// -----------------------------------
exports.deleteClinic = async (req, res) => {
  try {
    const organizationId = req.organizationId;
    const { id } = req.params;

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: 'Organization context is required.'
      });
    }

    const result = await pool.query(
      `
        DELETE FROM clinics
        WHERE id = $1
          AND organization_id = $2
        RETURNING *
      `,
      [id, organizationId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Clinic not found'
      });
    }

    return res.json({
      success: true,
      clinic: result.rows[0]
    });

  } catch (err) {
    console.error('DELETE CLINIC ERROR:', err);

    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
};