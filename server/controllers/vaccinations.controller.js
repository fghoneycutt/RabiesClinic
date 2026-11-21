
const pool = require('../db');
const { generateRabiesForm } = require('../utils/generateRabiesForm');
const { PDFDocument } = require('pdf-lib');

const ALLOWED_FIELDS = new Set([
  'animal_id',
  'vaccine_type',
  'product',
  'manufacturer',
  'rabies_tag_number',
  'lot_number',
  'product_expiration_date',
  'notes',
  'vaccinated_by',
  'supervising_veterinarian',
  'date_time_administered',
  'date_time_due'
]);

// -----------------------------
// CREATE VACCINATION
// -----------------------------
async function createVaccination(req, res) {
  const client = await pool.connect();

  try {
    const organizationId = req.organizationId;

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: 'Organization context is required.'
      });
    }

    const {
      animal_id,
      clinic_id,
      vaccine_type,
      product,
      rabies_tag_number,
      lot_number,
      product_expiration_date,
      notes,
      vaccinated_by,
      supervising_veterinarian,
      date_time_administered,
      date_time_due,
      manufacturer
    } = req.body;

    if (!animal_id) {
      return res.status(400).json({
        success: false,
        message: 'Animal ID is required.'
      });
    }

    await client.query('BEGIN');

    // Verify animal belongs to the active organization.
    const animalResult = await client.query(
      `
        SELECT id
        FROM animals
        WHERE id = $1
          AND organization_id = $2
      `,
      [animal_id, organizationId]
    );

    if (animalResult.rows.length === 0) {
      await client.query('ROLLBACK');

      return res.status(404).json({
        success: false,
        message: 'Animal not found.'
      });
    }

    // Verify clinic belongs to the active organization, if supplied.
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

        return res.status(404).json({
          success: false,
          message: 'Clinic not found.'
        });
      }
    }

    // Extract manufacturer from product when not explicitly supplied.
    function extractManufacturer(productString) {
      if (!productString) return null;

      const match = productString.match(/\(([^)]+)\)$/);

      if (match) {
        return match[1].trim();
      }

      if (productString.includes(' - ')) {
        return productString
          .split(' - ')
          .slice(1)
          .join(' - ')
          .trim();
      }

      return null;
    }

    const finalManufacturer =
      manufacturer || extractManufacturer(product);

    // Insert vaccination with organization ownership.
    const result = await client.query(
      `
        INSERT INTO vaccinations (
          organization_id,
          animal_id,
          vaccine_type,
          product,
          rabies_tag_number,
          lot_number,
          product_expiration_date,
          notes,
          vaccinated_by,
          supervising_veterinarian,
          date_time_administered,
          date_time_due,
          manufacturer
        )
        VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13
        )
        RETURNING *
      `,
      [
        organizationId,
        animal_id,
        vaccine_type,
        product,
        rabies_tag_number || null,
        lot_number || null,
        product_expiration_date || null,
        notes || null,
        vaccinated_by || null,
        supervising_veterinarian || null,
        date_time_administered,
        date_time_due || null,
        finalManufacturer
      ]
    );

    // Synchronize the animal's clinic_id when a clinic was supplied.
    if (clinic_id) {
      await client.query(
        `
          UPDATE animals
          SET clinic_id = $1
          WHERE id = $2
            AND organization_id = $3
            AND clinic_id IS DISTINCT FROM $1
        `,
        [clinic_id, animal_id, organizationId]
      );
    }

    await client.query('COMMIT');

    return res.status(201).json({
      success: true,
      vaccination: result.rows[0]
    });

  } catch (err) {
    await client.query('ROLLBACK');

    console.error('CREATE VACCINATION ERROR:', err);

    return res.status(500).json({
      success: false,
      message: 'Failed to create vaccination.'
    });

  } finally {
    client.release();
  }
}

// -----------------------------
// UPDATE VACCINATION
// -----------------------------
async function updateVaccination(req, res) {
  const client = await pool.connect();

  try {
    const organizationId = req.organizationId;
    const { id } = req.params;

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: 'Organization context is required.'
      });
    }

    // Only permit explicitly approved fields.
    const allowedBody = Object.fromEntries(
      Object.entries(req.body).filter(([key]) =>
        ALLOWED_FIELDS.has(key)
      )
    );

    const keys = Object.keys(allowedBody);
    const values = Object.values(allowedBody);

    if (keys.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields provided.'
      });
    }

    await client.query('BEGIN');

    // Verify vaccination belongs to the active organization.
    const existingResult = await client.query(
      `
        SELECT id
        FROM vaccinations
        WHERE id = $1
          AND organization_id = $2
      `,
      [id, organizationId]
    );

    if (existingResult.rows.length === 0) {
      await client.query('ROLLBACK');

      return res.status(404).json({
        success: false,
        message: 'Vaccination record not found.'
      });
    }

    // If animal_id is being changed, verify the new animal.
    if (allowedBody.animal_id) {
      const animalResult = await client.query(
        `
          SELECT id
          FROM animals
          WHERE id = $1
            AND organization_id = $2
        `,
        [allowedBody.animal_id, organizationId]
      );

      if (animalResult.rows.length === 0) {
        await client.query('ROLLBACK');

        return res.status(404).json({
          success: false,
          message: 'Animal not found.'
        });
      }
    }

    const setClause = keys
      .map((key, index) => `"${key}" = $${index + 1}`)
      .join(', ');

    const result = await client.query(
      `
        UPDATE vaccinations
        SET ${setClause}
        WHERE id = $${keys.length + 1}
          AND organization_id = $${keys.length + 2}
        RETURNING *
      `,
      [...values, id, organizationId]
    );

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');

      return res.status(404).json({
        success: false,
        message: 'Vaccination record not found.'
      });
    }

    await client.query('COMMIT');

    return res.json({
      success: true,
      vaccination: result.rows[0]
    });

  } catch (err) {
    await client.query('ROLLBACK');

    console.error('UPDATE VACCINATION ERROR:', err);

    return res.status(500).json({
      success: false,
      message: 'Failed to update vaccination.'
    });

  } finally {
    client.release();
  }
}

