from fastapi import APIRouter, Request, HTTPException, Header
import hmac
import hashlib
import os
import json
import logging

router = APIRouter(prefix="/webhook")

logger = logging.getLogger(__name__)

@router.post("/razorpay")
async def razorpay_webhook(request: Request, x_razorpay_signature: str = Header(None)):
    # Get the raw body
    body = await request.body()

    # Get the webhook secret from environment
    webhook_secret = os.getenv("RAZORPAY_WEBHOOK_SECRET")
    if not webhook_secret:
        logger.error("RAZORPAY_WEBHOOK_SECRET not set")
        raise HTTPException(status_code=500, detail="Webhook secret not configured")

    # Verify the signature
    # Razorpay uses: sha256(secret + body)
    # But note: Razorpay documentation says they use: sha256(secret + "|" + body) ???
    # Actually, from Razorpay docs:
    #   X-Razorpay-Signature: sha256(secret + "|" + body)
    # However, let's check:
    #   They say: "To verify the signature, compute an HMAC with SHA256 hash.
    #   Use the webhook secret as the key and the payload (the entire request body) as the message."
    #   So it's just: sha256(secret + body) without any separator?
    #   Actually, HMAC uses a key and a message. The key is the secret, the message is the body.
    #   So we do: hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()

    # Compute the expected signature
    expected_signature = hmac.new(
        webhook_secret.encode(),
        body,
        hashlib.sha256
    ).hexdigest()

    # Compare the signatures
    if not hmac.compare_digest(expected_signature, x_razorpay_signature or ""):
        logger.warning("Invalid Razorpay webhook signature")
        raise HTTPException(status_code=400, detail="Invalid signature")

    # Parse the JSON body
    try:
        payload = json.loads(body)
    except json.JSONDecodeError:
        logger.error("Invalid JSON in Razorpay webhook")
        raise HTTPException(status_code=400, detail="Invalid JSON")

    # Check the event
    event = payload.get("event")
    if event == "payment.failed":
        # Extract payment_id and amount from payload
        # The structure of payment.failed event payload:
        #   {
        #     "event": "payment.failed",
        #     "payload": {
        #       "payment": {
        #         "entity": {
        #           ... payment details ...
        #         }
        #       }
        #     }
        #   }
        payment_entity = payload.get("payload", {}).get("payment", {}).get("entity", {})
        payment_id = payment_entity.get("id")
        amount = payment_entity.get("amount")  # amount is in the smallest currency unit (paise for INR)

        if payment_id is not None and amount is not None:
            logger.info(f"Webhook received: payment.failed payment_id={payment_id}")
        else:
            logger.warning("Webhook received payment.failed but missing payment_id or amount")

    # For all events, return ok
    return {"status": "ok"}