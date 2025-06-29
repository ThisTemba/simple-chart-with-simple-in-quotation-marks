# Simple CSV Chart

A modern, minimalist web application for visualizing correlations between time series data from CSV files.

## Features

- 📊 **Multi-file CSV upload** - Upload multiple CSV files simultaneously
- 📈 **Interactive charts** - Built with Chart.js for smooth data visualization
- 🔄 **Correlation analysis** - Compare multiple datasets on the same chart
- 📱 **Responsive design** - Works perfectly on desktop and mobile devices
- 🎨 **Modern UI** - Clean, minimalist interface with smooth animations
- 📋 **Raw data tables** - View the original data alongside the charts

## Usage

1. **Upload CSV files** - Click "Choose CSV Files" to select one or more CSV files
2. **View correlations** - Each dataset appears as a colored line on the chart
3. **Inspect data** - Scroll down to see raw data tables for each file
4. **Clear data** - Use "Clear All" to start fresh

## CSV Format

Your CSV files should have the following format:

```csv
date,Variable Name
2024-01-01,10.5
2024-01-02,12.3
2024-01-03,11.8
```

- **First column**: Date (any format)
- **Second column**: Numeric value
- **First row**: Headers (will be used as legend labels)

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Deployment

This app is automatically deployed to GitHub Pages when you push to the `main` branch.

- **Live site**: https://yourusername.github.io/simple-chart-with-simple-in-quotation-marks/
- **Build process**: Uses GitHub Actions to build and deploy the Vite app

## Technologies

- **React 18** with TypeScript
- **Vite** for fast development and building
- **Chart.js** with react-chartjs-2 for data visualization
- **Modern CSS** with CSS custom properties and flexbox

## License

MIT License - feel free to use this project for your own data visualization needs!
