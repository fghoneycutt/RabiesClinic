const pool = require('../db');

// CREATE OWNER
exports.createOwner = async (req, res) => {
  try {
    const {
      first_name,
      last_name,
      address,
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
        first_name,
        last_name,
        address,
        county,
        city,
        state,
        zip_code,
        email,
        phone
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING *
      `,
      [
        first_name,
        last_name,
        address,
        county,
        city,
        state,
        zip_code,
        email,
        phone
      ]
    );

    res.json({
      success: true,
      owner: result.rows[0]
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      success: false,
      error: err.message
    });

  }
};

// UPDATE OWNER
exports.updateOwner = async (req, res) => {
  try {

    const { id } = req.params;

    const {
      first_name,
      last_name,
      address,
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
        county = $4,
        city = $5,
        state = $6,
        zip_code = $7,
        email = $8,
        phone = $9
      WHERE id = $10
      RETURNING *
      `,
      [
        first_name,
        last_name,
        address,
        county,
        city,
        state,
        zip_code,
        email,
        phone,
        id
      ]
    );

    res.json({
      success: true,
      owner: result.rows[0]
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      success: false,
      error: err.message
    });

  }
};

// GET OWNER PROFILE BY ID (Filtered by Clinic Context)
exports.getOwnerById = async (req, res) => {
  try {
    const { id } = req.params;
    // Extract clinicId from query params (e.g., ?clinicId=xyz)
    // Alternatively, if it's in the route parameters, use: req.params.clinicId
    const { clinicId } = req.query; 

    if (!clinicId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required clinicId context'
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
      `,
      [id]
    );

    if (ownerResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Owner not found'
      });
    }

    // -------------------------
    // ANIMALS (Scoped to Clinic)
    // -------------------------
    const animalsResult = await pool.query(
      `
      SELECT *
      FROM animals
      WHERE owner_id = $1 
        AND clinic_id = $2  -- 🔥 CRITICAL FIX: Scope to current clinic context
      ORDER BY created_at DESC
      `,
      [id, clinicId]
    );

    const animals = animalsResult.rows;

    // -------------------------
    // VACCINATIONS
    // -------------------------
    const animalIds = animals.map(a => a.id);
    let vaccinations = [];

    if (animalIds.length > 0) {
      const vaccinationResult = await pool.query(
        `
        SELECT *
        FROM vaccinations
        WHERE animal_id = ANY($1::uuid[])
        ORDER BY date_time_administered DESC
        `,
        [animalIds]
      );

      vaccinations = vaccinationResult.rows;
    }

    // -------------------------
    // ATTACH VACCINES TO ANIMALS
    // -------------------------
    const animalsWithVaccines = animals.map(animal => ({
      ...animal,
      vaccinations: vaccinations.filter(
        v => v.animal_id === animal.id
      )
    }));

    // -------------------------
    // RESPONSE
    // -------------------------
    res.json({
      success: true,
      owner: ownerResult.rows[0],
      animals: animalsWithVaccines
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

// SEARCH OWNERS + ANIMALS
exports.searchOwners = async (req, res) => {
  try {
    const { q } = req.query;
    const { id: clinicId } = req.params;

    const search = `%${q || ''}%`;

    const result = await pool.query(
      `
      WITH filtered_animals AS (
        SELECT *
        FROM animals
        WHERE clinic_id = $2
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

      LEFT JOIN vaccinations v
        ON v.animal_id = a.id
        AND v.is_active = true

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
      [search, clinicId]
    );

    const ownerMap = new Map();

    for (const row of result.rows) {
      if (!ownerMap.has(row.owner_id)) {
        ownerMap.set(row.owner_id, {
          owner_id: row.owner_id,
          owner_name: `${row.first_name} ${row.last_name}`,
          address: [row.address, row.city, row.state, row.zip_code]
            .filter(Boolean)
            .join(', '),
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
          breed: [row.primary_breed, row.secondary_breed]
            .filter(Boolean)
            .join(' x '),
          sex: row.sex,
          altered: row.altered_status,
          age: row.age_years
            ? `${row.age_years}y`
            : row.age_months
            ? `${row.age_months}m`
            : '—',
          color: [row.primary_color, row.secondary_color]
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
      owners: Array.from(ownerMap.values())
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

// DELETE OWNER
exports.deleteOwner = async (req, res) => {
  const { id } = req.params;

  try {
    await pool.query(
      'DELETE FROM owners WHERE id = $1',
      [id]
    );

    res.json({
      success: true
    });

  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: 'Failed to delete owner'
    });
  }
};