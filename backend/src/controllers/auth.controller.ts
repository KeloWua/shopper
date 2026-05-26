import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../config/db';

/**
 * USER REGISTRATION
 */
export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { name, email, password } = req.body;

        // 1.Input validation
        if(!name || !email || !password) {
            res.status(400).json({ ok: false, message: "All fields are required" });
            return;
        }

        // 2.Check registered email
        const userExist = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
        if(userExist.rows.length > 0) {
            res.status(409).json({ ok: false, message: "Email already exists" });
            return;
        }

        // 3.Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 4.Save into DATABASE
        const newUser = await pool.query(
            'INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id, name, email, role',
            [name, email, hashedPassword]
        );

        res.status(201).json({
            ok: true,
            user: newUser.rows[0],
        });
    } catch (err) {
        next(err);
    }
}

/**
 * LOGIN with HttpOnly secure cookie
 */
export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { email, password } = req.body;
        if(!email || !password) {
            res.status(400).json({
                ok: false,
                message: "Email and password required"
            });
            return;
        }
        
        // 1.Find user by email
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        const user = result.rows[0];
        if(!user) {
            res.status(401).json({ ok: false, message: "Invalid credentials" });
            return;
        }

        // 2.Compare password hash
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if(!isPasswordValid) {
            res.status(401).json({ ok: false, message: "Invalid credentials" });
            return;
        }

        // 3.Generate JSON Web Token
        const jwtSecret = process.env.JWT_SECRET || 'secret_fallback_hard_to_guess';
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            jwtSecret,
            { expiresIn: '24h' },
        );

        // 4.Establish HttpOnly secure cookie
        res.cookie('token', token, {
            httpOnly: true, // Avoid token stealth by XSS
            sameSite: 'none', // Allow cross-origin cookies
            maxAge: 24 * 60 * 60 * 1005, // 24hrs expiration in ms
        });

        res.json({
            ok: true,
            user: { id: user.id, name: user.name, email: user.email, role: user.role },
        });
    } catch (err) {
        next(err);
    }
};

/**
 * LOGOUT
 */
export const logout = (req: Request, res: Response): void => {

    // Clear the token cookie
    res.clearCookie('token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'none',
    });

    res.json({ ok: true, message: 'Logged out successfully'});
};