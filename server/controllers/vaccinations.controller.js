const pool = require('../db');
const { generateRabiesForm } = require('../utils/generateRabiesForm');

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

async function createVaccination(req, res) {
  try {
    const {
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
      manufacturer // ✅ NEW
    } = req.body;

    // fallback: derive from product if missing
    function extractManufacturer(productString) {
      if (!productString) return null;

      const match = productString.match(/\(([^)]+)\)$/);
      if (match) return match[1].trim();

      if (productString.includes(' - ')) {
        return productString.split(' - ').slice(1).join(' - ').trim();
      }

      return null;
    }

    const finalManufacturer = manufacturer || extractManufacturer(product);

    const result = await pool.query(
      `
      INSERT INTO vaccinations (
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
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12
      )
      RETURNING *
      `,
      [
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
        finalManufacturer
      ]
    );

    return res.json(result.rows[0]);

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      message: 'Failed to create vaccination'
    });
  }
}

async function updateVaccination(req, res) {
  try {
    const { id } = req.params;

    // ensure manufacturer is allowed
    ALLOWED_FIELDS.add('manufacturer');

    const allowedBody = Object.fromEntries(
      Object.entries(req.body).filter(([key]) =>
        ALLOWED_FIELDS.has(key)
      )
    );

    const keys = Object.keys(allowedBody);
    const values = Object.values(allowedBody);

    if (keys.length === 0) {
      return res.status(400).json({
        message: 'No valid fields provided'
      });
    }

    const setClause = keys
      .map((k, i) => `${k} = $${i + 1}`)
      .join(', ');

    const query = `
      UPDATE vaccinations
      SET ${setClause}
      WHERE id = $${keys.length + 1}
      RETURNING *
    `;

    const result = await pool.query(query, [
      ...values,
      id
    ]);

    return res.json(result.rows[0]);

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      message: 'Failed to update vaccination'
    });
  }
}

async function deleteVaccination(req, res) {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
      DELETE FROM vaccinations
      WHERE id = $1
      RETURNING *
      `,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Vaccination not found'
      });
    }

    res.json({
      success: true,
      deleted: result.rows[0]
    });

  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      message: 'Failed to delete vaccination',
      error: err.message
    });
  }
}

async function generateRabiesCertificate(req, res) {
  try {
    const vaccinationId = req.params.id; // Or req.query.id depending on your express route setup

    if (!vaccinationId) {
      return res.status(400).json({ message: 'Vaccination ID parameter is required' });
    }

    // Comprehensive relational query to match all tables
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
        a.size_category,
        
        o.first_name,
        o.last_name,
        o.email,
        o.phone,
        o.address AS owner_address,
        o.city AS owner_city,
        o.state AS owner_state,
        o.zip_code AS owner_zip,
        
        c.name AS clinic_name,
        c.address AS clinic_address,
        c.city AS clinic_city,
        c.state AS clinic_state,
        c.zip_code AS clinic_zip
      FROM public.vaccinations v
      INNER JOIN public.animals a ON v.animal_id = a.id
      INNER JOIN public.owners o ON a.owner_id = o.id
      LEFT JOIN public.clinics c ON a.clinic_id = c.id
      WHERE v.id = $1 AND v.is_active = true
      LIMIT 1;
    `;

    const result = await pool.query(query, [vaccinationId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        message: 'No active rabies vaccination record found matching that ID.' 
      });
    }

    const row = result.rows[0];

    // Build the dynamic payload payload with schema fallbacks mapping to pdf generator structural expectations
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
        // Dynamic structural composition string for colors/patterns
        colors: [row.primary_color, row.secondary_color, row.pattern]
          .filter(Boolean)
          .join(' / ') || '—',
        breed: [row.primary_breed, row.secondary_breed]
          .filter(Boolean)
          .join(' x ') || 'Mixed Breed',
        sex: row.sex || '—',
        neutered: !!row.altered_status,
        age: row.age_years ? String(row.age_years) : row.age_months ? String(row.age_months) : '0',
        ageUnit: row.age_years ? 'Years' : 'Months',
        size: row.size_category || '—',
        microchip: row.microchip_number || '—'
      },

      vaccine: {
        product: row.product,
        manufacturer: row.manufacturer || '—',
        lotNumber: row.lot_number || '—',
        serialNumber: '—', // Unused or mapping to alternative sequence fields
        expirationDate: row.product_expiration_date ? new Date(row.product_expiration_date).toISOString().split('T')[0] : '—',
        dateVaccinated: new Date(row.date_time_administered).toISOString().split('T')[0],
        nextDueDate: row.date_time_due ? new Date(row.date_time_due).toISOString().split('T')[0] : '—',
        doseType: row.vaccine_type === 'rabies_3_year' ? '3 Year' : '1 Year',
        isBooster: row.vaccine_type === 'rabies_3_year' // Logical deduction framework fallback
      },

      vet: {
        name: row.supervising_veterinarian || '—',
        licenseNumber: '—', 
        address: 'Person County Animal Services - 2103 Chub Lake Rd, Roxboro, NC 27574',
        administeredBy: row.vaccinated_by || '—'
      },

      clinic: {
        rabiesTagNumber: row.vac_tag || '—'
      }
    };

    // Feed real generated data engine structure to the pdf processor instance
    const pdfBytes = await generateRabiesForm(data);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename=rabies_cert_${row.last_name}_${row.animal_name}.pdf`
    );

    res.send(Buffer.from(pdfBytes));

  } catch (error) {
    console.error('Critical generation routine fault:', error);
    res.status(500).json({
      message: 'Failed to generate rabies certificate'
    });
  }
}

module.exports = {
  createVaccination,
  updateVaccination,
  deleteVaccination,
  generateRabiesCertificate
};