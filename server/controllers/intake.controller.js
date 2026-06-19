const pool = require('../db');

exports.createIntake = async (req, res) => {
  const { owner, owner_id, animals, clinic_id } = req.body;

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    let finalOwnerId = owner_id;

    // ------------------------
    // CASE 1: NEW OWNER
    // ------------------------
    if (!finalOwnerId) {
      const ownerResult = await client.query(
        `INSERT INTO owners (
          first_name, last_name, email, phone,
          address, city, county, state, zip_code
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
        RETURNING id`,
        [
          owner.first_name,
          owner.last_name,
          owner.email,
          owner.phone,
          owner.address,
          owner.city,
          owner.county,
          owner.state,
          owner.zip_code
        ]
      );

      finalOwnerId = ownerResult.rows[0].id;
    }

    // ------------------------
    // CASE 2: ADD ANIMALS
    // ------------------------
    for (const animal of animals) {
      if (!animal.name) continue;

      await client.query(
        `INSERT INTO animals (
          owner_id,
          clinic_id,
          name,
          species,
          sex,
          altered_status,
          primary_breed,
          secondary_breed,
          age_years,
          age_months,
          primary_color,
          secondary_color,
          pattern
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
        [
          finalOwnerId,
          clinic_id,
          animal.name,
          animal.species,
          animal.sex,
          animal.altered_status,
          animal.primary_breed,
          animal.secondary_breed || null,
          animal.age_years,
          animal.age_months,
          animal.primary_color,
          animal.secondary_color || null,
          animal.pattern || null
        ]
      );
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      owner_id: finalOwnerId
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);

    res.status(500).json({
      success: false,
      message: 'Failed to process intake'
    });

  } finally {
    client.release();
  }
};