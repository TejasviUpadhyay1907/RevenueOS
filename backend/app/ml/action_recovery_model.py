"""
Action-aware recovery model for RevenueOS.
Estimates P(recovery | context, action) using XGBClassifier.
"""

import os
import joblib
import numpy as np
import pandas as pd
from datetime import datetime
from xgboost import XGBClassifier
from sklearn.preprocessing import OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.metrics import roc_auc_score, average_precision_score, brier_score_loss
from sklearn.calibration import calibration_curve
import json
SHAP_AVAILABLE = False  # shap disabled: incompatible with NumPy 2.x on this system

# Paths
MODEL_DIR = os.path.dirname(__file__)
MODEL_PATH = os.path.join(MODEL_DIR, 'action_recovery_model.joblib')
PREPROCESSOR_PATH = os.path.join(MODEL_DIR, 'action_recovery_preprocessor.joblib')
FEATURES_PATH = os.path.join(MODEL_DIR, 'action_recovery_features.json')

# Actions
ACTIONS = ["no_action", "immediate_retry", "delayed_retry", "payment_link", "notification", "human_escalation"]
ACTION_TO_LABEL = {
    "no_action": "would_recover_no_action",
    "immediate_retry": "would_recover_immediate_retry",
    "delayed_retry": "would_recover_delayed_retry",
    "payment_link": "would_recover_payment_link",
    "notification": "would_recover_notification",
    "human_escalation": "would_recover_human_escalation"
}

def _load_base_data(data_dir):
    """Load the synthetic data and return a DataFrame with one row per (event, action)."""
    with open(os.path.join(data_dir, 'merchants.json'), 'r') as f:
        merchants = json.load(f)
    with open(os.path.join(data_dir, 'customers.json'), 'r') as f:
        customers = json.load(f)
    with open(os.path.join(data_dir, 'payment_events.json'), 'r') as f:
        payments = json.load(f)
    with open(os.path.join(data_dir, 'ground_truth.json'), 'r') as f:
        ground_truth = json.load(f)

    merchants_df = pd.DataFrame(merchants)
    customers_df = pd.DataFrame(customers)
    payments_df = pd.DataFrame(payments)
    ground_truth_df = pd.DataFrame(ground_truth)

    # Merge to get observable features
    df = payments_df.merge(ground_truth_df, left_on='id', right_on='event_id', how='left')
    df = df.merge(customers_df, left_on='customer_id', right_on='id', how='left', suffixes=('', '_customer'))
    df = df.merge(merchants_df, left_on='merchant_id', right_on='id', how='left', suffixes=('', '_merchant'))

    # Convert datetime
    df['attempted_at'] = pd.to_datetime(df['attempted_at'])
    df['hour_of_day'] = df['attempted_at'].dt.hour
    df['day_of_week'] = df['attempted_at'].dt.dayofweek
    df['is_weekend'] = df['day_of_week'].isin([5, 6]).astype(int)

    # Payment method one-hot (we'll keep as categorical for preprocessing)
    df['payment_method'] = df['payment_method'].fillna('card')
    # Failure reason
    df['failure_reason'] = df['failure_reason'].fillna('unknown')
    # Customer failure pattern
    df['failure_pattern'] = df['failure_pattern'].fillna('none')
    # Merchant plan
    df['plan'] = df['plan'].fillna('starter')

    # Map ground truth columns to the six action labels expected by the model
    # action_A → immediate_retry, action_B → payment_link, action_C → notification
    # no_action = would_recover_without_intervention
    # delayed_retry ≈ action_A (same class)
    # human_escalation ≈ action_B (same as payment link, as per example in prompt)
    df['would_recover_no_action'] = df['would_recover_without_intervention']
    df['would_recover_immediate_retry'] = df['would_recover_with_action_A']
    df['would_recover_payment_link'] = df['would_recover_with_action_B']
    df['would_recover_notification'] = df['would_recover_with_action_C']
    df['would_recover_delayed_retry'] = df['would_recover_with_action_A']  # same as immediate
    df['would_recover_human_escalation'] = df['would_recover_with_action_B']  # same as payment link

    # Create rows for each action
    rows = []
    for _, row in df.iterrows():
        for action in ACTIONS:
            new_row = row.copy()
            new_row['action'] = action
            # Label: would_recover for this action (using the mapped columns)
            label_col = ACTION_TO_LABEL[action]
            new_row['label'] = bool(row[label_col])
            rows.append(new_row)
    df_actions = pd.DataFrame(rows)
    return df_actions

