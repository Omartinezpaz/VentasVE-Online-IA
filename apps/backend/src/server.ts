import http from 'http';
import dotenv from 'dotenv';
import app from './app';
import { initWebSocket } from './lib/websocket';

dotenv.config();

const PORT = process.env.PORT || 3001;

const server = http.createServer(app);
initWebSocket(server);

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
