const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
    // Expect header: "Authorization: Bearer <token>"
    const authHeader = req.header('Authorization');
    if (!authHeader) return res.status(401).json({ error: 'Access denied. No token provided.' });

    try {
        const token = authHeader.split(' ')[1]; // Remove "Bearer "
        if (!token) return res.status(401).json({ error: 'Access denied. Invalid token format.' });

        const decoded = jwt.verify(token, process.env.APP_SECRET || 'fallback_secret');
        req.user = decoded; // { id, email, address, ... }
        next();
    } catch (ex) {
        res.status(400).json({ error: 'Invalid token.' });
    }
};
