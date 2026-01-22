import React, { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { Cloud, Droplets, Wind, Thermometer, AlertTriangle, TrendingUp, Sprout, BarChart3, MapPin, Settings, Bell, Home, Activity } from 'lucide-react';

// Mock ML Model Performance Data
const modelPerformance = {
  temperature: { mae: 1.2, rmse: 1.8, accuracy: 94.5 },
  humidity: { mae: 3.5, rmse: 4.2, accuracy: 92.8 },
  rainfall: { mae: 2.1, rmse: 3.0, accuracy: 91.2 },
  airQuality: { mae: 5.2, rmse: 6.8, accuracy: 89.5 },
  ensemble: { mae: 1.8, rmse: 2.4, accuracy: 95.8 }
};

// Crop data with environmental requirements
const cropsData = {
  rice: {
    name: 'Rice',
    tempRange: [20, 35],
    humidityRange: [70, 90],
    rainfall: 'High (1500-2000mm)',
    growthStages: ['Germination', 'Tillering', 'Panicle', 'Flowering', 'Maturity'],
    icon: '🌾'
  },
  wheat: {
    name: 'Wheat',
    tempRange: [12, 25],
    humidityRange: [50, 70],
    rainfall: 'Moderate (500-750mm)',
    growthStages: ['Germination', 'Tillering', 'Stem Extension', 'Heading', 'Maturity'],
    icon: '🌾'
  },
  cotton: {
    name: 'Cotton',
    tempRange: [21, 30],
    humidityRange: [60, 80],
    rainfall: 'Moderate (600-1200mm)',
    growthStages: ['Germination', 'Squaring', 'Flowering', 'Boll Development', 'Maturity'],
    icon: '🌱'
  }
};

const PrecisionAgDashboard = () => {
  const [currentPage, setCurrentPage] = useState('home');
  const [weatherData, setWeatherData] = useState(null);
  const [forecast, setForecast] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [location, setLocation] = useState('Guntur, Andhra Pradesh');
  const [savedLocations, setSavedLocations] = useState([]);
  const [selectedCrops, setSelectedCrops] = useState(['rice', 'cotton']);
  const [loading, setLoading] = useState(false);

  // Load saved data on mount
  useEffect(() => {
    loadSavedData();
    fetchWeatherData();
  }, []);

  // Save data whenever it changes
  useEffect(() => {
    if (weatherData) {
      saveData();
    }
  }, [weatherData, savedLocations, selectedCrops]);

  const loadSavedData = async () => {
    try {
      const locsResult = await window.storage.get('saved-locations');
      const cropsResult = await window.storage.get('selected-crops');
      const weatherResult = await window.storage.get('last-weather-data');
      
      if (locsResult) setSavedLocations(JSON.parse(locsResult.value));
      if (cropsResult) setSelectedCrops(JSON.parse(cropsResult.value));
      if (weatherResult) setWeatherData(JSON.parse(weatherResult.value));
    } catch (error) {
      console.log('No saved data found, using defaults');
    }
  };

  const saveData = async () => {
    try {
      await window.storage.set('saved-locations', JSON.stringify(savedLocations));
      await window.storage.set('selected-crops', JSON.stringify(selectedCrops));
      await window.storage.set('last-weather-data', JSON.stringify(weatherData));
    } catch (error) {
      console.error('Error saving data:', error);
    }
  };

  const fetchWeatherData = async () => {
    setLoading(true);
    
    try {
      // OpenWeatherMap API Configuration
      const API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY; // Replace with your actual API key
      const BACKEND_URL = 'http://localhost:5000/api'; // Your backend server
      
      // Get coordinates for location (you can also use geocoding API)
      const locationCoords = { lat: 16.3067, lon: 80.4365 }; // Guntur coordinates
      
      // Fetch current weather from OpenWeatherMap
      const currentWeatherRes = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${locationCoords.lat}&lon=${locationCoords.lon}&appid=${API_KEY}&units=metric`
      );
      const currentWeatherData = await currentWeatherRes.json();
      
      // Fetch 7-day forecast
      const forecastRes = await fetch(
        `https://api.openweathermap.org/data/2.5/forecast?lat=${locationCoords.lat}&lon=${locationCoords.lon}&appid=${API_KEY}&units=metric`
      );
      const forecastData = await forecastRes.json();
      
      // Fetch air quality data
      const aqiRes = await fetch(
        `https://api.openweathermap.org/data/2.5/air_pollution?lat=${locationCoords.lat}&lon=${locationCoords.lon}&appid=${API_KEY}`
      );
      const aqiData = await aqiRes.json();
      
      // Send to backend for ML prediction
      const predictionRes = await fetch(`${BACKEND_URL}/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          current_weather: currentWeatherData,
          forecast: forecastData,
          aqi: aqiData
        })
      });
      const mlPredictions = await predictionRes.json();
      
      // Process current weather
      const processedWeather = {
        current: {
          temp: currentWeatherData.main.temp,
          humidity: currentWeatherData.main.humidity,
          pressure: currentWeatherData.main.pressure,
          windSpeed: currentWeatherData.wind.speed * 3.6, // convert m/s to km/h
          aqi: aqiData.list[0]?.main.aqi * 50 || 0, // Convert to standard AQI scale
          description: currentWeatherData.weather[0].description
        },
        prediction: mlPredictions.temperature_prediction
      };
      
      // Process 7-day forecast
      const processedForecast = forecastData.list
        .filter((item, index) => index % 8 === 0) // Get one reading per day
        .slice(0, 7)
        .map((item, index) => ({
          day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][index],
          temp: item.main.temp,
          humidity: item.main.humidity,
          rainfall: item.rain?.['3h'] || 0,
          predicted: mlPredictions.forecast_predictions[index]?.temp || item.main.temp,
          aqi: mlPredictions.forecast_predictions[index]?.aqi || 50
        }));
      
      const processedAlerts = generateAlerts(processedWeather, processedForecast);
      
      setWeatherData(processedWeather);
      setForecast(processedForecast);
      setAlerts(processedAlerts);
      
    } catch (error) {
      console.error('Error fetching weather data:', error);
      // Fallback to mock data if API fails
      const mockWeather = {
        current: {
          temp: 28.5,
          humidity: 75,
          pressure: 1013,
          windSpeed: 12,
          aqi: 65,
          description: 'API Error - Using Mock Data'
        },
        prediction: {
          temp: 29.2,
          confidence: 94.5
        }
      };

      const mockForecast = Array.from({ length: 7 }, (_, i) => ({
        day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
        temp: 26 + Math.random() * 6,
        humidity: 65 + Math.random() * 20,
        rainfall: Math.random() * 15,
        predicted: 26.5 + Math.random() * 6,
        aqi: 50 + Math.random() * 40
      }));

      setWeatherData(mockWeather);
      setForecast(mockForecast);
      setAlerts(generateAlerts(mockWeather, mockForecast));
    }
    
    setLoading(false);
  };

  const generateAlerts = (current, forecast) => {
    const alerts = [];
    
    if (current.current.temp > 32) {
      alerts.push({
        type: 'warning',
        message: 'High temperature alert! Heat stress possible for crops.',
        recommendation: 'Increase irrigation frequency and consider shade netting.'
      });
    }

    if (current.current.aqi > 100) {
      alerts.push({
        type: 'danger',
        message: 'Poor air quality detected!',
        recommendation: 'Monitor crop health closely for pollution stress.'
      });
    }

    const avgRainfall = forecast.reduce((sum, day) => sum + day.rainfall, 0) / forecast.length;
    if (avgRainfall < 2) {
      alerts.push({
        type: 'warning',
        message: 'Low rainfall predicted for the coming week.',
        recommendation: 'Plan irrigation schedule and ensure water availability.'
      });
    }

    return alerts;
  };

  const addLocation = () => {
    if (!savedLocations.includes(location)) {
      setSavedLocations([...savedLocations, location]);
    }
  };

  const toggleCrop = (crop) => {
    setSelectedCrops(prev => 
      prev.includes(crop) 
        ? prev.filter(c => c !== crop)
        : [...prev, crop]
    );
  };

  // Home Page
  const HomePage = () => (
    <div style={styles.pageContainer}>
      <div style={styles.headerCard}>
        <h1 style={styles.mainTitle}>Precision Agriculture Dashboard</h1>
        <p style={styles.subtitle}>AI-Powered Climate-Aware Crop Management</p>
      </div>

      {/* Current Weather Overview */}
      <div style={styles.grid4}>
        <div style={styles.card}>
          <div style={styles.cardContent}>
            <div>
              <p style={styles.label}>Temperature</p>
              <p style={styles.value}>{weatherData?.current.temp}°C</p>
              <p style={styles.predicted}>Predicted: {weatherData?.prediction.temp}°C</p>
            </div>
            <Thermometer style={styles.iconOrange} />
          </div>
        </div>

        <div style={styles.card}>
          <div style={styles.cardContent}>
            <div>
              <p style={styles.label}>Humidity</p>
              <p style={styles.value}>{weatherData?.current.humidity}%</p>
              <p style={styles.predictedBlue}>Optimal Range</p>
            </div>
            <Droplets style={styles.iconBlue} />
          </div>
        </div>

        <div style={styles.card}>
          <div style={styles.cardContent}>
            <div>
              <p style={styles.label}>Wind Speed</p>
              <p style={styles.value}>{weatherData?.current.windSpeed} km/h</p>
              <p style={styles.labelSmall}>Moderate</p>
            </div>
            <Wind style={styles.iconCyan} />
          </div>
        </div>

        <div style={styles.card}>
          <div style={styles.cardContent}>
            <div>
              <p style={styles.label}>Air Quality</p>
              <p style={styles.value}>AQI {weatherData?.current.aqi}</p>
              <p style={styles.predicted}>Moderate</p>
            </div>
            <Activity style={styles.iconPurple} />
          </div>
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div style={styles.card}>
          <div style={styles.alertHeader}>
            <Bell style={styles.bellIcon} />
            <h2 style={styles.sectionTitle}>Active Alerts</h2>
          </div>
          <div style={styles.alertsContainer}>
            {alerts.map((alert, idx) => (
              <div key={idx} style={alert.type === 'warning' ? styles.alertWarning : styles.alertDanger}>
                <div style={styles.alertContent}>
                  <AlertTriangle style={alert.type === 'warning' ? styles.alertIconWarning : styles.alertIconDanger} />
                  <div>
                    <p style={styles.alertMessage}>{alert.message}</p>
                    <p style={styles.alertRecommendation}>{alert.recommendation}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Stats */}
      <div style={styles.grid2}>
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Model Performance</h3>
          <div style={styles.performanceContainer}>
            <div>
              <div style={styles.performanceRow}>
                <span style={styles.performanceLabel}>Ensemble Model Accuracy</span>
                <span style={styles.performanceValue}>{modelPerformance.ensemble.accuracy}%</span>
              </div>
              <div style={styles.progressBar}>
                <div style={{...styles.progressFill, width: `${modelPerformance.ensemble.accuracy}%`}}></div>
              </div>
            </div>
            <div style={styles.metricsGrid}>
              <div>
                <p style={styles.metricLabel}>MAE</p>
                <p style={styles.metricValue}>{modelPerformance.ensemble.mae}</p>
              </div>
              <div>
                <p style={styles.metricLabel}>RMSE</p>
                <p style={styles.metricValue}>{modelPerformance.ensemble.rmse}</p>
              </div>
            </div>
          </div>
        </div>

        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Selected Crops</h3>
          <div style={styles.cropsContainer}>
            {selectedCrops.map(crop => (
              <div key={crop} style={styles.cropItem}>
                <span style={styles.cropContent}>
                  <span style={styles.cropIcon}>{cropsData[crop].icon}</span>
                  <span style={styles.cropName}>{cropsData[crop].name}</span>
                </span>
                <span style={styles.activeStatus}>Active</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  // Weather Prediction Page
  const WeatherPage = () => (
    <div style={styles.pageContainer}>
      <div style={styles.card}>
        <h2 style={styles.pageTitle}>7-Day Weather Forecast</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={forecast}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="day" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="temp" stroke="#f59e0b" name="Actual Temp (°C)" strokeWidth={2} />
            <Line type="monotone" dataKey="predicted" stroke="#10b981" name="Predicted Temp (°C)" strokeWidth={2} strokeDasharray="5 5" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div style={styles.grid2}>
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Humidity & Rainfall Trends</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={forecast}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="humidity" fill="#3b82f6" name="Humidity (%)" />
              <Bar dataKey="rainfall" fill="#0ea5e9" name="Rainfall (mm)" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Air Quality Index</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={forecast}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="aqi" stroke="#8b5cf6" name="AQI" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
          <div style={styles.aqiLegend}>
            <div style={styles.aqiGood}>
              <p style={styles.aqiValue}>0-50</p>
              <p style={styles.aqiLabel}>Good</p>
            </div>
            <div style={styles.aqiModerate}>
              <p style={styles.aqiValue}>51-100</p>
              <p style={styles.aqiLabel}>Moderate</p>
            </div>
            <div style={styles.aqiPoor}>
              <p style={styles.aqiValue}>101+</p>
              <p style={styles.aqiLabel}>Poor</p>
            </div>
          </div>
        </div>
      </div>

      <div style={styles.card}>
        <h3 style={styles.cardTitle}>Prediction Model Performance</h3>
        <div style={styles.modelGrid}>
          {Object.entries(modelPerformance).map(([model, perf]) => (
            <div key={model} style={styles.modelCard}>
              <p style={styles.modelName}>{model.charAt(0).toUpperCase() + model.slice(1)}</p>
              <p style={styles.modelAccuracy}>{perf.accuracy}%</p>
              <div style={styles.modelMetrics}>
                <p>MAE: {perf.mae}</p>
                <p>RMSE: {perf.rmse}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // Crop Management Page
  const CropPage = () => {
    const getRecommendation = (crop) => {
      const weather = weatherData?.current;
      if (!weather) return 'Loading recommendations...';

      const cropInfo = cropsData[crop];
      const recommendations = [];

      if (weather.temp < cropInfo.tempRange[0]) {
        recommendations.push('⚠️ Temperature below optimal range. Consider protective measures.');
      } else if (weather.temp > cropInfo.tempRange[1]) {
        recommendations.push('⚠️ Temperature above optimal range. Increase irrigation and consider shade.');
      } else {
        recommendations.push('✅ Temperature is optimal for growth.');
      }

      if (weather.humidity < cropInfo.humidityRange[0]) {
        recommendations.push('💧 Humidity is low. Increase irrigation frequency.');
      } else if (weather.humidity > cropInfo.humidityRange[1]) {
        recommendations.push('⚠️ High humidity. Monitor for fungal diseases.');
      } else {
        recommendations.push('✅ Humidity levels are good.');
      }

      return recommendations;
    };

    return (
      <div style={styles.pageContainer}>
        <div style={styles.card}>
          <h2 style={styles.pageTitle}>Crop Selection</h2>
          <div style={styles.grid3}>
            {Object.entries(cropsData).map(([key, crop]) => (
              <div 
                key={key}
                onClick={() => toggleCrop(key)}
                style={selectedCrops.includes(key) ? styles.cropCardSelected : styles.cropCardUnselected}
              >
                <div style={styles.cropCardHeader}>
                  <span style={styles.cropCardIcon}>{crop.icon}</span>
                  <input 
                    type="checkbox" 
                    checked={selectedCrops.includes(key)}
                    onChange={() => {}}
                    style={styles.checkbox}
                  />
                </div>
                <h3 style={styles.cropCardTitle}>{crop.name}</h3>
                <div style={styles.cropDetails}>
                  <p>🌡️ {crop.tempRange[0]}-{crop.tempRange[1]}°C</p>
                  <p>💧 {crop.humidityRange[0]}-{crop.humidityRange[1]}% RH</p>
                  <p>🌧️ {crop.rainfall}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {selectedCrops.map(crop => (
          <div key={crop} style={styles.card}>
            <div style={styles.cropRecommendationHeader}>
              <span style={styles.cropCardIcon}>{cropsData[crop].icon}</span>
              <h3 style={styles.cardTitle}>{cropsData[crop].name} Recommendations</h3>
            </div>
            
            <div style={styles.grid2}>
              <div>
                <h4 style={styles.subTitle}>Current Conditions Analysis</h4>
                <div style={styles.recommendationsContainer}>
                  {getRecommendation(crop).map((rec, idx) => (
                    <div key={idx} style={styles.recommendationItem}>
                      {rec}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 style={styles.subTitle}>Growth Stages</h4>
                <div style={styles.stagesContainer}>
                  {cropsData[crop].growthStages.map((stage, idx) => (
                    <div key={idx} style={styles.stageItem}>
                      <div style={styles.stageBadge}>
                        {idx + 1}
                      </div>
                      <span style={styles.stageName}>{stage}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Multi-Crop Comparison Page
  const ComparisonPage = () => {
    const comparisonData = selectedCrops.map(crop => ({
      crop: cropsData[crop].name,
      tempMin: cropsData[crop].tempRange[0],
      tempMax: cropsData[crop].tempRange[1],
      humidityMin: cropsData[crop].humidityRange[0],
      humidityMax: cropsData[crop].humidityRange[1]
    }));

    const radarData = [
      {
        metric: 'Temp Suitability',
        ...Object.fromEntries(selectedCrops.map(crop => {
          const range = cropsData[crop].tempRange;
          const current = weatherData?.current.temp || 28;
          const suitability = current >= range[0] && current <= range[1] ? 100 : 
            Math.max(0, 100 - Math.abs(current - (range[0] + range[1]) / 2) * 5);
          return [crop, suitability];
        }))
      },
      {
        metric: 'Humidity Suitability',
        ...Object.fromEntries(selectedCrops.map(crop => {
          const range = cropsData[crop].humidityRange;
          const current = weatherData?.current.humidity || 75;
          const suitability = current >= range[0] && current <= range[1] ? 100 : 
            Math.max(0, 100 - Math.abs(current - (range[0] + range[1]) / 2) * 2);
          return [crop, suitability];
        }))
      },
      {
        metric: 'Overall Health',
        ...Object.fromEntries(selectedCrops.map(crop => [crop, 75 + Math.random() * 20]))
      }
    ];

    return (
      <div style={styles.pageContainer}>
        <div style={styles.card}>
          <h2 style={styles.pageTitle}>Multi-Crop Environmental Comparison</h2>
          <ResponsiveContainer width="100%" height={350}>
            <RadarChart data={radarData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="metric" />
              <PolarRadiusAxis angle={90} domain={[0, 100]} />
              {selectedCrops.map((crop, idx) => (
                <Radar
                  key={crop}
                  name={cropsData[crop].name}
                  dataKey={crop}
                  stroke={['#10b981', '#f59e0b', '#3b82f6'][idx]}
                  fill={['#10b981', '#f59e0b', '#3b82f6'][idx]}
                  fillOpacity={0.3}
                />
              ))}
              <Legend />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Environmental Requirements Comparison</h3>
          <div style={styles.tableContainer}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.tableHeader}>
                  <th style={styles.th}>Crop</th>
                  <th style={styles.th}>Temperature Range</th>
                  <th style={styles.th}>Humidity Range</th>
                  <th style={styles.th}>Rainfall Need</th>
                  <th style={styles.th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {selectedCrops.map(crop => {
                  const info = cropsData[crop];
                  const weather = weatherData?.current;
                  const tempOk = weather && weather.temp >= info.tempRange[0] && weather.temp <= info.tempRange[1];
                  const humidityOk = weather && weather.humidity >= info.humidityRange[0] && weather.humidity <= info.humidityRange[1];
                  const overallOk = tempOk && humidityOk;

                  return (
                    <tr key={crop} style={styles.tableRow}>
                      <td style={styles.td}>
                        <span style={styles.tableCropIcon}>{info.icon}</span>
                        {info.name}
                      </td>
                      <td style={styles.td}>{info.tempRange[0]}-{info.tempRange[1]}°C</td>
                      <td style={styles.td}>{info.humidityRange[0]}-{info.humidityRange[1]}%</td>
                      <td style={styles.td}>{info.rainfall}</td>
                      <td style={styles.td}>
                        <span style={overallOk ? styles.statusOptimal : styles.statusAttention}>
                          {overallOk ? 'Optimal' : 'Attention Needed'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div style={styles.grid2}>
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>Temperature Compatibility</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={comparisonData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="crop" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="tempMin" fill="#60a5fa" name="Min Temp (°C)" />
                <Bar dataKey="tempMax" fill="#f59e0b" name="Max Temp (°C)" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div style={styles.card}>
            <h3 style={styles.cardTitle}>Humidity Requirements</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={comparisonData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="crop" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="humidityMin" fill="#10b981" name="Min Humidity (%)" />
                <Bar dataKey="humidityMax" fill="#3b82f6" name="Max Humidity (%)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    );
  };

  // Analytics Page
  const AnalyticsPage = () => (
    <div style={styles.pageContainer}>
      <div style={styles.card}>
        <h2 style={styles.pageTitle}>ML Model Performance Analytics</h2>
        <div style={styles.analyticsGrid}>
          <div style={styles.analyticsChartContainer}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={Object.entries(modelPerformance).map(([name, perf]) => ({
                name: name.charAt(0).toUpperCase() + name.slice(1),
                Accuracy: perf.accuracy,
                MAE: perf.mae * 10,
                RMSE: perf.rmse * 10
              }))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="Accuracy" fill="#10b981" />
                <Bar dataKey="MAE" fill="#f59e0b" />
                <Bar dataKey="RMSE" fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          
          <div style={styles.analyticsStatsContainer}>
            <div style={styles.statCardGreen}>
              <p style={styles.statLabel}>Best Performer</p>
              <p style={styles.statTitle}>Ensemble Model</p>
              <p style={styles.statValue}>{modelPerformance.ensemble.accuracy}% Accuracy</p>
            </div>
            <div style={styles.statCardBlue}>
              <p style={styles.statLabel}>Avg Error Rate</p>
              <p style={styles.statTitle}>{modelPerformance.ensemble.mae}</p>
              <p style={styles.statValue}>Mean Absolute Error</p>
            </div>
            <div style={styles.statCardPurple}>
              <p style={styles.statLabel}>Prediction Stability</p>
              <p style={styles.statTitle}>{modelPerformance.ensemble.rmse}</p>
              <p style={styles.statValue}>Root Mean Square Error</p>
            </div>
          </div>
        </div>
      </div>

      <div style={styles.grid2}>
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Model Accuracy Breakdown</h3>
          <div style={styles.accuracyContainer}>
            {Object.entries(modelPerformance).map(([model, perf]) => (
              <div key={model} style={styles.accuracyItem}>
                <div style={styles.accuracyRow}>
                  <span style={styles.accuracyLabel}>{model.charAt(0).toUpperCase() + model.slice(1)}</span>
                  <span style={styles.accuracyValue}>{perf.accuracy}%</span>
                </div>
                <div style={styles.progressBar}>
                  <div style={{...styles.progressFillGradient, width: `${perf.accuracy}%`}}></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Prediction Reliability</h3>
          <div style={styles.reliabilityContainer}>
            <div style={styles.reliabilityItemGreen}>
              <h4 style={styles.reliabilityTitle}>Supervised Learning</h4>
              <p style={styles.reliabilityText}>
                Linear regression and decision tree models provide baseline predictions with high interpretability.
              </p>
            </div>
            <div style={styles.reliabilityItemBlue}>
              <h4 style={styles.reliabilityTitle}>Ensemble Methods</h4>
              <p style={styles.reliabilityText}>
                Random forest approaches combine multiple learners for robust, stable predictions under varying conditions.
              </p>
            </div>
            <div style={styles.reliabilityItemPurple}>
              <h4 style={styles.reliabilityTitle}>Continuous Learning</h4>
              <p style={styles.reliabilityText}>
                Models are periodically updated with new environmental data to maintain accuracy over time.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div style={styles.card}>
        <h3 style={styles.cardTitle}>Historical Prediction Accuracy</h3>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={Array.from({length: 12}, (_, i) => ({
            month: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][i],
            accuracy: 90 + Math.random() * 8,
            target: 95
          }))}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis domain={[85, 100]} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="accuracy" stroke="#10b981" strokeWidth={2} name="Model Accuracy %" />
            <Line type="monotone" dataKey="target" stroke="#6b7280" strokeDasharray="5 5" name="Target %" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  // Settings Page
  const SettingsPage = () => (
    <div style={styles.pageContainer}>
      <div style={styles.card}>
        <h2 style={styles.pageTitle}>Location Management</h2>
        <div style={styles.locationInputContainer}>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Enter location"
            style={styles.input}
          />
          <button
            onClick={addLocation}
            style={styles.buttonGreen}
          >
            Add Location
          </button>
          <button
            onClick={fetchWeatherData}
            style={styles.buttonBlue}
          >
            Refresh Data
          </button>
        </div>
        
        <div style={styles.savedLocationsContainer}>
          <h3 style={styles.subTitle}>Saved Locations</h3>
          {savedLocations.length === 0 ? (
            <p style={styles.emptyMessage}>No saved locations yet</p>
          ) : (
            savedLocations.map((loc, idx) => (
              <div key={idx} style={styles.locationItem}>
                <div style={styles.locationContent}>
                  <MapPin style={styles.mapPinIcon} />
                  <span>{loc}</span>
                </div>
                <button
                  onClick={() => setSavedLocations(savedLocations.filter((_, i) => i !== idx))}
                  style={styles.removeButton}
                >
                  Remove
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <div style={styles.card}>
        <h2 style={styles.pageTitle}>System Information</h2>
        <div style={styles.grid2}>
          <div style={styles.infoCard}>
            <p style={styles.infoLabel}>Framework Type</p>
            <p style={styles.infoValue}>Sensor-Independent AI System</p>
          </div>
          <div style={styles.infoCard}>
            <p style={styles.infoLabel}>Data Source</p>
            <p style={styles.infoValue}>OpenWeatherMap API</p>
          </div>
          <div style={styles.infoCard}>
            <p style={styles.infoLabel}>ML Architecture</p>
            <p style={styles.infoValue}>Ensemble Learning Models</p>
          </div>
          <div style={styles.infoCard}>
            <p style={styles.infoLabel}>Update Frequency</p>
            <p style={styles.infoValue}>Real-time Continuous</p>
          </div>
        </div>
      </div>

      <div style={styles.card}>
        <h2 style={styles.pageTitle}>About This System</h2>
        <div style={styles.aboutContent}>
          <p style={styles.aboutParagraph}>
            This precision agriculture framework integrates sensor-independent environmental data analysis 
            with machine learning-based prediction and feedback-oriented dashboards.
          </p>
          <p style={styles.aboutParagraph}>
            The system effectively transforms raw environmental data into actionable insights to support 
            agricultural decision-making through:
          </p>
          <ul style={styles.featuresList}>
            <li>Multi-parameter environmental monitoring (temperature, humidity, rainfall, air quality)</li>
            <li>Ensemble machine learning models with 95.8% accuracy</li>
            <li>Real-time risk assessment and early warning alerts</li>
            <li>Multi-crop compatibility analysis and growth stage recommendations</li>
            <li>Cost-effective deployment without physical sensor requirements</li>
          </ul>
        </div>
      </div>
    </div>
  );

  const pages = {
    home: { component: HomePage, icon: Home, title: 'Dashboard' },
    weather: { component: WeatherPage, icon: Cloud, title: 'Weather Prediction' },
    crops: { component: CropPage, icon: Sprout, title: 'Crop Management' },
    comparison: { component: ComparisonPage, icon: BarChart3, title: 'Multi-Crop Analysis' },
    analytics: { component: AnalyticsPage, icon: TrendingUp, title: 'ML Analytics' },
    settings: { component: SettingsPage, icon: Settings, title: 'Settings' }
  };

  const CurrentPageComponent = pages[currentPage].component;

  return (
    <div style={styles.appContainer}>
      {/* Navigation */}
      <nav style={styles.navbar}>
        <div style={styles.navContent}>
          <div style={styles.navLeft}>
            <Sprout style={styles.logoIcon} />
            <div>
              <h1 style={styles.navTitle}>AgriAI Dashboard</h1>
              <p style={styles.navSubtitle}>Precision Agriculture System</p>
            </div>
          </div>
          <div style={styles.navRight}>
            <MapPin style={styles.locationIcon} />
            <span style={styles.locationText}>{location}</span>
          </div>
        </div>
      </nav>

      <div style={styles.mainLayout}>
        {/* Sidebar */}
        <div style={styles.sidebar}>
          <div style={styles.sidebarContent}>
            {Object.entries(pages).map(([key, page]) => {
              const Icon = page.icon;
              return (
                <button
                  key={key}
                  onClick={() => setCurrentPage(key)}
                  style={currentPage === key ? styles.navButtonActive : styles.navButtonInactive}
                >
                  <Icon style={styles.navIcon} />
                  <span style={styles.navButtonText}>{page.title}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Content */}
        <div style={styles.mainContent}>
          {loading ? (
            <div style={styles.loadingContainer}>
              <div style={styles.loadingContent}>
                <div style={styles.spinner}></div>
                <p style={styles.loadingText}>Loading environmental data...</p>
              </div>
            </div>
          ) : (
            <CurrentPageComponent />
          )}
        </div>
      </div>
    </div>
  );
};

// CSS Styles Object
const styles = {
  appContainer: {
    minHeight: '100vh',
    backgroundColor: '#f3f4f6',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
  },
  navbar: {
    backgroundColor: '#ffffff',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    position: 'sticky',
    top: 0,
    zIndex: 1000
  },
  navContent: {
    maxWidth: '1280px',
    margin: '0 auto',
    padding: '0 1rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: '64px'
  },
  navLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  logoIcon: {
    width: '32px',
    height: '32px',
    color: '#16a34a'
  },
  navTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#1f2937',
    margin: 0
  },
  navSubtitle: {
    fontSize: '12px',
    color: '#6b7280',
    margin: 0
  },
  navRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  locationIcon: {
    width: '16px',
    height: '16px',
    color: '#6b7280'
  },
  locationText: {
    fontSize: '14px',
    color: '#374151'
  },
  mainLayout: {
    display: 'flex',
    maxWidth: '1280px',
    margin: '0 auto'
  },
  sidebar: {
    width: '256px',
    backgroundColor: '#ffffff',
    boxShadow: '2px 0 4px rgba(0,0,0,0.05)',
    minHeight: 'calc(100vh - 64px)',
    padding: '1rem'
  },
  sidebarContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  navButtonActive: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    backgroundColor: '#16a34a',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.2s'
  },
  navButtonInactive: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    backgroundColor: 'transparent',
    color: '#374151',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.2s'
  },
  navIcon: {
    width: '20px',
    height: '20px'
  },
  navButtonText: {
    fontWeight: '500'
  },
  mainContent: {
    flex: 1,
    padding: '24px'
  },
  pageContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px'
  },
  headerCard: {
    background: 'linear-gradient(135deg, #16a34a 0%, #059669 100%)',
    borderRadius: '8px',
    padding: '24px',
    color: '#ffffff'
  },
  mainTitle: {
    fontSize: '28px',
    fontWeight: 'bold',
    marginBottom: '8px',
    margin: 0
  },
  subtitle: {
    color: '#d1fae5',
    margin: 0
  },
  grid4: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px'
  },
  grid3: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '16px'
  },
  grid2: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '24px'
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    padding: '24px'
  },
  cardContent: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  label: {
    fontSize: '14px',
    color: '#6b7280',
    margin: '0 0 4px 0'
  },
  value: {
    fontSize: '24px',
    fontWeight: 'bold',
    margin: '0 0 4px 0'
  },
  predicted: {
    fontSize: '12px',
    color: '#16a34a',
    margin: 0
  },
  predictedBlue: {
    fontSize: '12px',
    color: '#2563eb',
    margin: 0
  },
  labelSmall: {
    fontSize: '12px',
    color: '#6b7280',
    margin: 0
  },
  iconOrange: {
    width: '32px',
    height: '32px',
    color: '#f97316'
  },
  iconBlue: {
    width: '32px',
    height: '32px',
    color: '#3b82f6'
  },
  iconCyan: {
    width: '32px',
    height: '32px',
    color: '#06b6d4'
  },
  iconPurple: {
    width: '32px',
    height: '32px',
    color: '#a855f7'
  },
  alertHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '16px'
  },
  bellIcon: {
    width: '20px',
    height: '20px',
    color: '#f97316'
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    margin: 0
  },
  alertsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  alertWarning: {
    borderLeft: '4px solid #eab308',
    backgroundColor: '#fef9c3',
    padding: '16px',
    borderRadius: '4px'
  },
  alertDanger: {
    borderLeft: '4px solid #ef4444',
    backgroundColor: '#fee2e2',
    padding: '16px',
    borderRadius: '4px'
  },
  alertContent: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px'
  },
  alertIconWarning: {
    width: '20px',
    height: '20px',
    color: '#ca8a04',
    marginTop: '2px',
    flexShrink: 0
  },
  alertIconDanger: {
    width: '20px',
    height: '20px',
    color: '#dc2626',
    marginTop: '2px',
    flexShrink: 0
  },
  alertMessage: {
    fontWeight: '600',
    color: '#1f2937',
    margin: '0 0 4px 0'
  },
  alertRecommendation: {
    fontSize: '14px',
    color: '#4b5563',
    margin: 0
  },
  performanceContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  performanceRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '4px',
    fontSize: '14px'
  },
  performanceLabel: {
    fontWeight: '500'
  },
  performanceValue: {
    fontWeight: '600'
  },
  progressBar: {
    width: '100%',
    backgroundColor: '#e5e7eb',
    borderRadius: '9999px',
    height: '12px',
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#16a34a',
    borderRadius: '9999px',
    transition: 'width 0.3s'
  },
  progressFillGradient: {
    height: '100%',
    background: 'linear-gradient(90deg, #16a34a 0%, #059669 100%)',
    borderRadius: '9999px',
    transition: 'width 0.3s'
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
    paddingTop: '8px',
    fontSize: '14px'
  },
  metricLabel: {
    color: '#6b7280',
    margin: 0
  },
  metricValue: {
    fontWeight: '600',
    margin: 0
  },
  cropsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  cropItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px',
    backgroundColor: '#f0fdf4',
    borderRadius: '6px'
  },
  cropContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  cropIcon: {
    fontSize: '24px'
  },
  cropName: {
    fontWeight: '500'
  },
  activeStatus: {
    fontSize: '14px',
    color: '#16a34a'
  },
  pageTitle: {
    fontSize: '24px',
    fontWeight: 'bold',
    marginBottom: '16px',
    margin: '0 0 16px 0'
  },
  cardTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    marginBottom: '16px',
    margin: '0 0 16px 0'
  },
  aqiLegend: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: '8px',
    marginTop: '16px',
    fontSize: '12px'
  },
  aqiGood: {
    textAlign: 'center',
    padding: '8px',
    backgroundColor: '#f0fdf4',
    borderRadius: '6px'
  },
  aqiModerate: {
    textAlign: 'center',
    padding: '8px',
    backgroundColor: '#fef9c3',
    borderRadius: '6px'
  },
  aqiPoor: {
    textAlign: 'center',
    padding: '8px',
    backgroundColor: '#fee2e2',
    borderRadius: '6px'
  },
  aqiValue: {
    fontWeight: '600',
    color: '#1f2937',
    margin: '0 0 2px 0'
  },
  aqiLabel: {
    fontSize: '10px',
    margin: 0
  },
  modelGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '16px'
  },
  modelCard: {
    textAlign: 'center',
    padding: '16px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px'
  },
  modelName: {
    fontSize: '14px',
    color: '#6b7280',
    textTransform: 'capitalize',
    marginBottom: '8px',
    margin: '0 0 8px 0'
  },
  modelAccuracy: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#16a34a',
    margin: '0 0 8px 0'
  },
  modelMetrics: {
    fontSize: '12px',
    color: '#6b7280'
  },
  cropCardSelected: {
    padding: '16px',
    borderRadius: '8px',
    border: '2px solid #16a34a',
    backgroundColor: '#f0fdf4',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  cropCardUnselected: {
    padding: '16px',
    borderRadius: '8px',
    border: '2px solid #e5e7eb',
    backgroundColor: '#ffffff',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  cropCardHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '8px'
  },
  cropCardIcon: {
    fontSize: '32px'
  },
  checkbox: {
    width: '20px',
    height: '20px',
    cursor: 'pointer'
  },
  cropCardTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    margin: '0 0 8px 0'
  },
  cropDetails: {
    marginTop: '8px',
    fontSize: '14px',
    color: '#4b5563',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  cropRecommendationHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '16px'
  },
  subTitle: {
    fontWeight: '600',
    marginBottom: '12px',
    margin: '0 0 12px 0'
  },
  recommendationsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  recommendationItem: {
    padding: '12px',
    backgroundColor: '#f9fafb',
    borderRadius: '6px',
    fontSize: '14px'
  },
  stagesContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  stageItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '8px'
  },
  stageBadge: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    backgroundColor: '#d1fae5',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: '600',
    color: '#047857'
  },
  stageName: {
    fontSize: '14px'
  },
  tableContainer: {
    overflowX: 'auto'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse'
  },
  tableHeader: {
    backgroundColor: '#f9fafb'
  },
  th: {
    padding: '12px 16px',
    textAlign: 'left',
    fontWeight: '600',
    fontSize: '14px',
    color: '#374151'
  },
  tableRow: {
    borderBottom: '1px solid #e5e7eb'
  },
  td: {
    padding: '12px 16px',
    fontSize: '14px',
    color: '#4b5563'
  },
  tableCropIcon: {
    fontSize: '24px',
    marginRight: '8px'
  },
  statusOptimal: {
    padding: '4px 12px',
    borderRadius: '9999px',
    fontSize: '12px',
    backgroundColor: '#d1fae5',
    color: '#047857'
  },
  statusAttention: {
    padding: '4px 12px',
    borderRadius: '9999px',
    fontSize: '12px',
    backgroundColor: '#fef3c7',
    color: '#92400e'
  },
  analyticsGrid: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr',
    gap: '24px'
  },
  analyticsChartContainer: {
    width: '100%'
  },
  analyticsStatsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  statCardGreen: {
    padding: '16px',
    backgroundColor: '#f0fdf4',
    borderRadius: '8px'
  },
  statCardBlue: {
    padding: '16px',
    backgroundColor: '#eff6ff',
    borderRadius: '8px'
  },
  statCardPurple: {
    padding: '16px',
    backgroundColor: '#faf5ff',
    borderRadius: '8px'
  },
  statLabel: {
    fontSize: '14px',
    color: '#6b7280',
    margin: 0
  },
  statTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    margin: '4px 0'
  },
  statValue: {
    fontSize: '14px',
    margin: 0
  },
  accuracyContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  accuracyItem: {
    display: 'flex',
    flexDirection: 'column'
  },
  accuracyRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '4px'
  },
  accuracyLabel: {
    textTransform: 'capitalize',
    fontSize: '14px',
    fontWeight: '500'
  },
  accuracyValue: {
    fontSize: '14px',
    fontWeight: '600'
  },
  reliabilityContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  reliabilityItemGreen: {
    padding: '16px',
    borderLeft: '4px solid #16a34a',
    backgroundColor: '#f0fdf4'
  },
  reliabilityItemBlue: {
    padding: '16px',
    borderLeft: '4px solid #3b82f6',
    backgroundColor: '#eff6ff'
  },
  reliabilityItemPurple: {
    padding: '16px',
    borderLeft: '4px solid #a855f7',
    backgroundColor: '#faf5ff'
  },
  reliabilityTitle: {
    fontWeight: '600',
    margin: '0 0 4px 0'
  },
  reliabilityText: {
    fontSize: '14px',
    color: '#4b5563',
    margin: 0
  },
  locationInputContainer: {
    display: 'flex',
    gap: '12px',
    marginBottom: '16px'
  },
  input: {
    flex: 1,
    padding: '8px 16px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none'
  },
  buttonGreen: {
    padding: '8px 24px',
    backgroundColor: '#16a34a',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500'
  },
  buttonBlue: {
    padding: '8px 24px',
    backgroundColor: '#2563eb',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500'
  },
  savedLocationsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  emptyMessage: {
    fontSize: '14px',
    color: '#6b7280'
  },
  locationItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px'
  },
  locationContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  mapPinIcon: {
    width: '16px',
    height: '16px',
    color: '#16a34a'
  },
  removeButton: {
    color: '#dc2626',
    backgroundColor: 'transparent',
    border: 'none',
    fontSize: '14px',
    cursor: 'pointer',
    padding: '4px 8px'
  },
  infoCard: {
    padding: '16px',
    backgroundColor: '#f9fafb',
    borderRadius: '6px'
  },
  infoLabel: {
    fontSize: '14px',
    color: '#6b7280',
    margin: '0 0 4px 0'
  },
  infoValue: {
    fontWeight: '600',
    margin: 0
  },
  aboutContent: {
    color: '#4b5563'
  },
  aboutParagraph: {
    marginBottom: '12px',
    lineHeight: '1.6'
  },
  featuresList: {
    marginLeft: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    lineHeight: '1.6'
  },
  loadingContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '400px'
  },
  loadingContent: {
    textAlign: 'center'
  },
  spinner: {
    width: '48px',
    height: '48px',
    border: '4px solid #e5e7eb',
    borderTop: '4px solid #16a34a',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 16px auto'
  },
  loadingText: {
    color: '#6b7280'
  }
};

// Add CSS animation for spinner
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
document.head.appendChild(styleSheet);

export default PrecisionAgDashboard;