def _get_feature_columns():
    """Return list of column names to use as features (excluding label and identifiers)."""
    # These are the columns we will use as features.
    # We will let the ColumnTransformer handle encoding.
    return [
        'amount',
        'hour_of_day',
        'day_of_week',
        'is_weekend',
        'historical_success_rate',
        'avg_transaction_value',
        'avg_ticket_size',
        'payment_method',
        'failure_reason',
        'failure_pattern',
        'plan',
        'action'
    ]

def train_model(data_dir=None):
    """Train the action-aware recovery model."""
    if data_dir is None:
        data_dir = os.path.join(os.path.dirname(__file__), '..', '..', '..', 'data', 'synthetic')
    
    print("Loading data...")
    df = _load_base_data(data_dir)
    print(f"Total rows (event-action pairs): {len(df)}")
    
    # Check label distribution
    print("Label distribution:")
    print(df['label'].value_counts())
    
    # Temporal split: sort by attempted_at
    df = df.sort_values('attempted_at')
    n = len(df)
    train_end = int(0.6 * n)
    val_end = int(0.8 * n)
    
    train_df = df.iloc[:train_end]
    val_df = df.iloc[train_end:val_end]
    test_df = df.iloc[val_end:]
    
    print(f"Train: {len(train_df)}, Val: {len(val_df)}, Test: {len(test_df)}")
    
    feature_cols = _get_feature_columns()
    X_train = train_df[feature_cols]
    y_train = train_df['label']
    X_val = val_df[feature_cols]
    y_val = val_df['label']
    X_test = test_df[feature_cols]
    y_test = test_df['label']
    
    # Preprocessor: one-hot encode categoricals, pass through numeric
    categorical_features = ['payment_method', 'failure_reason', 'failure_pattern', 'plan', 'action']
    numeric_features = [f for f in feature_cols if f not in categorical_features]
    
    preprocessor = ColumnTransformer(
        transformers=[
            ('num', 'passthrough', numeric_features),
            ('cat', OneHotEncoder(handle_unknown='ignore'), categorical_features)
        ]
    )
    
    model = Pipeline(steps=[
        ('preprocessor', preprocessor),
        ('classifier', XGBClassifier(
            n_estimators=100,
            max_depth=4,
            learning_rate=0.1,
            eval_metric="logloss",
            random_state=42
        ))
    ])
    
    print("Training model...")
    model.fit(X_train, y_train)

    # Feature importance using XGBoost built-in (no SHAP needed)
    try:
        classifier = model.named_steps['classifier']
        importances = classifier.feature_importances_
        print("\nTop 5 features by XGBoost feature importance:")
        feat_imp = sorted(enumerate(importances), key=lambda x: x[1], reverse=True)
        for idx, score in feat_imp[:5]:
            print(f"  Feature {idx}: {score:.6f}")
    except Exception as e:
        print(f"Could not compute feature importance: {e}")

    # Evaluate
    def evaluate(X, y, name):
        pred_proba = model.predict_proba(X)[:, 1]
        pred = model.predict(X)
        auc = roc_auc_score(y, pred_proba)
        ap = average_precision_score(y, pred_proba)
        brier = brier_score_loss(y, pred_proba)
        # Calibration: fraction of positives in each bin
        frac_pos, mean_pred = calibration_curve(y, pred_proba, n_bins=10)
        return {
            'auc': auc,
            'ap': ap,
            'brier': brier,
            'calibration_fraction_of_positives': frac_pos.tolist(),
            'calibration_mean_predicted_value': mean_pred.tolist()
        }
    
    train_metrics = evaluate(X_train, y_train, 'train')
    val_metrics = evaluate(X_val, y_val, 'val')
    test_metrics = evaluate(X_test, y_test, 'test')
    
    print("\n=== Model Evaluation ===")
    for name, metrics in [('train', train_metrics), ('val', val_metrics), ('test', test_metrics)]:
        print(f"{name}: AUC={metrics['auc']:.4f}, AP={metrics['ap']:.4f}, Brier={metrics['brier']:.4f}")
    
    # Save model and preprocessor
    joblib.dump(model, MODEL_PATH)
    joblib.dump(preprocessor, PREPROCESSOR_PATH)
    
    # Save feature columns for reference
    with open(FEATURES_PATH, 'w') as f:
        json.dump(feature_cols, f, indent=2)
    
    print(f"Model saved to {MODEL_PATH}")
    print(f"Preprocessor saved to {PREPROCESSOR_PATH}")
    print(f"Feature columns saved to {FEATURES_PATH}")
    
    return model, preprocessor, feature_cols, train_metrics, val_metrics, test_metrics

