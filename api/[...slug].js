import express from 'express';
const app = express();

app.get('/api/debug/test', (req, res) => {
    res.json({
        message: 'Express catch-all is working',
        timestamp: new Date().toISOString()
    });
});

export default app;
