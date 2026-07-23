const db = require('../db');
const { hashPassword } = require('../auth/password');

async function createUser(req, res) {
  const { email, password, role, name, license_number } = req.body;

  try {
    // 1. Check if user exists using your existing DB abstraction helper
    const existing = await db.users.findByEmail(email);
    if (existing) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const password_hash = await hashPassword(password);

    // 2. CONFORMANCE FIX: Use explicit SQL to guarantee license_number matches the table columns
    const result = await db.query(`
      INSERT INTO users (email, password_hash, role, name, license_number)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, name, email, role, license_number, created_at
    `, [email, password_hash, role || 'staff', name || null, license_number || null]);

    // Returns the exact raw data structure your frontend expects
    res.json(result.rows[0]);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
}

async function listUsers(req, res) {
  try {
    const result = await db.query(`
      SELECT
        id,
        name,
        email,
        role,
        license_number,
        signature IS NOT NULL AS signature,
        created_at
      FROM users
      ORDER BY created_at DESC
    `);

    return res.json(result.rows);

  } catch (err) {
    console.error('LIST USERS ERROR:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}

async function editUser(req, res) {
  const { id } = req.params;
  const { name, email, role, license_number } = req.body;

  try {
    const userCheck = await db.query('SELECT id FROM users WHERE id = $1', [id]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (email) {
      const emailCheck = await db.query(
        'SELECT id FROM users WHERE email = $1 AND id <> $2', 
        [email, id]
      );
      if (emailCheck.rows.length > 0) {
        return res.status(400).json({ message: 'Email is already in use by another account' });
      }
    }

    // PERFECT CONFORMANCE: Explicitly clears or saves varchar strings natively
    const result = await db.query(`
      UPDATE users
      SET
        name = COALESCE($1, name),
        email = COALESCE($2, email),
        role = COALESCE($3, role),
        license_number = $4, 
        created_at = created_at -- Preserves the original timestamp safely
      WHERE id = $5
      RETURNING id, name, email, role, license_number, created_at
    `, [name, email, role, license_number || null, id]);

    return res.json(result.rows[0]);

  } catch (err) {
    console.error('EDIT USER ERROR:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}

async function uploadSignature(req, res) {
  const { id } = req.params;

  try {
    if (!req.file) {
      return res.status(400).json({
        message: 'No signature file uploaded.'
      });
    }

    if (
      req.file.mimetype !== 'image/png' &&
      req.file.mimetype !== 'image/jpeg'
    ) {
      return res.status(400).json({
        message: 'Signature must be a PNG or JPEG image.'
      });
    }

    const userCheck = await db.query(
      'SELECT id FROM users WHERE id = $1',
      [id]
    );

    if (userCheck.rows.length === 0) {
      return res.status(404).json({
        message: 'User not found.'
      });
    }

    await db.query(
      `
      UPDATE users
      SET signature = $1
      WHERE id = $2
      `,
      [req.file.buffer, id]
    );

    return res.json({
      message: 'Signature uploaded successfully.'
    });

  } catch (err) {
    console.error('UPLOAD SIGNATURE ERROR:', err);
    return res.status(500).json({
      message: 'Server error'
    });
  }
}

async function getSignature (req, res) {
  try {
    const result = await db.query(
      `
      SELECT signature
      FROM users
      WHERE id = $1
      `,
      [req.params.id]
    );

    if (!result.rows.length || !result.rows[0].signature) {
      return res.sendStatus(404);
    }

    const signature = result.rows[0].signature;

    // PNG/JPEG detection
    if (
      signature[0] === 0x89 &&
      signature[1] === 0x50 &&
      signature[2] === 0x4e &&
      signature[3] === 0x47
    ) {
      res.type('png');
    } else {
      res.type('jpeg');
    }

    res.send(signature);

  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: 'Failed to retrieve signature'
    });
  }
};

async function deleteUser(req, res) {
  try {
    const { id } = req.params;

    const result = await db.query(
      `
      DELETE FROM users
      WHERE id = $1
      RETURNING id, email, name
      `,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    res.json({
      message: 'User deleted successfully',
      user: result.rows[0]
    });

  } catch (err) {
    console.error('Delete user error:', err);

    res.status(500).json({
      message: 'Failed to delete user'
    });
  }
};

module.exports = {
  createUser, 
  listUsers, 
  editUser,
  uploadSignature,
  getSignature,
  deleteUser
};