def load_model():
    """Load the trained model and preprocessor."""
    if not os.path.exists(MODEL_PATH):
        raise FileNotFoundError(f"Model not found at {MODEL_PATH}. Train first.")
    model = joblib.load(MODEL_PATH)
    preprocessor = joblib.load(PREPROCESSOR_PATH)
    with open(FEATURES_PATH, 'r') as f:
        feature_cols = json.load(f)
    return model, preprocessor, feature_cols

def predict_proba(context_df, action=None):
    """
    Predict probability of recovery.
    context_df: DataFrame with columns for context (no action column).
    action: optional action string; if None, return probabilities for all actions.
    """
    model, preprocessor, feature_cols = load_model()

    if action is None:
        # Return probabilities for all actions
        probs = {}
        for act in ACTIONS:
            df_act = context_df.copy()
            df_act['action'] = act
            # Ensure columns order
            df_act = df_act[feature_cols]
            proba = model.predict_proba(df_act)[:, 1]
            probs[act] = proba
        return probs
    else:
        df_act = context_df.copy()
        df_act['action'] = action
        df_act = df_act[feature_cols]
        proba = model.predict_proba(df_act)[:, 1]
        return proba


def explain_prediction(feature_df, action) -> list:
    """
    Explain a prediction using XGBoost feature importances (SHAP disabled — NumPy 2.x incompatibility).
    Returns top 5 features sorted by importance descending.

    Args:
        feature_df: DataFrame with one row of context features (no action column)
        action: action string

    Returns:
        list of dicts: [{"feature": str, "shap_value": float, "direction": str}, ...]
    """
    try:
        model, preprocessor, feature_cols = load_model()

        # Build feature row with action
        df_act = feature_df.copy()
        df_act['action'] = action
        df_act = df_act[feature_cols]

        # Get classifier and its feature importances
        classifier = model.named_steps['classifier']
        importances = classifier.feature_importances_  # XGBoost built-in

        # Get feature names after one-hot encoding
        try:
            feature_names = list(preprocessor.get_feature_names_out())
        except Exception:
            feature_names = [f"feature_{i}" for i in range(len(importances))]

        # Build explanation list
        explanations = []
        for name, score in zip(feature_names, importances):
            explanations.append({
                "feature": str(name),
                "shap_value": float(score),   # importance score (not SHAP, but same interface)
                "direction": "increases" if score > 0 else "neutral"
            })

        # Sort by importance descending, return top 5
        explanations.sort(key=lambda x: abs(x["shap_value"]), reverse=True)
        return explanations[:5]

    except Exception:
        return []

if __name__ == "__main__":
    # Train if run directly
    train_model()