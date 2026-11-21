
const pool = require('../db');

// -----------------------------
// CREATE ANIMAL (LEGACY / MODAL FLOW)
// -----------------------------
exports.createAnimal = async (req, res) => {
  try {
    const organizationId = req.organizationId;

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: 'Organization context is required.'
      });
    }

    const {
      owner_id,
      clinic_id,
      name,
      species,
      primary_breed,
      secondary_breed,
      sex,
      altered_status,
      primary_color,
      secondary_color,
      pattern,
      age_years,
      age_months,
      approximate_weight,
      microchip_number,
      microchip_issuer,
      rabies_tag_number
    } = req.body;

    // Verify that the owner belongs to this organization.
    const ownerResult = await pool.query(
      `
        SELECT id
        FROM owners
        WHERE id = $1
          AND organization_id = $2
      `,
      [owner_id, organizationId]
    );

    if (ownerResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Owner not found.'
      });
    }

    // Verify clinic belongs to this organization, if supplied.
    if (clinic_id) {
      const clinicResult = await pool.query(
        `
          SELECT id
          FROM clinics
          WHERE id = $1
            AND organization_id = $2
        `,
        [clinic_id, organizationId]
      );

      if (clinicResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Clinic not found.'
        });
      }
    }

    const result = await pool.query(
      `
        INSERT INTO animals (
          organization_id,
          owner_id,
          clinic_id,
          name,
          species,
          primary_breed,
          secondary_breed,
          sex,
          altered_status,
          primary_color,
          secondary_color,
          pattern,
          age_years,
          age_months,
          approximate_weight,
          microchip_number,
          microchip_issuer,
          rabies_tag_number
        )
        VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,
          $10,$11,$12,$13,$14,$15,$16,$17,$18
        )
        RETURNING *
      `,
      [
        organizationId,
        owner_id,
        clinic_id || null,
        name,
        species,
        primary_breed || null,
        secondary_breed || null,
        sex,
        altered_status,
        primary_color,
        secondary_color || null,
        pattern || null,
        age_years,
        age_months,
        approximate_weight ?? null,
        microchip_number || null,
        microchip_issuer || null,
        rabies_tag_number || null
      ]
    );

    return res.status(201).json({
      success: true,
      animal: result.rows[0]
    });

  } catch (err) {
    console.error('CREATE ANIMAL ERROR:', err);

    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

// -----------------------------
// GET ANIMALS BY OWNER
// -----------------------------
exports.getAnimalsByOwner = async (req, res) => {
  try {
    const organizationId = req.organizationId;
    const { owner_id } = req.query;

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: 'Organization context is required.'
      });
    }

    if (!owner_id) {
      return res.status(400).json({
        success: false,
        message: 'Owner ID is required.'
      });
    }

    // Verify owner belongs to the active organization.
    const ownerResult = await pool.query(
      `
        SELECT id
        FROM owners
        WHERE id = $1
          AND organization_id = $2
      `,
      [owner_id, organizationId]
    );

    if (ownerResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Owner not found.'
      });
    }

    const result = await pool.query(
      `
        SELECT *
        FROM animals
        WHERE owner_id = $1
          AND organization_id = $2
        ORDER BY created_at DESC
      `,
      [owner_id, organizationId]
    );

    return res.json({
      success: true,
      animals: result.rows
    });

  } catch (err) {
    console.error('GET ANIMALS BY OWNER ERROR:', err);

    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

// -----------------------------
// UPDATE ANIMAL (PARTIAL)
// -----------------------------
exports.updateAnimal = async (req, res) => {
  try {
    const organizationId = req.organizationId;
    const { id } = req.params;
    const fields = req.body;

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: 'Organization context is required.'
      });
    }

    const allowedFields = new Set([
      'owner_id',
      'clinic_id',
      'name',
      'species',
      'primary_breed',
      'secondary_breed',
      'sex',
      'altered_status',
      'primary_color',
      'secondary_color',
      'pattern',
      'age_years',
      'age_months',
      'approximate_weight',
      'microchip_number',
      'microchip_issuer',
      'rabies_tag_number'
    ]);

    const keys = Object.keys(fields);

    if (keys.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields provided.'
      });
    }

    const invalidFields = keys.filter(
      key => !allowedFields.has(key)
    );

    if (invalidFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid fields provided.',
        fields: invalidFields
      });
    }

    // Verify animal belongs to the active organization.
    const existingAnimal = await pool.query(
      `
        SELECT id
        FROM animals
        WHERE id = $1
          AND organization_id = $2
      `,
      [id, organizationId]
    );

    if (existingAnimal.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Animal not found.'
      });
    }

    // If owner_id is being changed, verify the new owner.
    if (fields.owner_id) {
      const ownerResult = await pool.query(
        `
          SELECT id
          FROM owners
          WHERE id = $1
            AND organization_id = $2
        `,
        [fields.owner_id, organizationId]
      );

      if (ownerResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Owner not found.'
        });
      }
    }

    // If clinic_id is being changed, verify the clinic.
    if (fields.clinic_id) {
      const clinicResult = await pool.query(
        `
          SELECT id
          FROM clinics
          WHERE id = $1
            AND organization_id = $2
        `,
        [fields.clinic_id, organizationId]
      );

      if (clinicResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Clinic not found.'
        });
      }
    }

    const setClause = keys
      .map((key, index) => `"${key}" = $${index + 1}`)
      .join(', ');

    const values = Object.values(fields);

    const result = await pool.query(
      `
        UPDATE animals
        SET ${setClause}
        WHERE id = $${keys.length + 1}
          AND organization_id = $${keys.length + 2}
        RETURNING *
      `,
      [...values, id, organizationId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Animal not found.'
      });
    }

    return res.json({
      success: true,
      animal: result.rows[0]
    });

  } catch (err) {
    console.error('UPDATE ANIMAL ERROR:', err);

    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

// -----------------------------
// CREATE ANIMAL FOR OWNER (MODAL FLOW)
// -----------------------------
exports.createAnimalForOwner = async (req, res) => {
  try {
    const organizationId = req.organizationId;
    const { ownerId } = req.params;

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: 'Organization context is required.'
      });
    }

    // Verify owner belongs to the active organization.
    const ownerResult = await pool.query(
      `
        SELECT id
        FROM owners
        WHERE id = $1
          AND organization_id = $2
      `,
      [ownerId, organizationId]
    );

    if (ownerResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Owner not found.'
      });
    }

    const {
      name,
      species,
      primary_breed,
      secondary_breed,
      sex,
      altered_status,
      age_years,
      age_months,
      approximate_weight,
      primary_color,
      secondary_color,
      pattern,
      rabies_tag_number,
      microchip_number,
      microchip_issuer
    } = req.body;

    const result = await pool.query(
      `
        INSERT INTO animals (
          organization_id,
          owner_id,
          name,
          species,
          primary_breed,
          secondary_breed,
          sex,
          altered_status,
          age_years,
          age_months,
          approximate_weight,
          primary_color,
          secondary_color,
          pattern,
          rabies_tag_number,
          microchip_number,
          microchip_issuer
        )
        VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,
          $10,$11,$12,$13,$14,$15,$16,$17
        )
        RETURNING *
      `,
      [
        organizationId,
        ownerId,
        name,
        species,
        primary_breed || null,
        secondary_breed || null,
        sex,
        altered_status,
        age_years,
        age_months,
        approximate_weight ?? null,
        primary_color,
        secondary_color || null,
        pattern || null,
        rabies_tag_number || null,
        microchip_number || null,
        microchip_issuer || null
      ]
    );

    return res.status(201).json({
      success: true,
      animal: result.rows[0]
    });

  } catch (err) {
    console.error('CREATE ANIMAL FOR OWNER ERROR:', err);

    return res.status(500).json({
      success: false,
      message: 'Failed to create animal.',
      error: err.message
    });
  }
};

// -----------------------------
// DELETE ANIMAL
// -----------------------------
exports.deleteAnimal = async (req, res) => {
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
        DELETE FROM animals
        WHERE id = $1
          AND organization_id = $2
        RETURNING id
      `,
      [id, organizationId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Animal not found.'
      });
    }

    return res.json({
      success: true,
      deletedId: result.rows[0].id
    });

  } catch (err) {
    console.error('DELETE ANIMAL ERROR:', err);

    return res.status(500).json({
      success: false,
      message: 'Failed to delete animal.',
      error: err.message
    });
  }
};