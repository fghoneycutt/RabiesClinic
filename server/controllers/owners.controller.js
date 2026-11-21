
const pool = require('../db');

// -----------------------------
// CREATE OWNER
// -----------------------------
exports.createOwner = async (req, res) => {
  try {
    const organizationId = req.organizationId;

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: 'Organization context is required.'
      });
    }

    const {
      first_name,
      last_name,
      address,
      secondary_address,
      county,
      city,
      state,
      zip_code,
      email,
      phone
    } = req.body;

    const result = await pool.query(
      `
        INSERT INTO owners (
          organization_id,
          first_name,
          last_name,
          address,
          secondary_address,
          county,
          city,
          state,
          zip_code,
          email,
          phone
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
        RETURNING *
      `,
      [
        organizationId,
        first_name,
        last_name,
        address,
        secondary_address || null,
        county,
        city,
        state,
        zip_code,
        email,
        phone
      ]
    );

    return res.json({
      success: true,
      owner: result.rows[0]
    });

  } catch (err) {
    console.error('CREATE OWNER ERROR:', err);

    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

// -----------------------------
// UPDATE OWNER
// -----------------------------
exports.updateOwner = async (req, res) => {
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
      first_name,
      last_name,
      address,
      secondary_address,
      county,
      city,
      state,
      zip_code,
      email,
      phone
    } = req.body;

    const result = await pool.query(
      `
        UPDATE owners
        SET
          first_name = $1,
          last_name = $2,
          address = $3,
          secondary_address = $4,
          county = $5,
          city = $6,
          state = $7,
          zip_code = $8,
          email = $9,
          phone = $10
        WHERE id = $11
          AND organization_id = $12
        RETURNING *
      `,
      [
        first_name,
        last_name,
        address,
        secondary_address || null,
        county,
        city,
        state,
        zip_code,
        email,
        phone,
        id,
        organizationId
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Owner not found.'
      });
    }

    return res.json({
      success: true,
      owner: result.rows[0]
    });

  } catch (err) {
    console.error('UPDATE OWNER ERROR:', err);

    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

// -----------------------------
// GET OWNER PROFILE BY ID
// -----------------------------
exports.getOwnerById = async (req, res) => {
  try {
    const organizationId = req.organizationId;
    const { id } = req.params;
    const { clinicId } = req.query;

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: 'Organization context is required.'
      });
    }

    if (!clinicId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required clinicId context.'
      });
    }

    // -------------------------
    // OWNER
    // -------------------------
    const ownerResult = await pool.query(
      `
        SELECT *
        FROM owners
        WHERE id = $1
          AND organization_id = $2
      `,
      [id, organizationId]
    );

    if (ownerResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Owner not found.'
      });
    }

    // -------------------------
    // ANIMALS
    // Scoped to organization, owner, and clinic
    // -------------------------
    const animalsResult = await pool.query(
      `
        SELECT *
        FROM animals
        WHERE owner_id = $1
          AND clinic_id = $2
          AND organization_id = $3
        ORDER BY created_at DESC
      `,
      [id, clinicId, organizationId]
    );

    const animals = animalsResult.rows;

    // -------------------------
    // VACCINATIONS
    // -------------------------
    const animalIds = animals.map(animal => animal.id);
    let vaccinations = [];

    if (animalIds.length > 0) {
      const vaccinationResult = await pool.query(
        `
          SELECT *
          FROM vaccinations
          WHERE animal_id = ANY($1::uuid[])
            AND organization_id = $2
          ORDER BY date_time_administered DESC
        `,
        [animalIds, organizationId]
      );

      vaccinations = vaccinationResult.rows;
    }

    // -------------------------
    // ATTACH VACCINES TO ANIMALS
    // -------------------------
    const animalsWithVaccines = animals.map(animal => ({
      ...animal,
      vaccinations: vaccinations.filter(
        vaccination => vaccination.animal_id === animal.id
      )
    }));

    // -------------------------
    // RESPONSE
    // -------------------------
    return res.json({
      success: true,
      owner: ownerResult.rows[0],
      animals: animalsWithVaccines
    });

  } catch (err) {
    console.error('GET OWNER ERROR:', err);

    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

// -----------------------------
// SEARCH OWNERS + ANIMALS
// -----------------------------
exports.searchOwners = async (req, res) => {
  try {
    const organizationId = req.organizationId;
    const { q, clinicId } = req.query;

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: 'Organization context is required.'
      });
    }

    if (!clinicId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required clinicId context.'
      });
    }

    const search = `%${q || ''}%`;

    const result = await pool.query(
      `
        WITH filtered_animals AS (
          SELECT *
          FROM animals
          WHERE clinic_id = $2
            AND organization_id = $3
        )

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
          a.rabies_tag_number,
          a.size_category,

          v.vaccine_type

        FROM filtered_animals a

        JOIN owners o
          ON o.id = a.owner_id
          AND o.organization_id = $3

        LEFT JOIN LATERAL (
          SELECT v.vaccine_type
          FROM vaccinations v
          WHERE v.animal_id = a.id
            AND v.organization_id = $3
            AND v.is_active = true
          ORDER BY v.date_time_administered DESC
          LIMIT 1
        ) v ON true

        WHERE
          (
            o.first_name ILIKE $1
            OR o.last_name ILIKE $1
            OR CONCAT(o.first_name, ' ', o.last_name) ILIKE $1
            OR o.email ILIKE $1
            OR o.phone ILIKE $1
            OR o.address ILIKE $1
            OR a.name ILIKE $1
            OR a.rabies_tag_number ILIKE $1
            OR a.microchip_number ILIKE $1
          )

        ORDER BY
          o.last_name ASC,
          o.first_name ASC,
          a.name ASC
      `,
      [search, clinicId, organizationId]
    );

    const ownerMap = new Map();

    for (const row of result.rows) {
      if (!ownerMap.has(row.owner_id)) {
        ownerMap.set(row.owner_id, {
          owner_id: row.owner_id,
          owner_name: `${row.first_name} ${row.last_name}`,
          address: [
            row.address,
            row.city,
            row.state,
            row.zip_code
          ].filter(Boolean).join(', '),
          email: row.email,
          phone: row.phone,
          animals: []
        });
      }

      if (row.animal_id) {
        ownerMap.get(row.owner_id).animals.push({
          id: row.animal_id,
          name: row.animal_name,
          species: row.species,
          breed: [
            row.primary_breed,
            row.secondary_breed
          ].filter(Boolean).join(' x '),
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
          ].filter(Boolean).join(' / '),
          pattern: row.pattern,
          rabies_tag_number: row.rabies_tag_number,
          vaccine_type: row.vaccine_type,
          microchip_number: row.microchip_number
        });
      }
    }

    return res.json({
      success: true,
      owners: Array.from(ownerMap.values())
    });

  } catch (err) {
    console.error('SEARCH OWNERS ERROR:', err);

    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

// -----------------------------
// DELETE OWNER
// -----------------------------
exports.deleteOwner = async (req, res) => {
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
        DELETE FROM owners
        WHERE id = $1
          AND organization_id = $2
        RETURNING id
      `,
      [id, organizationId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Owner not found.'
      });
    }

    return res.json({
      success: true
    });

  } catch (err) {
    console.error('DELETE OWNER ERROR:', err);

    return res.status(500).json({
      error: 'Failed to delete owner'
    });
  }
};
