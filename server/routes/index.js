
const ownersRoutes = require('./owners.routes');
const animalsRoutes = require('./animals.routes');
const vaccinationsRoutes = require('./vaccinations.routes');
const authRoutes = require('./auth.routes');
const clinicsRoutes = require('./clinics.routes');
const intakeRoutes = require('./intake.routes');
const usersRoutes = require('./users.routes');
const formsRoutes = require('./forms.routes.js');
const slideRoutes = require('./lobbySlides.routes.js');
const adminRoutes = require('./admin.routes.js');
const catTrapRentalsRoutes = require('./catTrapRentals.routes');
const signingStationsRoutes = require('./signingStations.routes');
const signingSessionsRoutes = require('./signingSessions.routes');

module.exports = (app) => {
  app.use('/api/auth', authRoutes);
  app.use('/api/users', usersRoutes);
  app.use('/api/admin', adminRoutes);

  app.use('/api/owners', ownersRoutes);
  app.use('/api/animals', animalsRoutes);

  app.use('/api/vaccinations', vaccinationsRoutes);

  app.use('/api/clinics', clinicsRoutes);
  app.use('/api/intake', intakeRoutes);

  app.use('/api/forms', formsRoutes);
  app.use('/api/slides', slideRoutes);

  app.use('/api/cat-trap-rentals', catTrapRentalsRoutes);
  app.use('/api/signing-stations', signingStationsRoutes);
  app.use('/api/signing-sessions', signingSessionsRoutes);
};
