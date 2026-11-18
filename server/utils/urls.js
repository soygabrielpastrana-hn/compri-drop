export const clientUrl = () => (process.env.CLIENT_URL || 'http://localhost:5173').split(',')[0].trim();
export const serverUrl = () => process.env.SERVER_URL || 'http://localhost:4000';
