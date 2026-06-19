const ownersRoutes = require('./owners.routes');
const animalsRoutes = require('./animals.routes');
const vaccinationsRoutes = require('./vaccinations.routes');
const authRoutes = require('./auth.routes');
const clinicsRoutes = require('./clinics.routes');
const intakeRoutes = require('./intake.routes');
const usersRoutes = require('./users.routes');

module.exports = (app) => {
  app.use('/api/auth', authRoutes);
  app.use('/api/users', usersRoutes);

  app.use('/api/owners', ownersRoutes);
  app.use('/api/animals', animalsRoutes);

  app.use('/api/vaccinations', vaccinationsRoutes);

  app.use('/api/clinics', clinicsRoutes);
  app.use('/api/intake', intakeRoutes);
};