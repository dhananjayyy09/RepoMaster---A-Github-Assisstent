import createApp from './app';
import { config } from './config';

const app = createApp();

const startServer = () => {
  const port = config.port;
  
  app.listen(port, () => {
    console.log(`🚀 Server running on port ${port}`);
    console.log(`📊 Environment: ${config.env}`);
    console.log(`🔗 Health check: http://localhost:${port}/api/health`);
  });
};

startServer();
