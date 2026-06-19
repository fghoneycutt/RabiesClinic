const pool = require('../db');

// -----------------------------
// CREATE ANIMAL (LEGACY)
// -----------------------------
exports.createAnimal = async (req, res) => {
  try {
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
      microchip_number,
      rabies_tag_number
    } = req.body;

    const result = await pool.query(
      `
      INSERT INTO animals (
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
        microchip_number,
        rabies_tag_number
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,
        $9,$10,$11,$12,$13,$14,$15
      )
      RETURNING *
      `,
      [
        owner_id,
        clinic_id,
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
        microchip_number || null,
        rabies_tag_number || null
      ]
    );

    res.json({
      success: true,
      animal: result.rows[0]
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
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
    const { owner_id } = req.query;

    const result = await pool.query(
      `
      SELECT *
      FROM animals
      WHERE owner_id = $1
      ORDER BY created_at DESC
      `,
      [owner_id]
    );

    res.json({
      success: true,
      animals: result.rows
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
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
    const { id } = req.params;
    const fields = req.body;

    const keys = Object.keys(fields);

    if (keys.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields provided'
      });
    }

    const setClause = keys
      .map((key, index) => `${key} = $${index + 1}`)
      .join(', ');

    const values = Object.values(fields);

    const result = await pool.query(
      `
      UPDATE animals
      SET ${setClause}
      WHERE id = $${keys.length + 1}
      RETURNING *
      `,
      [...values, id]
    );

    res.json({
      success: true,
      animal: result.rows[0]
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      success: false,
      error: err.message
    });

  }
};

// -----------------------------
// CREATE ANIMAL FOR OWNER (MODAL FLOW)
// -----------------------------
async function createAnimalForOwner(req, res) {
  const { ownerId } = req.params;

  const {
    name,
    species,
    primary_breed,
    secondary_breed,
    sex,
    altered_status,
    age_years,
    age_months,
    primary_color,
    secondary_color,
    pattern,
    rabies_tag_number,
    microchip_number
  } = req.body;

  try {

    const result = await pool.query(
      `
      INSERT INTO animals (
        owner_id,
        name,
        species,
        primary_breed,
        secondary_breed,
        sex,
        altered_status,
        age_years,
        age_months,
        primary_color,
        secondary_color,
        pattern,
        rabies_tag_number,
        microchip_number
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,$7,
        $8,$9,$10,$11,$12,$13,$14
      )
      RETURNING *
      `,
      [
        ownerId,
        name,
        species,
        primary_breed || null,
        secondary_breed || null,
        sex,
        altered_status,
        age_years,
        age_months,
        primary_color,
        secondary_color || null,
        pattern || null,
        rabies_tag_number || null,
        microchip_number || null
      ]
    );

    res.status(201).json({
      success: true,
      animal: result.rows[0]
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      success: false,
      message: 'Failed to create animal',
      error: err.message
    });

  }
}

// -----------------------------
// DELETE ANIMAL
// -----------------------------
async function deleteAnimal(req, res) {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
      DELETE FROM animals
      WHERE id = $1
      RETURNING id
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Animal not found'
      });
    }

    return res.json({
      success: true,
      deletedId: result.rows[0].id
    });

  } catch (err) {
    console.error(err);

    return res.status(500).json({
      success: false,
      message: 'Failed to delete animal',
      error: err.message
    });
  }
}

exports.createAnimalForOwner = createAnimalForOwner;
exports.deleteAnimal = deleteAnimal;