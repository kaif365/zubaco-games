export const appConfig = {
  port: parseInt(process.env.PORT || '3004', 10),
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-object-placement',
};
