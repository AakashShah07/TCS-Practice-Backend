# Manual UPI Payment Verification API Documentation

This document outlines the API endpoints for the manual UPI payment verification workflow.

## Base URL
`/api/payment`

---

## 1. User: Submit Payment Request
Allows a user to submit their UTR after making a payment via QR.

- **Endpoint:** `POST /api/payment/submit`
- **Authentication:** Required (Bearer Token)
- **Request Body:**
  ```json
  {
    "utr": "123456789012",
    "amount": 499
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "success": true,
    "data": {
      "user": "userId",
      "utr": "123456789012",
      "amount": 499,
      "status": "pending",
      "_id": "paymentId",
      "createdAt": "..."
    }
  }
  ```

---

## 2. User: Get Payment Status
Allows a user to check the status of their submitted payments.

- **Endpoint:** `GET /api/payment/status`
- **Authentication:** Required (Bearer Token)
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": [
      {
        "utr": "123456789012",
        "status": "pending",
        "createdAt": "..."
      }
    ]
  }
  ```

---

## 3. Admin: Get Pending Payments
Allows admin to view all pending requests.

- **Endpoint:** `GET /api/payment/admin/pending`
- **Authentication:** Required (Bearer Token, Admin Only)
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": [
      {
        "_id": "paymentId",
        "user": { "name": "User Name", "email": "user@example.com" },
        "utr": "123456789012",
        "status": "pending"
      }
    ]
  }
  ```

---

## 4. Admin: Approve Payment
Approves a payment and upgrades the user to Premium.

- **Endpoint:** `POST /api/payment/admin/approve/:id`
- **Authentication:** Required (Bearer Token, Admin Only)
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "status": "approved",
      "user": "userId"
    }
  }
  ```

---

## 5. Admin: Reject Payment
Rejects a payment with optional notes.

- **Endpoint:** `POST /api/payment/admin/reject/:id`
- **Authentication:** Required (Bearer Token, Admin Only)
- **Request Body:**
  ```json
  {
    "adminNotes": "UTR not found in bank statement."
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "status": "rejected",
      "adminNotes": "..."
    }
  }
  ```
