const pool = require('../db');
const XLSX = require('xlsx');

// -----------------------------------
// CREATE CLINIC
// -----------------------------------
exports.createClinic = async (req, res) => {
  try {
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
      default_veterinarian_id, // 🔍 Aliased to match your incoming frontend property name
      notes
    } = req.body;

    const result = await pool.query(
      `
      INSERT INTO clinics (
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
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9, $10,
        $11, $12
      )
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
        default_veterinarian_id || null, // 🎯 Passes the incoming ID cleanly to parameter $11
        notes
      ]
    );

    res.status(201).json({
      success: true,
      clinic: result.rows[0]
    });

  } catch (err) {
    console.error(err);

    res.status(500).json({
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
    const result = await pool.query(`
      SELECT *
      FROM clinics
      ORDER BY clinic_date DESC, start_time DESC
    `);

    res.json(result.rows);

  } catch (err) {
    console.error(err);

    res.status(500).json({
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
    const { id } = req.params;

    const clinicResult = await pool.query(
      `SELECT * FROM clinics WHERE id = $1`,
      [id]
    );

    if (clinicResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Clinic not found' });
    }

    const clinic = clinicResult.rows[0];

    const statsResult = await pool.query(
      `
      SELECT
        (SELECT COUNT(DISTINCT o.id) FROM owners o INNER JOIN animals a ON a.owner_id = o.id WHERE a.clinic_id = $1) AS registered_owners,
        (SELECT COUNT(*) FROM animals WHERE clinic_id = $1) AS registered_animals
      `,
      [id]
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

      start_time: clinic.start_time ? clinic.start_time.toString().slice(0, 5) : '',
      end_time: clinic.end_time ? clinic.end_time.toString().slice(0, 5) : '',

      registered_owners: Number(stats.registered_owners || 0),
      registered_animals: Number(stats.registered_animals || 0),

      offerings: clinic.offerings || {} 
    };

    return res.json(response);

  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// -----------------------------------
// SEARCH CLINIC OWNERS
// -----------------------------------
exports.searchClinicOwners = async (req, res) => {
  const { id } = req.params;
  const search = req.query.query;

  try {
    const result = await pool.query(
      `
      SELECT
        owners.id AS owner_id,
        CONCAT(owners.first_name, ' ', owners.last_name) AS owner_name,
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
              'age', CONCAT(
                COALESCE(animals.age_years::text, ''),
                'y ',
                COALESCE(animals.age_months::text, ''),
                'm'
              ),
              'color', animals.primary_color,
              'pattern', animals.pattern,
              'rabies_tag_number', animals.rabies_tag_number,
              'microchip_number', animals.microchip_number
            )
          ) FILTER (WHERE animals.id IS NOT NULL),
          '[]'
        ) AS animals

      FROM owners
      INNER JOIN animals
        ON animals.owner_id = owners.id

      WHERE animals.clinic_id = $1
      AND (
        LOWER(owners.first_name) LIKE LOWER($2)
        OR LOWER(owners.last_name) LIKE LOWER($2)
        OR LOWER(CONCAT(owners.first_name, ' ', owners.last_name)) LIKE LOWER($2)
        OR LOWER(owners.email) LIKE LOWER($2)
        OR LOWER(owners.phone) LIKE LOWER($2)
        OR LOWER(owners.address) LIKE LOWER($2)
        OR LOWER(animals.name) LIKE LOWER($2)
      )

      GROUP BY owners.id
      ORDER BY owner_name ASC
      `,
      [id, `%${search}%`]
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to search clinic owners' });
  }
};

// -----------------------------------
// UPDATE CLINIC
// -----------------------------------
exports.updateClinic = async (req, res) => {
  try {
    const { id } = req.params;

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
      default_veterinarian_id, // 🔍 Captures the incoming frontend property name
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
        default_veterinarian_id || null, // 🎯 Passes the incoming ID cleanly to parameter $11
        notes,
        id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Clinic not found' });
    }

    res.json({
      success: true,
      clinic: result.rows[0]
    });

  } catch (err) {
    console.error(err);

    res.status(500).json({
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
    const { id } = req.params;

    const result = await pool.query(
      `
      SELECT
        -- OWNER
        o.first_name AS person_first_name,
        o.last_name AS person_last_name,
        o.phone AS phone,
        o.email AS email,

        o.address AS address,
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
        a.altered_status,
        a.primary_color,
        a.secondary_color,
        a.pattern,
        a.microchip_number,

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

        -- 🔥 CONDITIONAL FALLBACK: If date_time_administered is missing, fall back to the clinic's date
        COALESCE(v.date_time_administered::date, c.clinic_date) AS date_vaccinated,
        v.date_time_due::date AS vaccination_expires,

        v.product_expiration_date,

        -- CLINIC CONTEXT
        c.name AS vaccine_location

      FROM animals a
      JOIN owners o ON o.id = a.owner_id
      JOIN clinics c ON c.id = a.clinic_id
      LEFT JOIN vaccinations v ON v.animal_id = a.id AND v.is_active = true

      WHERE c.id = $1
      ORDER BY o.last_name, o.first_name
      `,
      [id]
    );

    const rows = result.rows;

    if (!rows.length) {
      return res.status(404).json({
        success: false,
        error: 'No data found for clinic'
      });
    }

    // -----------------------------
    // CREATE EXCEL FILE
    // -----------------------------
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Clinic Export');

    const buffer = XLSX.write(workbook, {
      type: 'buffer',
      bookType: 'xlsx'
    });

    // -----------------------------
    // SEND FILE
    // -----------------------------
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
    console.error(err);

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
    const { id } = req.params;

    const result = await pool.query(
      `
      DELETE FROM clinics
      WHERE id = $1
      RETURNING *
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Clinic not found'
      });
    }

    res.json({
      success: true,
      clinic: result.rows[0]
    });

  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};