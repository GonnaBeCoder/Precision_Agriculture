🌱 Precision Agriculture AI Dashboard

An AI-powered, sensor-independent precision agriculture system that provides real-time weather insights, crop recommendations, and machine learning–based environmental predictions to support smart farming decisions.

This project integrates real-time weather APIs, machine learning models, and an interactive dashboard to help farmers and researchers analyze climate impact on crops without requiring physical sensors.

🚀 Features

🌦️ Real-time weather monitoring (Temperature, Humidity, Wind, AQI)

📈 7-day weather forecasting with ML predictions

🚨 Smart alerts for heat stress, low rainfall, and poor air quality

🌾 Crop-specific recommendations (Rice, Wheat, Cotton)

📊 ML model performance analytics dashboard

📉 Multi-crop environmental comparison (Radar & Bar Charts)

📍 Location management system

🔁 Model retraining API (backend)

⚡ Fast frontend with Vite + React

🧠 Machine Learning Models

The backend uses ensemble learning techniques:

Linear Regression

Decision Trees

Random Forest (Ensemble)

Performance (Sample)
Model	Accuracy
Temperature	94.5%
Humidity	92.8%
Rainfall	91.2%
AQI	89.5%
Ensemble	95.8%

Models are retrained via API endpoint:
POST /api/retrain

🛠️ Tech Stack
Frontend

React + TypeScript

Vite

Recharts (Data Visualization)

Lucide React Icons

Tailwind CSS + Custom CSS

Backend

Python

Flask

Scikit-learn

NumPy, Pandas

APIs

OpenWeatherMap API (Weather & AQI)

📁 Project Structure
Precision-agriculture/
│
├── Precision-agriculture-frontend/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── Dashboard.tsx
│   │   ├── dashboard.css
│   │   └── main.tsx
│   ├── .env (not pushed to GitHub)
│   └── package.json
│
├── Precision-agriculture-backend/
│   ├── app.py
│   ├── models/
│   └── requirements.txt

⚙️ Setup Instructions
✅ Prerequisites

Node.js (v18+ recommended)

Python 3.9+

OpenWeatherMap API Key

▶️ Frontend Setup
cd Precision-agriculture-frontend
npm install

Create .env file
VITE_OPENWEATHER_API_KEY=your_api_key_here

Run Frontend
npm run dev


Frontend runs at:
👉 http://localhost:5173

▶️ Backend Setup
cd Precision-agriculture-backend
python -m venv venv
venv\Scripts\activate   # Windows
pip install -r requirements.txt

Run Backend
python app.py


Backend runs at:
👉 http://localhost:5000

🔗 API Endpoints
Method	Endpoint	Description
GET	/api/health	Backend status
GET	/api/models/performance	ML model metrics
POST	/api/predict	Weather-based predictions
POST	/api/crop/recommendations	Crop advice
POST	/api/retrain	Retrain ML models
📊 Dashboard Pages

🏠 Dashboard Overview

🌦️ Weather Prediction

🌾 Crop Management

📉 Multi-Crop Comparison

📈 ML Analytics

⚙️ Settings

🎯 Use Case

Smart farming decision support

Agricultural research analysis

Climate-aware crop planning

Low-cost precision agriculture for rural areas

🔐 Security

API keys are stored in .env files and never pushed to GitHub

.env added to .gitignore

📌 Future Enhancements

📱 Mobile responsive design

🛰️ Satellite image integration

🤖 Deep learning models (CNN/LSTM)

🌍 Dynamic location geocoding

☁️ Cloud deployment (AWS / IBM Cloud)
