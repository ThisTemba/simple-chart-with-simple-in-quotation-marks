import { useState, useRef } from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import type { ChartData, ChartDataset, TooltipItem } from "chart.js";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import "./App.css";

// Enable dayjs plugins for better parsing
dayjs.extend(customParseFormat);

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface DataPoint {
  date: string;
  value: number;
}

interface Dataset {
  label: string;
  data: DataPoint[];
  borderColor: string;
  backgroundColor: string;
  valueColumnName: string;
}

interface NormalizedDataset extends ChartDataset<"line", (number | null)[]> {
  originalData: (number | null)[];
}

function App() {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [chartData, setChartData] = useState<
    ChartData<"line", (number | null)[], string>
  >({
    labels: [],
    datasets: [],
  });
  const [errorMessage, setErrorMessage] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const colors = [
    "#FF6384",
    "#36A2EB",
    "#FFCE56",
    "#4BC0C0",
    "#9966FF",
    "#FF9F40",
    "#FF6384",
    "#C9CBCF",
  ];

  const parseCSV = (
    csvText: string
  ): { data: DataPoint[]; valueColumnName: string; error?: string } => {
    const lines = csvText.trim().split("\n");
    const data: DataPoint[] = [];
    let valueColumnName = "Value"; // default fallback

    if (lines.length < 2) {
      return {
        data: [],
        valueColumnName,
        error: "CSV file must have at least 2 lines (header + data)",
      };
    }

    if (lines.length > 0) {
      const headers = lines[0].split(",").map((h) => h.trim());

      // Check if this looks like a simple Date,Value format
      if (headers.length < 2) {
        return {
          data: [],
          valueColumnName,
          error: "CSV must have at least 2 columns (Date and Value)",
        };
      }

      // Check if first column looks like a date column
      const firstCol = headers[0].toLowerCase();
      if (!firstCol.includes("date") && !firstCol.includes("time")) {
        return {
          data: [],
          valueColumnName,
          error: "First column should be a date column (e.g., 'Date', 'Time')",
        };
      }

      if (headers.length >= 2) {
        valueColumnName = headers[1];
      }
    }

    const parseDate = (dateString: string): Date | null => {
      const trimmedDate = dateString.trim();

      try {
        // Let dayjs automatically parse the date
        const parsed = dayjs(trimmedDate);

        // Check if the parsed date is valid
        if (parsed.isValid()) {
          return parsed.toDate();
        }
      } catch (error) {
        console.error(`Error parsing date "${trimmedDate}":`, error);
      }

      return null;
    };

    let validRows = 0;
    let totalRows = 0;

    for (let i = 1; i < lines.length; i++) {
      totalRows++;
      const columns = lines[i].split(",");
      if (columns.length >= 2) {
        const dateString = columns[0].trim();
        const valueString = columns[1].trim().replace(/\r$/, ""); // Remove trailing carriage return
        const value = parseFloat(valueString);

        if (!isNaN(value) && dateString) {
          const parsedDate = parseDate(dateString);
          if (parsedDate) {
            // Normalize date to ISO format for consistency
            const normalizedDate = dayjs(parsedDate).format("YYYY-MM-DD");
            data.push({ date: normalizedDate, value });
            validRows++;
          }
        }
      }
    }

    // Check if we got any valid data
    if (validRows === 0) {
      return {
        data: [],
        valueColumnName,
        error: `No valid data found. Expected format: Date,Value. Found ${totalRows} rows but none could be parsed.`,
      };
    }

    if (validRows < totalRows * 0.5) {
      return {
        data: [],
        valueColumnName,
        error: `Only ${validRows} out of ${totalRows} rows could be parsed. Please check your CSV format.`,
      };
    }

    return {
      data: data.sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      ),
      valueColumnName,
    };
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    // Process all selected files
    Array.from(files).forEach((file, fileIndex) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const csvText = e.target?.result as string;
        const { data, valueColumnName, error } = parseCSV(csvText);

        if (error) {
          setErrorMessage(`Error in ${file.name}: ${error}`);
          return;
        }

        if (data.length > 0) {
          const fileName = file.name.replace(".csv", "");
          const colorIndex = (datasets.length + fileIndex) % colors.length;

          const newDataset: Dataset = {
            label: fileName,
            data,
            borderColor: colors[colorIndex],
            backgroundColor: colors[colorIndex] + "20",
            valueColumnName,
          };

          setDatasets((prevDatasets) => {
            const updatedDatasets = [...prevDatasets, newDataset];

            // Update chart data
            const allDates = new Set<string>();
            updatedDatasets.forEach((dataset) => {
              dataset.data.forEach((point) => allDates.add(point.date));
            });

            // Create continuous date range
            const dateArray = Array.from(allDates);
            const sortedDates = dateArray.sort(
              (a, b) => new Date(a).getTime() - new Date(b).getTime()
            );

            if (sortedDates.length > 0) {
              const startDate = new Date(sortedDates[0]);
              const endDate = new Date(sortedDates[sortedDates.length - 1]);

              // Generate all dates in the range
              const continuousDates: string[] = [];
              const currentDate = new Date(startDate);

              while (currentDate <= endDate) {
                continuousDates.push(currentDate.toISOString().split("T")[0]);
                currentDate.setDate(currentDate.getDate() + 1);
              }

              // Use continuous dates for the chart
              const chartLabels = continuousDates.map((date) =>
                dayjs(date).format("MMM DD")
              );

              const chartDatasets: NormalizedDataset[] = updatedDatasets.map(
                (dataset) => {
                  // Build arrays aligned with continuousDates (not chartLabels!)
                  const originalValues = continuousDates.map((date) => {
                    const point = dataset.data.find((p) => p.date === date);
                    return point ? point.value : null;
                  });

                  // Compute min and max ignoring nulls
                  const validVals = originalValues.filter(
                    (v): v is number => v !== null
                  );
                  const minVal = Math.min(...validVals);
                  const maxVal = Math.max(...validVals);

                  const normalizedValues = originalValues.map((val) => {
                    if (val === null) return null;
                    if (maxVal === minVal) return 0; // avoid divide by zero when all values are the same
                    return (val - minVal) / (maxVal - minVal); // scale from 0 to 1, stretching the full range
                  });

                  return {
                    label: dataset.valueColumnName,
                    data: normalizedValues,
                    borderColor: dataset.borderColor,
                    backgroundColor: dataset.backgroundColor,
                    tension: 0.1,
                    fill: false,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    originalData: originalValues,
                  };
                }
              );

              setChartData({
                labels: chartLabels,
                datasets: chartDatasets,
              });
            }

            return updatedDatasets;
          });

          // Clear any previous errors on successful upload
          setErrorMessage("");
        }
      };
      reader.readAsText(file);
    });
  };

  const clearAllData = () => {
    setDatasets([]);
    setChartData({
      labels: [],
      datasets: [],
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: "top" as const,
        labels: {
          usePointStyle: true,
          pointStyle: "line",
        },
      },
      title: {
        display: true,
        text: "CSV Data Chart",
      },
      tooltip: {
        callbacks: {
          label: (context: TooltipItem<"line">) => {
            const datasetWithOrig =
              context.dataset as unknown as NormalizedDataset;
            const original = datasetWithOrig.originalData?.[context.dataIndex];
            const label = context.dataset.label || "";
            if (original === null || original === undefined) {
              return `${label}: N/A`;
            }
            return `${label}: ${original}`;
          },
        },
      },
    },
    scales: {
      y: {
        display: false,
      },
    },
    elements: {
      line: {
        spanGaps: true,
      },
    },
  };

  return (
    <div className="app-container">
      <div className="app-header">
        <h1 className="app-title">"Simple" Chart</h1>
        <p className="app-subtitle">
          Upload CSV files to visualize correlations
        </p>
      </div>

      <div className="upload-section">
        <div className="upload-controls">
          <div className="file-input-wrapper">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="file-input-hidden"
              aria-label="Upload CSV file"
              title="Upload CSV file"
              multiple
              id="fileInput"
            />
            <label htmlFor="fileInput" className="file-button">
              Choose CSV Files
            </label>
          </div>
          <button onClick={clearAllData} className="clear-button">
            Clear All
          </button>
        </div>

        {errorMessage && (
          <div className="error-message">
            <p>⚠️ {errorMessage}</p>
            <p className="error-help">
              Expected format: Date,Value
              <br />
              Example: 2024-01-01,85
            </p>
          </div>
        )}
      </div>

      {datasets.length > 0 && (
        <div className="files-list">
          <h3 className="files-title">Uploaded Files</h3>
          <ul>
            {datasets.map((dataset, index) => (
              <li key={index} style={{ borderLeftColor: dataset.borderColor }}>
                {dataset.label} ({dataset.data.length} points)
              </li>
            ))}
          </ul>
        </div>
      )}

      {chartData.datasets.length > 0 && (
        <div className="chart-container">
          <Line data={chartData} options={options} />
        </div>
      )}

      {datasets.length > 0 && (
        <div className="data-tables">
          <h3 className="data-tables-title">Raw Data</h3>
          {datasets.map((dataset, index) => (
            <div key={index} className="data-table-container">
              <h4 className="table-title">{dataset.label}</h4>
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>{dataset.valueColumnName}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dataset.data.map((point, pointIndex) => (
                      <tr key={pointIndex}>
                        <td>{dayjs(point.date).format("MMM DD, YYYY")}</td>
                        <td>{point.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {datasets.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">📊</div>
          <p>Upload a CSV file to see your data plotted on the chart.</p>
          <p>Expected format: Date,Value (first row should be headers)</p>
        </div>
      )}
    </div>
  );
}

export default App;
