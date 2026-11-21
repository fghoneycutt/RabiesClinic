
const pool = require('../db');

exports.createIntake = async (req, res) => {
  const organizationId = req.organizationId;

  if (!organizationId) {
    return res.status(400).json({
      success: false,
      message: 'Organization context is required.'
    });
  }

  const {
    owner,
    owner_id,
    animals,
    clinic_id
  } = req.body;

  if (!Array.isArray(animals)) {
    return res.status(400).json({
      success: false,
      message: 'Animals must be provided as an array.'
    });
  }

  const clean = (value) =>
    value === '' || value === undefined
      ? null
      : value;

  const client = await pool.connect();
  let transactionStarted = false;

  try {
    await client.query('BEGIN');
    transactionStarted = true;

    // ------------------------
    // VERIFY CLINIC
    // ------------------------
    if (clinic_id) {
      const clinicResult = await client.query(
        `
          SELECT id
          FROM clinics
          WHERE id = $1
            AND organization_id = $2
        `,
        [clinic_id, organizationId]
      );

      if (clinicResult.rows.length === 0) {
        await client.query('ROLLBACK');
        transactionStarted = false;

        return res.status(404).json({
          success: false,
          message: 'Clinic not found.'
        });
      }
    }

    let finalOwnerId = owner_id || null;

    // ------------------------
    // VERIFY EXISTING OWNER
    // ------------------------
    if (finalOwnerId) {
      const ownerResult = await client.query(
        `
          SELECT id
          FROM owners
          WHERE id = $1
            AND organization_id = $2
        `,
        [finalOwnerId, organizationId]
      );

      if (ownerResult.rows.length === 0) {
        await client.query('ROLLBACK');
        transactionStarted = false;

        return res.status(404).json({
          success: false,
          message: 'Owner not found.'
        });
      }
    }

    // ------------------------
    // CASE 1: FIND OR CREATE OWNER
    // ------------------------
    if (!finalOwnerId) {
      if (!owner?.first_name || !owner?.last_name) {
        await client.query('ROLLBACK');
        transactionStarted = false;

        return res.status(400).json({
          success: false,
          message: 'Owner first and last names are required.'
        });
      }

      const conditions = [];
      const params = [
        owner.first_name,
        owner.last_name,
        organizationId
      ];

      let paramIndex = 4;

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
            WHERE organization_id = $3
              AND LOWER(first_name) = LOWER($1)
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
              organization_id,
              first_name,
              last_name,
              email,
              phone,
              address,
              secondary_address,
              city,
              county,
              state,
              zip_code
            )
            VALUES (
              $1,$2,$3,$4,$5,$6,
              $7,$8,$9,$10,$11
            )
            RETURNING id
          `,
          [
            organizationId,
            owner.first_name,
            owner.last_name,
            clean(owner.email),
            clean(owner.phone),
            clean(owner.address),
            clean(owner.secondary_address),
            clean(owner.city),
            clean(owner.county),
            clean(owner.state),
            clean(owner.zip_code)
          ]
        );

        finalOwnerId = ownerResult.rows[0].id;
      }
    }

    // ------------------------------------------------------------
    // FETCH ALL HISTORICAL ANIMALS FOR THIS OWNER
    // WITHIN THIS ORGANIZATION
    // ------------------------------------------------------------
    const existingAnimalsResult = await client.query(
      `
        SELECT
          id,
          name,
          species
        FROM animals
        WHERE owner_id = $1
          AND organization_id = $2
      `,
      [finalOwnerId, organizationId]
    );

    const existingAnimals = existingAnimalsResult.rows;

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
              approximate_weight = $8,

              primary_color = $9,
              secondary_color = $10,
              pattern = $11,

              microchip_number = $12,
              microchip_issuer = $13

            WHERE id = $14
              AND organization_id = $15
              AND owner_id = $16
          `,
          [
            clinic_id,

            clean(animal.sex),
            clean(animal.primary_breed),
            clean(animal.secondary_breed),

            animal.altered_status,

            clean(animal.age_years),
            clean(animal.age_months),
            clean(animal.approximate_weight),

            clean(animal.primary_color),
            clean(animal.secondary_color),
            clean(animal.pattern),

            clean(animal.microchip_number),
            clean(animal.microchip_issuer),

            matchedAnimal.id,
            organizationId,
            finalOwnerId
          ]
        );

      } else {
        // ------------------------
        // INSERT NEW ANIMAL
        // ------------------------
        await client.query(
          `
            INSERT INTO animals (
              organization_id,
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
              approximate_weight,

              primary_color,
              secondary_color,

              pattern,

              microchip_number,
              microchip_issuer
            )
            VALUES (
              $1,$2,$3,$4,$5,$6,
              $7,$8,$9,$10,$11,$12,
              $13,$14,$15,$16,$17
            )
          `,
          [
            organizationId,
            finalOwnerId,
            clinic_id,

            animal.name,
            clean(animal.species),
            clean(animal.sex),

            animal.altered_status,

            clean(animal.primary_breed),
            clean(animal.secondary_breed),

            clean(animal.age_years),
            clean(animal.age_months),
            clean(animal.approximate_weight),

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
    transactionStarted = false;

    return res.json({
      success: true,
      owner_id: finalOwnerId
    });

  } catch (err) {
    if (transactionStarted) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        console.error('INTAKE ROLLBACK ERROR:', rollbackError);
      }
    }

    console.error('CREATE INTAKE ERROR:', err);

    return res.status(500).json({
      success: false,
      message: 'Failed to process intake'
    });

  } finally {
    client.release();
  }
};