import joblib
import os

def load_model():
    model_path = "model.pkl"
    if os.path.exists(model_path):
        return joblib.load(model_path)
    else:
        # Fallback dummy model for development
        print("⚠️  model.pkl not found — using dummy predictor")
        class DummyModel:
            def predict(self, X):
                return [5.0] * len(X)   # average demand
        return DummyModel()