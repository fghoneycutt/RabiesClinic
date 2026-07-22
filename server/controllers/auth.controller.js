const db = require('../db');
const { hashPassword, comparePassword } = require('../auth/password');
const { signToken, verifyToken } = require('../auth/jwt');

// -----------------------------
// LOGIN
// -----------------------------
async function login(req, res) {
  const { email, password } = req.body;

  try {
    const result = await db.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const valid = await comparePassword(password, user.password_hash);

    if (!valid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = signToken(user);

    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      }
    });

  } catch (err) {
    console.error('LOGIN ERROR:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}

// -----------------------------
// REGISTER
// -----------------------------
async function register(req, res) {

  const {
    email,
    password,
    role = 'staff',
    name = null,
    license_number = null
  } = req.body;

  try {
    // 🔥 CHECK IF USERS EXIST
    const userCount = await db.query('SELECT COUNT(*) FROM users');
    const isFirstUser = userCount.rows[0].count === '0';

    // 🔐 IF NOT FIRST USER → REQUIRE AUTH
    if (!isFirstUser) {
      const header = req.headers.authorization;

      if (!header || !header.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Missing token' });
      }

      const token = header.split(' ')[1];
      const decoded = verifyToken(token);

      if (decoded.role !== 'admin') {
        return res.status(403).json({ message: 'Admin only' });
      }
    }

    // ❗ check existing user
    const existing = await db.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const password_hash = await hashPassword(password);

    const result = await db.query(
      `
        INSERT INTO users (
          email,
          password_hash,
          role,
          name,
          license_number
        )
        VALUES ($1, $2, $3, $4, $5)
        RETURNING
          id,
          email,
          role,
          name,
          license_number
      `,
      [email,
      password_hash,
      role,
      name,
      license_number]
    );

    return res.status(201).json(result.rows[0]);

  } catch (err) {
    console.error('REGISTER ERROR:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}

async function me(req, res) {
  try {
    const result = await db.query(
      `
      SELECT
        id,
        email,
        role,
        name
      FROM users
      WHERE id = $1
      `,
      [req.user.id]
    );

    const user = result.rows[0];

    if (!user) {
      return res
        .status(404)
        .json({ message: 'User not found' });
    }

    return res.json(user);

  } catch (err) {
    console.error('ME ERROR:', err);

    return res
      .status(500)
      .json({ message: 'Server error' });
  }
}

module.exports = {
  login,
  register,
  me
};