require('dotenv').config();
const Razorpay = require('razorpay');
const crypto = require('crypto');
const db = require('../config/db');

// ✅ Initialize Razorpay
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,  
    key_secret: process.env.RAZORPAY_SECRET
});
exports.createorder = async (req, res) => {
    try {
        if (!req.session.user?.email) {
            return res.status(400).json({ success: false, message: "Login agin" });      }
        
        let userId = req.session.user.email;
        const { addmoney } = req.body;
        if (!userId || !addmoney || isNaN(addmoney) || addmoney <= 0) {
            return res.status(400).json({ error: 'Invalid user ID or amount' });
        }

        const amount = addmoney * 100; // Convert to paise

        const options = {
            amount,
            currency: "INR",
            receipt: `order_${Date.now()}`,
            payment_capture: 1
        };

        const order = await razorpay.orders.create(options);
        if (!order || !order.id) {
            return res.status(500).json({ error: "Order creation failed" });
        }

        // Store transaction history with 'Pending' status
        const insertHistoryQuery = `
    INSERT INTO wallet_history (email, amount, method, time, status, order_id) 
    VALUES (?, ?, ?, CONVERT_TZ(NOW(), '+00:00', '+05:30'), ?, ?)
`;

        await db.execute(insertHistoryQuery, [userId, addmoney, 'Razorpay', 'Pending', order.id]);

        res.json({
            success: true,
            message: "Order created successfully!",
            order_id: order.id,
            amount: order.amount
        });

    } catch (error) {
        console.error("Error in createOrder:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

// ✅ Verify Payment API
exports.verifypayment = async (req, res) => {
    try {
        const { userId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
        //console.log(req.body)
        if (!userId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({ error: 'Missing required payment details' });
        }

        // Ensure Razorpay Secret Key is loaded
        if (!process.env.RAZORPAY_SECRET) {
            console.error("RAZORPAY_SECRET is missing in environment variables!");
            return res.status(500).json({ error: "Internal server error" });
        }

        // Generate HMAC SHA256 signature for verification
        const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_SECRET);
        hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
        const generatedSignature = hmac.digest('hex');

        if (generatedSignature !== razorpay_signature) {
            return res.status(400).json({ error: 'Invalid payment signature' });
        }

        // Retrieve order amount from wallet_history
        const [rows] = await db.execute(
            "SELECT email, amount FROM wallet_history WHERE order_id = ? AND status = 'Pending'",
            [razorpay_order_id]
        );

        if (!rows || rows.length === 0) {
            return res.status(400).json({ error: 'Order not found or already processed' });
        }

        const { email, amount } = rows[0];

        // Ensure the correct user is being credited
        if (email !== userId) {
            return res.status(400).json({ error: "User mismatch. Payment verification failed." });
        }

        // Update user wallet balance
        await db.execute("UPDATE users SET addamount = addamount + ? WHERE email = ?", [amount, email]);

        // Update transaction history status to 'Success'
        //await db.execute("UPDATE wallet_history SET status = 'Success', payid = razorpay_payment_id WHERE order_id = ?", [razorpay_order_id]);
        await db.execute(
            "UPDATE wallet_history SET status = 'Success', payid = ? WHERE order_id = ?",
            [razorpay_payment_id, razorpay_order_id]
          );
          

        // ✅ Allow frontend to access this header
        res.setHeader("x-rtb-fingerprint-id", "your-value-here");

        res.json({ success: true, message: "Payment verified and wallet updated successfully!", amount });

    } catch (error) {
        console.error("Error in verifyPayment:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};
