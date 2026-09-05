"""
Feature engineering for recoverability model.
"""

import pandas as pd
import numpy as np
import json
import os

def load_data(data_dir):
    """
    Load the synthetic data from JSON files.
    """
    # Load merchants
    with open(os.path.join(data_dir, 'merchants.json'), 'r') as f:
        merchants = json.load(f)
    merchants_df = pd.DataFrame(merchants)
    
    # Load customers
    with open(os.path.join(data_dir, 'customers.json'), 'r') as f:
        customers = json.load(f)
    customers_df = pd.DataFrame(customers)
    
    # Load payments
    with open(os.path.join(data_dir, 'payment_events.json'), 'r') as f:
        payments = json.load(f)
    payments_df = pd.DataFrame(payments)
    
    # Load ground truth
    with open(os.path.join(data_dir, 'ground_truth.json'), 'r') as f:
        ground_truth = json.load(f)
    ground_truth_df = pd.DataFrame(ground_truth)
    # In ground_truth, the event_id is the payment_id (which is the 'id' in payments)
    ground_truth_df.rename(columns={'event_id': 'payment_id'}, inplace=True)
    
    # Step 1: Merge payments with ground_truth on payment_id
    payments_gt = payments_df.merge(ground_truth_df, left_on='id', right_on='payment_id', how='left')
    # After this merge, we have columns from payments and ground_truth, plus the payment_id from ground_truth (which is duplicate of id)
    # We'll keep the id from payments as the primary key.
    
    # Step 2: Merge with customers
    # We need to ensure the customer_id column exists in payments_gt (it should, from payments_df)
    payments_gt = payments_gt.merge(customers_df, left_on='customer_id', right_on='id', how='left', suffixes=('', '_customer'))
    
    # Step 3: Merge with merchants
    payments_gt = payments_gt.merge(merchants_df, left_on='merchant_id', right_on='id', how='left', suffixes=('', '_merchant'))
    
    return payments_gt

def extract_features(df):
    """
    Extract features from the dataframe.
    We will not use any future information (like actual recovery outcome) as features.
    """
    # We'll create a copy to avoid SettingWithCopyWarning
    df = df.copy()
    
    # Convert attempted_at to datetime
    df['attempted_at'] = pd.to_datetime(df['attempted_at'])
    
    # Time-based features
    df['hour_of_day'] = df['attempted_at'].dt.hour
    df['day_of_week'] = df['attempted_at'].dt.dayofweek  # Monday=0, Sunday=6
    df['is_weekend'] = df['day_of_week'].isin([5, 6]).astype(int)
    
    # Payment method: one-hot encode
    # We'll consider the top 4: card, upi, netbanking, wallet, and group others as 'other'
    payment_methods = ['card', 'upi', 'netbanking', 'wallet']
    df['payment_method'] = df['payment_method'].apply(lambda x: x if x in payment_methods else 'other')
    payment_method_dummies = pd.get_dummies(df['payment_method'], prefix='payment_method')
    df = pd.concat([df, payment_method_dummies], axis=1)
    
    # Failure reason: one-hot encode the top 15 we saw, group others as 'other'
    top_failure_reasons = [
        'insufficient_funds', 'issuer_decline', 'expired_card', 'invalid_cvv',
        'transaction_not_allowed', 'duplicate_transaction', 'suspected_fraud',
        'technical_error', 'gateway_timeout', 'bank_decline', 'otp_limit_exceeded',
        'invalid_amount', 'currency_not_supported', 'acquirer_decline', 'void'
    ]
    df['failure_reason'] = df['failure_reason'].apply(lambda x: x if x in top_failure_reasons else 'other')
    failure_reason_dummies = pd.get_dummies(df['failure_reason'], prefix='failure_reason')
    df = pd.concat([df, failure_reason_dummies], axis=1)
    
    # Customer features
    # We'll use: historical_success_rate, avg_transaction_value, and failure_pattern (one-hot)
    failure_patterns = ['none', 'insufficient_funds', 'expired_card', 'issuer_decline', 'technical']
    df['failure_pattern'] = df['failure_pattern'].apply(lambda x: x if x in failure_patterns else 'other')
    failure_pattern_dummies = pd.get_dummies(df['failure_pattern'], prefix='failure_pattern')
    df = pd.concat([df, failure_pattern_dummies], axis=1)
    
    # Merchant features
    # We'll use: avg_ticket_size, and plan (one-hot)
    plan_dummies = pd.get_dummies(df['plan'], prefix='plan')
    df = pd.concat([df, plan_dummies], axis=1)
    
    # Define the feature columns
    feature_cols = [
        'amount',
        'hour_of_day',
        'day_of_week',
        'is_weekend',
        'historical_success_rate',
        'avg_transaction_value',
        'avg_ticket_size'
    ] + list(payment_method_dummies.columns) + list(failure_reason_dummies.columns) + \
      list(failure_pattern_dummies.columns) + list(plan_dummies.columns)
    
    # Ensure all feature columns exist (some might be missing if a category is not present in the data)
    feature_cols = [col for col in feature_cols if col in df.columns]
    
    X = df[feature_cols]
    
    # For the label, we'll use the ground_truth for action B: would_recover_with_action_B
    y = df['would_recover_with_action_B']
    
    return X, y

if __name__ == "__main__":
    # Example usage
    data_dir = os.path.join(os.path.dirname(__file__), '..', '..', '..', 'data', 'synthetic')
    df = load_data(data_dir)
    print(f"Loaded data shape: {df.shape}")
    X, y = extract_features(df)
    print(f"Features shape: {X.shape}")
    print(f"Label shape: {y.shape}")
    print(f"Positive label rate: {y.mean()}")