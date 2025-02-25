require('dotenv').config();
const db = require('../config/db');

// Controller to fetch wallet transaction history for a user
exports.fetchTransactionHistory = async (req, res) => {
        try {
            if           
            (!req.session.user?.email) {
            return res.status(400).send('User email not found in session');
          }
          
          const userId = req.session.user.email;
          
    
            if (!userId) {
                return res.status(401).json({ success: false, message: 'Unauthorized access' });
            }
    
            // Get last updated timestamp from request (if provided)
            const lastUpdated = req.query.lastUpdated || "1970-01-01 00:00:00"; // Default: earliest possible
    
            // Fetch transactions **only if they are newer** than lastUpdated
            const query = `
                SELECT amount, method, time, status, order_id 
                FROM wallet_history 
                WHERE email = ? AND time > ?
                ORDER BY time DESC
            `;
            const [rows] = await db.execute(query, [userId, lastUpdated]);
    
            if (rows.length === 0) {
                return res.status(204).json({ success: true, message: 'No new transactions' }); // 204 = No Content
            }
    
            return res.status(200).json({
                success: true,
                message: "New transactions retrieved successfully!",
                wallet: rows,
                lastUpdated: rows[0].time // Send latest timestamp
            });
    
        } catch (error) {
            console.error('Database error:', error.message);
            return res.status(500).json({ success: false, message: 'Internal server error' });
        }
    }
    