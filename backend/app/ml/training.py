"""
Training script for the recoverability model.
"""

import os
import joblib
import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score
from app.ml.feature_engineering import load_data, extract_features

def train_model(data_dir, model_output_path):
    """
    Train a logistic regression model on the synthetic data.
    """
    # Load data
    df = load_data(data_dir)
    X, y = extract_features(df)
    
    # Split the data into train and test sets (80-20)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    
    # Initialize and train the model
    model = LogisticRegression(max_iter=1000, random_state=42)
    model.fit(X_train, y_train)
    
    # Make predictions
    y_pred = model.predict(X_test)
    y_pred_proba = model.predict_proba(X_test)[:, 1]
    
    # Evaluate the model
    accuracy = accuracy_score(y_test, y_pred)
    precision = precision_score(y_test, y_pred)
    recall = recall_score(y_test, y_pred)
    f1 = f1_score(y_test, y_pred)
    roc_auc = roc_auc_score(y_test, y_pred_proba)
    
    print("Model Evaluation:")
    print(f"  Accuracy: {accuracy:.4f}")
    print(f"  Precision: {precision:.4f}")
    print(f"  Recall: {recall:.4f}")
    print(f"  F1 Score: {f1:.4f}")
    print(f"  ROC-AUC: {roc_auc:.4f}")
    
    # Save the model
    joblib.dump(model, model_output_path)
    print(f"Model saved to {model_output_path}")
    
    # Also save the feature names for later use
    feature_names = list(X.columns)
    feature_names_path = model_output_path.replace('.joblib', '_features.joblib')
    joblib.dump(feature_names, feature_names_path)
    print(f"Feature names saved to {feature_names_path}")
    
    return model, X_test, y_test, y_pred, y_pred_proba

if __name__ == "__main__":
    # Define paths
    data_dir = os.path.join(os.path.dirname(__file__), '..', '..', '..', 'data', 'synthetic')
    model_output_path = os.path.join(os.path.dirname(__file__), 'recoverability_model.joblib')
    
    # Train the model
    train_model(data_dir, model_output_path)