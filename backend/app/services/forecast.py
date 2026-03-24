import joblib
import os

def load_model():
    model_path = "backend/model.pkl"
    if os.path.exists(model_path):
        return joblib.load(model_path)
    else:
        print("⚠️  model.pkl not found — using dummy model")
        class DummyModel:
            def predict(self, X):
                return [6.5] * len(X)   # average demand for Chennai
        return DummyModel()