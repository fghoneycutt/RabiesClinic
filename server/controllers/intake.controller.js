const pool = require('../db');

exports.createIntake = async (req, res) => {
  const {
    owner,
    owner_id,
    animals,
    clinic_id
  } = req.body;

  const client = await pool.connect();

  const clean = (value) =>
    value === '' || value === undefined
      ? null
      : value;

  try {
    await client.query('BEGIN');

    let finalOwnerId = owner_id;

    // ------------------------
    // CASE 1: FIND OR CREATE OWNER
    // ------------------------
    if (!finalOwnerId) {
      const conditions = [];
      const params = [
        owner.first_name,
        owner.last_name
      ];

      let paramIndex = 3;

      if (owner.phone?.trim()) {
        conditions.push(`phone = $${paramIndex}`);
        params.push(owner.phone.trim());
        paramIndex++;
      }

      if (owner.email?.trim()) {
        conditions.push(`LOWER(email) = LOWER($${paramIndex})`);
        params.push(owner.email.trim());
        paramIndex++;
      }

      if (owner.address?.trim()) {
        conditions.push(`LOWER(address) = LOWER($${paramIndex})`);
        params.push(owner.address.trim());
        paramIndex++;
      }

      let existingOwner = { rows: [] };

      if (conditions.length > 0) {
        existingOwner = await client.query(
          `
          SELECT id
          FROM owners
          WHERE
            LOWER(first_name) = LOWER($1)
            AND LOWER(last_name) = LOWER($2)
            AND (
              ${conditions.join(' OR ')}
            )
          LIMIT 1
          `,
          params
        );
      }

      if (existingOwner.rows.length > 0) {

        finalOwnerId = existingOwner.rows[0].id;

      } else {

        const ownerResult = await client.query(
          `
          INSERT INTO owners (
            first_name,
            last_name,
            email,
            phone,
            address,
            city,
            county,
            state,
            zip_code
          )
          VALUES (
            $1,$2,$3,$4,$5,$6,$7,$8,$9
          )
          RETURNING id
          `,
          [
            owner.first_name,
            owner.last_name,
            owner.email || null,
            owner.phone,
            owner.address || null,
            owner.city || null,
            owner.county || null,
            owner.state || null,
            owner.zip_code || null
          ]
        );

        finalOwnerId = ownerResult.rows[0].id;
      }
    }


    // ------------------------------------------------------------
    // FETCH ALL HISTORICAL ANIMALS FOR THIS OWNER
    // ------------------------------------------------------------
    let existingAnimals = [];

    if (finalOwnerId) {

      const existingAnimalsResult = await client.query(
        `
        SELECT
          id,
          name,
          species
        FROM animals
        WHERE owner_id = $1
        `,
        [finalOwnerId]
      );

      existingAnimals = existingAnimalsResult.rows;
    }


    // ------------------------
    // CASE 2: PROCESS ANIMALS
    // ------------------------
    for (const animal of animals) {

      if (!animal.name) continue;


      const matchedAnimal = existingAnimals.find(ea =>
        ea.name?.trim().toLowerCase() ===
          animal.name?.trim().toLowerCase()
        &&
        ea.species?.trim().toLowerCase() ===
          animal.species?.trim().toLowerCase()
      );


      if (matchedAnimal) {

        // ------------------------
        // UPDATE EXISTING ANIMAL
        // ------------------------
        await client.query(
          `
          UPDATE animals
          SET
            clinic_id = $1,

            sex = $2,
            primary_breed = $3,
            secondary_breed = $4,

            altered_status = $5,

            age_years = $6,
            age_months = $7,

            primary_color = $8,
            secondary_color = $9,
            pattern = $10,

            microchip_number = $11,
            microchip_issuer = $12

          WHERE id = $13
          `,
          [
            clinic_id,

            clean(animal.sex),
            clean(animal.primary_breed),
            clean(animal.secondary_breed),

            animal.altered_status,

            animal.age_years,
            animal.age_months,

            clean(animal.primary_color),
            clean(animal.secondary_color),
            clean(animal.pattern),

            clean(animal.microchip_number),
            clean(animal.microchip_issuer),

            matchedAnimal.id
          ]
        );


      } else {

        // ------------------------
        // INSERT NEW ANIMAL
        // ------------------------
        await client.query(
          `
          INSERT INTO animals (

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

            pattern,

            microchip_number,
            microchip_issuer

          )

          VALUES (
            $1,$2,$3,$4,$5,
            $6,$7,$8,$9,$10,
            $11,$12,$13,$14,$15
          )
          `,
          [
            finalOwnerId,
            clinic_id,

            animal.name,
            clean(animal.species),
            clean(animal.sex),

            animal.altered_status,

            clean(animal.primary_breed),
            clean(animal.secondary_breed),

            animal.age_years,
            animal.age_months,

            clean(animal.primary_color),
            clean(animal.secondary_color),

            clean(animal.pattern),

            clean(animal.microchip_number),
            clean(animal.microchip_issuer)
          ]
        );
      }
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