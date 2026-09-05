"""
Opportunity engine for RevenueOS.
Calculates expected value for recovery opportunities.
"""

def calculate_expected_value(amount_at_risk, recovery_probability, intervention_success_probability=0.8, intervention_cost=0, customer_friction_penalty=0, risk_penalty=0):
    """
    Calculate the expected value of a recovery opportunity.

    expected_value = amount_at_risk * recovery_probability * intervention_success_probability
                    - intervention_cost - customer_friction_penalty - risk_penalty

    For simplicity, we'll set default values for intervention_cost, customer_friction_penalty, and risk_penalty to 0.
    In a more sophisticated model, these would be calculated based on the intervention type and customer/context.
    """
    expected_recovery = amount_at_risk * recovery_probability * intervention_success_probability
    expected_value = expected_recovery - intervention_cost - customer_friction_penalty - risk_penalty
    return expected_value