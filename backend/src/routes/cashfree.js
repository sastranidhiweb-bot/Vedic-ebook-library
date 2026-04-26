import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { Cashfree, CFEnvironment } from 'cashfree-pg';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();
router.use(cors());
router.use(express.json());
router.use(express.urlencoded({ extended: true }));


// v5 initialization (constructor-based)
const cf = new Cashfree(
	process.env.CASHFREE_ENVIRONMENT === "PRODUCTION" ? CFEnvironment.PRODUCTION : CFEnvironment.SANDBOX,
	process.env.CASHFREE_CLIENT_ID,
	process.env.CASHFREE_CLIENT_SECRET
);


function generateOrderId() {
    const uniqueId = crypto.randomBytes(16).toString('hex');
    const hash = crypto.createHash('sha256');
    hash.update(uniqueId);
    const orderId = hash.digest('hex');
    return orderId.slice(0, 12); // substr is deprecated, use slice
}

router.get('/payment', async (req, res) => {
  try {
    const db = mongoose.connection?.db;
    if (!db) {
      return res.status(500).json({ error: 'Database not initialized' });
    }
    const user_details = req.query.user_details || {};
    const { customer_id, customer_phone, customer_name, customer_email } = user_details;
    let request = {
      order_amount: req.query.amount,
      order_currency: 'INR',
      order_id: generateOrderId(),
      customer_details: {
        customer_id,
        customer_phone,
        customer_name,
        customer_email
      },
      order_meta: {
        payment_methods: 'upi',
        return_url: 'https://yourapp.com/success?order_id={order_id}'
      }
    };
    console.log('[Cashfree][payment] Request payload:', request);
    const response = await cf.PGCreateOrder(request);
    try {
      await db.collection('payments').insertOne({
        order_id: request.order_id,
        customer_id,
        customer_email,
        amount: request.order_amount,
        currency: request.order_currency,
        status: response.data.order_status || 'created',
        request_payload: request,
        response_payload: response.data,
        created_at: new Date()
      });
      console.log('[DB][payments][insert] Payment record inserted for order_id:', request.order_id);
    } catch (dbErr) {
      console.error('[DB][payments][insert] Error:', dbErr);
    }
    res.json(response.data);
  } catch (error) {
    console.error(error?.response?.data || error.message);
    res.status(500).json({ error: error?.response?.data?.message || 'Payment creation failed' });
  }
});

router.post('/verify', async (req, res) => {
  try {
    const db = mongoose.connection?.db;
    if (!db) {
      return res.status(500).json({ error: 'Database not initialized' });
    }
    let { orderId, duration } = req.body;
    const response = await cf.PGFetchOrder(orderId);
    res.json(response.data);
    try {
      await db.collection('payments').updateOne(
        { order_id: orderId },
        {
          $set: {
            verify_response: response.data,
            status: response.data.order_status || 'verified',
            updated_at: new Date()
          }
        }
      );
      console.log('[DB][payments][update] Payment record updated for order_id:', orderId);
    } catch (dbErr) {
      console.error('[DB][payments][update] Error:', dbErr);
    }

    // If payment is successful, update user_type and premium_expiry_date
    if (response.data.order_status === 'PAID' || response.data.order_status === 'SUCCESS') {
      try {
        // Get customer_email from payments collection
        const paymentDoc = await db.collection('payments').findOne({ order_id: orderId });
        if (!paymentDoc) {
          console.error('[DB][users][update] No payment record found for order_id:', orderId);
          return;
        }
        const customer_id = paymentDoc.customer_email;

        // Get current premium_expiry_date from users collection
        const userDoc = await db.collection('users').findOne({ email: customer_id });
        console.log('[DB][users][update] Current premium_expiry_date for user_id:', customer_id, 'is', userDoc?.premium_expiry_date || 'N/A');
        let baseDate = new Date();
        if (userDoc && userDoc.premium_expiry_date) {
          const currentExpiry = new Date(userDoc.premium_expiry_date);
          if (!isNaN(currentExpiry.getTime()) && currentExpiry > baseDate) {
            baseDate = currentExpiry;
          }
        }
        // Calculate new expiry date based on plan
        let newExpiry = new Date(baseDate);
        if (duration === 'monthly') {
          newExpiry.setDate(newExpiry.getDate() + 30);
        } else if (duration === '6month') {
          newExpiry.setMonth(newExpiry.getMonth() + 6);
        } else if (duration === 'yearly') {
          newExpiry.setFullYear(newExpiry.getFullYear() + 1);
        } else {
          newExpiry.setDate(newExpiry.getDate() + 30);
        }
        console.log('[DB][users][update] New premium expiry date calculated:', newExpiry);
        // Update user_type and premium_expiry_date
        await db.collection('users').updateOne(
          { email: customer_id },
          {
            $set: {
              user_type: 'premium',
              premium_expiry_date: newExpiry.toISOString().slice(0, 19).replace('T', ' ')
            }
          }
        );
        console.log('[DB][users][update] User upgraded to premium:', customer_id, 'New Expiry:', newExpiry);
      } catch (userErr) {
        console.error('[DB][users][update] Error:', userErr);
      }
    }
  } catch (error) {
    console.error(error?.response?.data || error.message);
    res.status(500).json({ error: error?.response?.data?.message || 'Verification failed' });
  }
});

export default router;
