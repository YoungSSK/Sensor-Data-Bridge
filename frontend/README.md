# 🖥️ Frontend - IoT Dashboard

React + Vite frontend for monitoring and interacting with Sensor-Data-Bridge.

## Structure
```text
frontend/
├── public/             # Static files
├── src/
│   ├── components/     # React UI components (Cards, Modals)
│   ├── services/       # API integration client (fetch / axios)
│   ├── styles/         # CSS styles
│   ├── App.jsx         # Main dashboard view
│   └── main.jsx        # App entry point
├── package.json        # Dependencies & scripts
└── vite.config.js      # Vite build & dev-proxy config
```

## Running Frontend
```bash
npm install
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) to view the dashboard.
