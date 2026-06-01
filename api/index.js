import app from '../dist/server.cjs';

const handler = app.default || app;

export default handler;
