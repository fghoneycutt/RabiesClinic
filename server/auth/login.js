const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db'); // adjust if your db import differs

async function login(req, res) {
  const { email, password } = req.body;

  try {
    const user = await db('users')
      .where({ email })
      .first();

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const passwordValid = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!passwordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      {
        userId: user.id,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      }
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
}

module.exports = { login };