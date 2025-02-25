const express = require('express');
const mysql = require('mysql2');
const app = express();

const db = require('../config/db.js');

exports.userdata = async (req, res) => {
    try {
      // Execute queries sequentially
      const [users] = await db.execute('SELECT id, name, email, upiid, addamount, winamount, bgmi_id FROM users');
      const [walletHistory] = await db.execute('SELECT email, amount, method, time, status, order_id,payid FROM wallet_history');
      const [battle_stats] = await db.execute('SELECT user_id, battle_id, total_kills, won_amount FROM battle_stats');
      const [battles] = await db.execute('SELECT * FROM battals');
  
      // Render the data on a single page (assuming you're using a template engine like Pug)
      res.json({ users, walletHistory, battles, battle_stats });    } catch (error) {
      console.error('Database query error:', error);
      res.status(500).send('Database query error');
    }
  };
  
  
  exports.updateUser = async (req, res) => {
    const { userId, name, email, upiid, addamount, winamount, bgmi_id } = req.body;
   

    if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
    }

    try {
        await db.execute(
            "UPDATE users SET name = ?, email = ?, upiid = ?, addamount = ?, winamount = ?, bgmi_id = ? WHERE id = ?",
            [name, email, upiid, addamount, winamount, bgmi_id, userId] // Corrected the order of parameters
        );
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Database error' });
    }
};



exports.deleteUser = async (req, res) => {
    const { userId } = req.body;
    if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
    }

    try {
        await db.execute("DELETE FROM users WHERE id = ?", [userId]);
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Database error' });
    }
};

// Update total_kill, won_amount, and other fields based on email
exports.updateTournamentByEmail = async (req, res) => {


    // if (!req.session.user?.email) {
    //     return res.status(400).send('User email not found in session');
    //   }
     
    try {
       // const email = req.session.user.email;
  
        const {email,battle_id, total_kill, won_amount } = req.body;

        if (!email || !battle_id || total_kill === undefined || won_amount === undefined) {
            return res.status(400).json({ success: false, message: "All fields are required!" });
        }

        const updateQuery = `
        UPDATE battle_stats 
        SET total_kills = ?, won_amount = ? 
        WHERE user_id = ? AND battle_id = ?
    `;
    const [result] = await db.execute(updateQuery, [total_kill, won_amount, email, battle_id]);

   
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "Tournament not found for this email!" });
        }

        return res.status(200).json({ success: true, message: "Tournament updated successfully!" });
    } catch (error) {
        console.error("Database error:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};
