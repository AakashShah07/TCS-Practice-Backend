# Razorpay Frontend Integration Guide

This guide explains how to integrate Razorpay for your premium feature payments on the frontend.

## 1. Load Razorpay Script
Load the Razorpay script in your `index.html` or in a main component via a script tag:

```html
<script src="https://checkout.razorpay.com/v1/checkout.js"></script>
```

## 2. Implementation Logic (React Example)

You need to create a payment handler function that interacts with your backend API.

```javascript
const handlePayment = async () => {
  // 1. Call backend to create order
  const { data } = await axios.post('/api/payment/create-order');

  const options = {
    key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID, // Use your public key
    amount: data.order.amount,
    currency: "INR",
    order_id: data.order.id,
    name: "TCS NQT Premium",
    description: "Premium Access",
    handler: async (response) => {
      // 2. Verify payment on backend
      try {
        await axios.post('/api/payment/verify', {
          razorpay_order_id: response.razorpay_order_id,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature: response.razorpay_signature,
        });
        alert("Payment successful! Premium access granted.");
      } catch (error) {
        alert("Payment verification failed.");
      }
    },
    prefill: {
      name: "User Name",
      email: "user@example.com",
    },
  };

  const razorpay = new window.Razorpay(options);
  razorpay.open();
};
```

## 3. Security Notes
- **Never** expose `RAZORPAY_KEY_SECRET` on the frontend. Only use `RAZORPAY_KEY_ID` (or `NEXT_PUBLIC_RAZORPAY_KEY_ID`).
- Ensure all API calls to `/create-order` and `/verify` include the user's authentication token in the headers.
