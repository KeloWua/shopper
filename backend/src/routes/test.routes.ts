import { Router, Request, Response } from 'express';
import pool from '../config/db';

const router = Router();

router.get('/db-time', async (req: Request, res: Response) => {
    try {
        const result = await pool.query('SELECT NOW()');
        res.json({
            ok: true,
            message: 'DATABASE responds!',
            dbTime: result.rows[0].now
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ ok: false, error: 'Connection to DATABASE FAILED' });
    }
});

export default router;