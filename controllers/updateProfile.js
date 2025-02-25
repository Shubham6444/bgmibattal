const db = require('../config/db.js');

exports.updateUserProfile = async (req, res) => {
    try {
        // Ensure the user is authenticated
        if (!req.session.user || !req.session.user.email) {
            return res.status(401).json({ error: 'Unauthorized: User not logged in' });
        }

        const userEmail = req.session.user.email;
        const { upiid, bgmi_id,freefir_id } = req.body;
            //console.log(upiid+bgmi_id+freefir_id)
        // Validate at least one field is provided
        if (!upiid && !bgmi_id && !freefir_id) {
            return res.status(400).json({ error: 'At least one field (upiid or bgmi_id) is required' });
        }

        let query = '';
        let params = [];

        if (upiid) {
            query = "UPDATE users SET upiid = ? WHERE email = ?";
            params = [upiid, userEmail];
        } else if (bgmi_id) {
            query = "UPDATE users SET bgmi_id = ? WHERE email = ?";
            params = [bgmi_id, userEmail];
        } else if(freefir_id){
            query = "UPDATE users SET freefir_id = ? WHERE email = ?";
            params = [freefir_id, userEmail];

        }
        // Execute the update query
        await db.execute(query, params);

        res.json({ success: true, message: 'User profile updated successfully' });

    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
