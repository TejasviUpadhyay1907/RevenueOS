import os

FALLBACKS = {
    "insufficient_funds":    "Payment failed due to insufficient funds. Best approach: wait 2-3 days and send a delayed retry — customers typically top up their accounts on payday cycles.",
    "expired_card":          "Payment failed because the card has expired. Best approach: send a payment link so the customer can re-enter updated card details.",
    "issuer_decline":        "Payment declined by the issuing bank — often a temporary block. Best approach: retry after 4 hours. Do not contact the customer yet.",
    "gateway_timeout":       "Payment failed due to a gateway timeout — likely a transient network issue. Best approach: immediate retry, no customer contact needed.",
    "transaction_not_allowed": "Transaction blocked by bank policy. Best approach: send a payment link with an alternative payment method option.",
    "currency_not_supported":"Currency not accepted by the processor. Best approach: escalate to human review to arrange manual collection.",
    "authentication_failed": "Authentication failed (likely OTP or 3DS issue). Best approach: send a fresh payment link so the customer can complete authentication cleanly.",
    "do_not_honor":          "Bank declined without a specific reason — often temporary. Best approach: retry once after 2 hours. If it fails again, send a payment link.",
    "fraudulent":            "Payment flagged as potentially fraudulent. Best approach: do not auto-retry. Escalate to human review for identity verification.",
    "processing_error":      "Temporary processing error on the gateway side. Best approach: immediate retry — this typically resolves on the second attempt.",
}

def _fallback(revenue_event):
    root_cause = getattr(revenue_event, 'root_cause', 'unknown') or 'unknown'
    return FALLBACKS.get(
        root_cause,
        "Payment failed for an unspecified reason. Best approach: retry once after a short delay, then send a payment link if it fails again."
    )


def explain_failure(revenue_event, payment, customer, merchant) -> str:
    """
    Generate a plain-English explanation of why a payment failed.
    Uses OpenRouter if OPENROUTER_API_KEY is set, otherwise uses heuristic fallback.
    """
    api_key = os.getenv("OPENROUTER_API_KEY") or os.getenv("OPENAI_API_KEY")

    if not api_key:
        return _fallback(revenue_event)

    try:
        import openai

        failure_reason  = getattr(revenue_event, 'root_cause',               'unknown') or 'unknown'
        amount          = getattr(revenue_event, 'amount_at_risk',            0)
        payment_method  = getattr(payment,       'payment_method',            'unknown') or 'unknown'
        success_rate    = getattr(customer,      'historical_success_rate',   0.5) or 0.5
        merchant_plan   = getattr(merchant,      'plan',                      'standard') or 'standard'

        system_prompt = (
            "You are a payment failure analyst for an Indian fintech platform. "
            "In 2-3 sentences, explain why this payment likely failed and what the "
            "single best recovery action is. Be specific, actionable, and use plain language. "
            "Mention the failure type and the recommended action. No jargon."
        )
        user_message = (
            f"Failure reason: {failure_reason}\n"
            f"Amount at risk: ₹{amount:,.0f}\n"
            f"Payment method: {payment_method}\n"
            f"Customer historical success rate: {success_rate:.0%}\n"
            f"Merchant plan: {merchant_plan}"
        )

        # OpenRouter uses the same interface as OpenAI SDK v1.x
        # Just change the base_url
        is_openrouter = bool(os.getenv("OPENROUTER_API_KEY"))
        client = openai.OpenAI(
            api_key=api_key,
            base_url="https://openrouter.ai/api/v1" if is_openrouter else None,
            default_headers={
                "HTTP-Referer": "https://revenueos.demo",
                "X-Title": "RevenueOS"
            } if is_openrouter else {}
        )

        response = client.chat.completions.create(
            model="openai/gpt-4o-mini" if is_openrouter else "gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user",   "content": user_message},
            ],
            max_tokens=160,
            temperature=0.4,
        )

        explanation = response.choices[0].message.content.strip()
        return explanation if explanation else _fallback(revenue_event)

    except Exception:
        return _fallback(revenue_event)
