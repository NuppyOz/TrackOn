import { app } from './app.js';

const port = 3000;

app.listen(port, '127.0.0.1', () => {
    console.log(`API de TrackOn disponible en http://localhost:${port}`);
})