// -----------------------------
// DELETE VACCINATION
// -----------------------------
async function deleteVaccination(req, res) {
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
        DELETE FROM vaccinations
        WHERE id = $1
          AND organization_id = $2
        RETURNING *
      `,
      [id, organizationId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Vaccination not found.'
      });
    }

    return res.json({
      success: true,
      deleted: result.rows[0]
    });

  } catch (err) {
    console.error('DELETE VACCINATION ERROR:', err);

    return res.status(500).json({
      success: false,
      message: 'Failed to delete vaccination.',
      error: err.message
    });
  }
}

// -----------------------------
// GENERATE RABIES CERTIFICATE PDF
// -----------------------------
async function generateRabiesCertificatePdf(
  vaccinationId,
  organizationId
) {
  if (!vaccinationId) {
    throw new Error('Vaccination ID parameter is required.');
  }

  if (!organizationId) {
    throw new Error('Organization context is required.');
  }

  const query = `
    SELECT
      v.id AS vac_id,
      v.vaccine_type,
      v.product,
      v.lot_number,
      v.product_expiration_date,
      v.manufacturer,
      v.vaccinated_by,
      v.supervising_veterinarian,
      v.date_time_administered,
      v.date_time_due,
      v.rabies_tag_number AS vac_tag,

      u.signature AS vaccinated_by_signature,
      u.license_number AS vaccinated_by_license_number,

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
      a.microchip_issuer,
      a.size_category,
      a.approximate_weight,

      o.first_name,
      o.last_name,
      o.email,
      o.phone,
      o.address AS owner_address,
      o.city AS owner_city,
      o.state AS owner_state,
      o.zip_code AS owner_zip,

      c.offerings -> v.vaccine_type ->> 'dose_type' AS dose_type,

      c.name AS clinic_name,
      c.address AS clinic_address,
      c.city AS clinic_city,
      c.state AS clinic_state,
      c.zip_code AS clinic_zip

    FROM public.vaccinations v

    INNER JOIN public.animals a
      ON v.animal_id = a.id
      AND v.organization_id = a.organization_id

    INNER JOIN public.owners o
      ON a.owner_id = o.id
      AND a.organization_id = o.organization_id

    LEFT JOIN public.clinics c
      ON a.clinic_id = c.id
      AND a.organization_id = c.organization_id

    LEFT JOIN public.users u
      ON v.vaccinated_by = u.name
      AND v.organization_id = u.organization_id

    WHERE v.id = $1
      AND v.organization_id = $2
      AND v.is_active = true

    LIMIT 1;
  `;

  const result = await pool.query(
    query,
    [vaccinationId, organizationId]
  );

  if (result.rows.length === 0) {
    throw new Error(
      'No active rabies vaccination record found matching that ID.'
    );
  }

  const row = result.rows[0];

  const data = {
    owner: {
      firstName: row.first_name,
      lastName: row.last_name,
      address: row.owner_address || '—',
      city: row.owner_city || '—',
      state: row.owner_state || '—',
      zip: row.owner_zip || '—',
      phone: row.phone || '—'
    },

    animal: {
      name: row.animal_name,
      species: row.species || '—',

      colors: [
        row.primary_color,
        row.secondary_color,
        row.pattern
      ]
        .filter(Boolean)
        .join(' / ') || '—',

      breed: [
        row.primary_breed,
        row.secondary_breed
      ]
        .filter(Boolean)
        .join(' x ') || 'Mixed Breed',

      sex: row.sex || '—',
      neutered: !!row.altered_status,

      age: row.age_years
        ? String(row.age_years)
        : row.age_months
        ? String(row.age_months)
        : '0',

      ageUnit: row.age_years
        ? 'Years'
        : 'Months',

      size: row.size_category || '—',
      approximate_weight: row.approximate_weight,

      microchip: row.microchip_number || '—',
      microchipManufacturer: row.microchip_issuer || ''
    },

    vaccine: {
      product: row.product,
      manufacturer: row.manufacturer || '—',
      lotNumber: row.lot_number || '—',
      serialNumber: '—',

      expirationDate: row.product_expiration_date
        ? new Date(row.product_expiration_date)
            .toISOString()
            .split('T')[0]
        : '—',

      dateVaccinated: row.date_time_administered
        ? new Date(row.date_time_administered)
            .toISOString()
            .split('T')[0]
        : '—',

      nextDueDate: row.date_time_due
        ? new Date(row.date_time_due)
            .toISOString()
            .split('T')[0]
        : '—',

      doseType: row.dose_type || '—',

      isBooster:
        row.vaccine_type === 'rabies_3_year'
    },

    vet: {
      name: row.vaccinated_by || '—',

      licenseNumber:
        row.vaccinated_by_license_number || '—',

      address:
        'Person County Animal Services - 2103 Chub Lake Rd, Roxboro, NC 27574',

      administeredBy: row.vaccinated_by || '—',

      signature: row.vaccinated_by_signature || null
    },

    clinic: {
      rabiesTagNumber: row.vac_tag || '—'
    }
  };

  return await generateRabiesForm(data);
}

// -----------------------------
// GENERATE SINGLE RABIES CERTIFICATE
// -----------------------------
async function generateRabiesCertificate(req, res) {
  try {
    const organizationId = req.organizationId;
    const vaccinationId = req.params.id;

    if (!organizationId) {
      return res.status(400).json({
        message: 'Organization context is required.'
      });
    }

    if (!vaccinationId) {
      return res.status(400).json({
        message: 'Vaccination ID parameter is required.'
      });
    }

    const pdfBytes = await generateRabiesCertificatePdf(
      vaccinationId,
      organizationId
    );

    res.setHeader(
      'Content-Type',
      'application/pdf'
    );

    res.setHeader(
      'Content-Disposition',
      'inline; filename=rabies_certificate.pdf'
    );

    return res.send(Buffer.from(pdfBytes));

  } catch (error) {
    console.error(
      'GENERATE RABIES CERTIFICATE ERROR:',
      error
    );

    return res.status(500).json({
      message: 'Failed to generate rabies certificate.'
    });
  }
}

// -----------------------------
// GENERATE ALL RABIES CERTIFICATES FOR OWNER
// -----------------------------
async function generateOwnerRabiesCertificates(req, res) {
  try {
    const organizationId = req.organizationId;
    const ownerId = req.params.ownerId;
    const clinicId = req.params.clinicId;

    if (!organizationId) {
      return res.status(400).json({
        message: 'Organization context is required.'
      });
    }

    if (!ownerId) {
      return res.status(400).json({
        message: 'Owner ID parameter is required.'
      });
    }

    if (!clinicId) {
      return res.status(400).json({
        message: 'Clinic ID parameter is required.'
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
        message: 'Owner not found.'
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
      [clinicId, organizationId]
    );

    if (clinicResult.rows.length === 0) {
      return res.status(404).json({
        message: 'Clinic not found.'
      });
    }

    // Find active rabies vaccinations for this owner's animals
    // registered to this clinic, within the active organization.
    const query = `
      SELECT
        v.id

      FROM public.vaccinations v

      INNER JOIN public.animals a
        ON v.animal_id = a.id
        AND v.organization_id = a.organization_id

      WHERE a.owner_id = $1
        AND a.clinic_id = $2
        AND v.organization_id = $3
        AND a.organization_id = $3
        AND v.is_active = true
        AND v.vaccine_type IN (
          'rabies_1_year',
          'rabies_3_year'
        )

      ORDER BY
        a.name,
        v.date_time_administered DESC;
    `;

    const result = await pool.query(
      query,
      [ownerId, clinicId, organizationId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: 'No rabies certificates found for this owner at this clinic.'
      });
    }

    // Create blank PDF container.
    const mergedPdf = await PDFDocument.create();

    // Generate each certificate and append its pages.
    for (const row of result.rows) {
      const pdfBytes = await generateRabiesCertificatePdf(
        row.id,
        organizationId
      );

      const pdf = await PDFDocument.load(pdfBytes);

      const copiedPages = await mergedPdf.copyPages(
        pdf,
        pdf.getPageIndices()
      );

      copiedPages.forEach(page => {
        mergedPdf.addPage(page);
      });
    }

    const mergedBytes = await mergedPdf.save();

    res.setHeader(
      'Content-Type',
      'application/pdf'
    );

    res.setHeader(
      'Content-Disposition',
      `inline; filename=rabies_certificates_owner_${ownerId}_clinic_${clinicId}.pdf`
    );

    return res.send(Buffer.from(mergedBytes));

  } catch (error) {
    console.error(
      'GENERATE OWNER RABIES CERTIFICATES ERROR:',
      error
    );

    return res.status(500).json({
      message: 'Failed to generate owner rabies certificates.'
    });
  }
}

module.exports = {
  createVaccination,
  updateVaccination,
  deleteVaccination,
  generateRabiesCertificate,
  generateRabiesCertificatePdf,
  generateOwnerRabiesCertificates
};