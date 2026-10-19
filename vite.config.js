import { defineConfig } from 'vite';
import fs from 'fs';

export default defineConfig({
  base: './',
  plugins: [{
    name: 'screenshot-endpoint',
    configureServer(server) {
      server.middlewares.use('/screenshot', (req, res) => {
        if (req.method === 'POST') {
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', () => {
            const base64Data = body.replace(/^data:image\/png;base64,/, '');
            fs.writeFile('screenshot_hub.png', base64Data, 'base64', () => {});
            res.statusCode = 200;
            res.end('ok');
          });
        } else {
          res.statusCode = 200;
          res.end('ok');
        }
      });
    }
  }]
});
