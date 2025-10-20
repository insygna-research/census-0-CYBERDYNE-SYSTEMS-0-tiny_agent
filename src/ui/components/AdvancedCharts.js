/**
 * Advanced Charts and Visualizations
 * Provides sophisticated data visualization for the enhanced agent interface
 */

class AdvancedCharts {
  constructor() {
    this.charts = new Map();
    this.themes = {
      default: {
        primary: '#3b82f6',
        secondary: '#8b5cf6',
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444',
        grid: '#e5e7eb',
        text: '#1f2937'
      },
      dark: {
        primary: '#60a5fa',
        secondary: '#a78bfa',
        success: '#34d399',
        warning: '#fbbf24',
        error: '#f87171',
        grid: '#374151',
        text: '#f3f4f6'
      }
    };

    this.currentTheme = 'default';
    this.init();
  }

  init() {
    this.setupChartDefaults();
    this.initializeCharts();
  }

  setupChartDefaults() {
    Chart.defaults.font.family = "'Inter', sans-serif";
    Chart.defaults.color = this.themes[this.currentTheme].text;
    Chart.defaults.borderColor = this.themes[this.currentTheme].grid;
  }

  initializeCharts() {
    // Initialize cognitive load chart
    this.createCognitiveLoadChart();

    // Initialize performance metrics chart
    this.createPerformanceChart();

    // Initialize learning progress chart
    this.createLearningChart();

    // Initialize memory usage chart
    this.createMemoryChart();

    // Initialize task completion chart
    this.createTaskCompletionChart();
  }

  createCognitiveLoadChart() {
    const ctx = document.getElementById('cognitive-chart');
    if (!ctx) return;

    const chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [{
          label: 'Cognitive Load',
          data: [],
          borderColor: this.themes[this.currentTheme].primary,
          backgroundColor: this.themes[this.currentTheme].primary + '20',
          borderWidth: 2,
          tension: 0.4,
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            mode: 'index',
            intersect: false,
            callbacks: {
              label: function(context) {
                return `Load: ${context.parsed.y}%`;
              }
            }
          }
        },
        scales: {
          x: {
            display: false
          },
          y: {
            beginAtZero: true,
            max: 100,
            ticks: {
              callback: function(value) {
                return value + '%';
              }
            }
          }
        }
      }
    });

    this.charts.set('cognitive', chart);

    // Start real-time updates
    this.startCognitiveLoadUpdates(chart);
  }

  createPerformanceChart() {
    const ctx = document.getElementById('performance-chart');
    if (!ctx) return;

    const chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Task Success Rate', 'Response Time', 'Memory Efficiency', 'Tool Usage', 'Error Recovery'],
        datasets: [{
          label: 'Performance Metrics',
          data: [85, 92, 78, 88, 94],
          backgroundColor: [
            this.themes[this.currentTheme].success,
            this.themes[this.currentTheme].primary,
            this.themes[this.currentTheme].warning,
            this.themes[this.currentTheme].secondary,
            this.themes[this.currentTheme].primary
          ],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                return `${context.label}: ${context.parsed.y}%`;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            max: 100
          }
        }
      }
    });

    this.charts.set('performance', chart);
  }

  createLearningChart() {
    const ctx = document.getElementById('learning-chart');
    if (!ctx) return;

    const chart = new Chart(ctx, {
      type: 'radar',
      data: {
        labels: ['Tool Optimization', 'Pattern Recognition', 'Adaptation Speed', 'Knowledge Retention', 'Error Prevention', 'Efficiency'],
        datasets: [{
          label: 'Current Performance',
          data: [75, 82, 68, 90, 85, 78],
          borderColor: this.themes[this.currentTheme].primary,
          backgroundColor: this.themes[this.currentTheme].primary + '20',
          borderWidth: 2,
          pointBackgroundColor: this.themes[this.currentTheme].primary,
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: this.themes[this.currentTheme].primary
        }, {
          label: 'Baseline',
          data: [50, 50, 50, 50, 50, 50],
          borderColor: this.themes[this.currentTheme].secondary,
          backgroundColor: this.themes[this.currentTheme].secondary + '20',
          borderWidth: 2,
          pointBackgroundColor: this.themes[this.currentTheme].secondary,
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: this.themes[this.currentTheme].secondary
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom'
          }
        },
        scales: {
          r: {
            beginAtZero: true,
            max: 100
          }
        }
      }
    });

    this.charts.set('learning', chart);
  }

  createMemoryChart() {
    const ctx = document.getElementById('memory-chart');
    if (!ctx) return;

    const chart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Semantic Memory', 'Episodic Memory', 'Working Memory', 'Compressed Memory', 'Free Space'],
        datasets: [{
          data: [25, 20, 15, 30, 10],
          backgroundColor: [
            this.themes[this.currentTheme].primary,
            this.themes[this.currentTheme].secondary,
            this.themes[this.currentTheme].success,
            this.themes[this.currentTheme].warning,
            this.themes[this.currentTheme].grid
          ],
          borderWidth: 2,
          borderColor: '#fff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right'
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const label = context.label || '';
                const value = context.parsed || 0;
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage = ((value / total) * 100).toFixed(1);
                return `${label}: ${percentage}% (${value}MB)`;
              }
            }
          }
        }
      }
    });

    this.charts.set('memory', chart);
  }

  createTaskCompletionChart() {
    const ctx = document.getElementById('task-chart');
    if (!ctx) return;

    const chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [{
          label: 'Completed Tasks',
          data: [],
          borderColor: this.themes[this.currentTheme].success,
          backgroundColor: this.themes[this.currentTheme].success + '20',
          borderWidth: 2,
          tension: 0.4,
          fill: true
        }, {
          label: 'Failed Tasks',
          data: [],
          borderColor: this.themes[this.currentTheme].error,
          backgroundColor: this.themes[this.currentTheme].error + '20',
          borderWidth: 2,
          tension: 0.4,
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'top'
          }
        },
        scales: {
          x: {
            display: true,
            grid: {
              display: false
            }
          },
          y: {
            beginAtZero: true,
            stacked: true
          }
        }
      }
    });

    this.charts.set('tasks', chart);

    // Start task completion updates
    this.startTaskCompletionUpdates(chart);
  }

  startCognitiveLoadUpdates(chart) {
    setInterval(() => {
      if (chart) {
        const now = new Date();
        const label = now.toLocaleTimeString();

        // Add new data point
        chart.data.labels.push(label);
        chart.data.datasets[0].data.push(Math.random() * 100);

        // Keep only last 20 points
        if (chart.data.labels.length > 20) {
          chart.data.labels.shift();
          chart.data.datasets[0].data.shift();
        }

        chart.update('none');
      }
    }, 2000);
  }

  startTaskCompletionUpdates(chart) {
    setInterval(() => {
      if (chart) {
        const now = new Date();
        const label = now.toLocaleTimeString();

        // Simulate task completion data
        const completed = Math.floor(Math.random() * 10);
        const failed = Math.floor(Math.random() * 3);

        chart.data.labels.push(label);
        chart.data.datasets[0].data.push(completed);
        chart.data.datasets[1].data.push(failed);

        // Keep only last 20 points
        if (chart.data.labels.length > 20) {
          chart.data.labels.shift();
          chart.data.datasets[0].data.shift();
          chart.data.datasets[1].data.shift();
        }

        chart.update('none');
      }
    }, 5000);
  }

  updateChart(chartName, data) {
    const chart = this.charts.get(chartName);
    if (chart) {
      if (data.labels) {
        chart.data.labels = data.labels;
      }
      if (data.datasets) {
        chart.data.datasets = data.datasets;
      }
      chart.update();
    }
  }

  updateChartData(chartName, datasetIndex, data) {
    const chart = this.charts.get(chartName);
    if (chart && chart.data.datasets[datasetIndex]) {
      chart.data.datasets[datasetIndex].data = data;
      chart.update();
    }
  }

  addDataPoint(chartName, label, value, datasetIndex = 0) {
    const chart = this.charts.get(chartName);
    if (chart) {
      chart.data.labels.push(label);
      chart.data.datasets[datasetIndex].data.push(value);

      // Keep only last 20 points for line charts
      if (chart.config.type === 'line' && chart.data.labels.length > 20) {
        chart.data.labels.shift();
        chart.data.datasets.forEach(dataset => {
          dataset.data.shift();
        });
      }

      chart.update();
    }
  }

  switchTheme(theme) {
    this.currentTheme = theme;
    const newTheme = this.themes[theme];

    Chart.defaults.color = newTheme.text;
    Chart.defaults.borderColor = newTheme.grid;

    // Update all charts with new theme
    this.charts.forEach((chart, name) => {
      chart.options.plugins.legend.labels.color = newTheme.text;
      chart.options.scales.x.ticks.color = newTheme.text;
      chart.options.scales.y.ticks.color = newTheme.text;

      if (chart.options.scales.x.grid) {
        chart.options.scales.x.grid.color = newTheme.grid;
      }
      if (chart.options.scales.y.grid) {
        chart.options.scales.y.grid.color = newTheme.grid;
      }

      // Update dataset colors
      chart.data.datasets.forEach((dataset, index) => {
        if (name === 'cognitive') {
          dataset.borderColor = newTheme.primary;
          dataset.backgroundColor = newTheme.primary + '20';
        } else if (name === 'performance') {
          dataset.backgroundColor = [
            newTheme.success,
            newTheme.primary,
            newTheme.warning,
            newTheme.secondary,
            newTheme.primary
          ];
        } else if (name === 'learning') {
          dataset[0].borderColor = newTheme.primary;
          dataset[0].backgroundColor = newTheme.primary + '20';
          dataset[0].pointBackgroundColor = newTheme.primary;
          dataset[1].borderColor = newTheme.secondary;
          dataset[1].backgroundColor = newTheme.secondary + '20';
          dataset[1].pointBackgroundColor = newTheme.secondary;
        } else if (name === 'memory') {
          dataset.backgroundColor = [
            newTheme.primary,
            newTheme.secondary,
            newTheme.success,
            newTheme.warning,
            newTheme.grid
          ];
        } else if (name === 'tasks') {
          dataset[0].borderColor = newTheme.success;
          dataset[0].backgroundColor = newTheme.success + '20';
          dataset[1].borderColor = newTheme.error;
          dataset[1].backgroundColor = newTheme.error + '20';
        }
      });

      chart.update();
    });
  }

  // Advanced visualization methods
  createHeatmap(containerId, data, options = {}) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const canvas = document.createElement('canvas');
    container.appendChild(canvas);

    // Create heatmap using canvas API
    const ctx = canvas.getContext('2d');
    const width = canvas.width = container.offsetWidth;
    const height = canvas.height = 200;

    const maxValue = Math.max(...data.map(row => Math.max(...row)));
    const cellWidth = width / data[0].length;
    const cellHeight = height / data.length;

    data.forEach((row, i) => {
      row.forEach((value, j) => {
        const intensity = value / maxValue;
        const hue = 240 - (intensity * 240); // Blue to red gradient

        ctx.fillStyle = `hsla(${hue}, 70%, 50%, ${intensity})`;
        ctx.fillRect(j * cellWidth, i * cellHeight, cellWidth - 1, cellHeight - 1);
      });
    });
  }

  createRealtimeGauge(containerId, value, max = 100) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 200;
    container.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = 80;

    this.drawGauge(ctx, centerX, centerY, radius, value, max);
  }

  drawGauge(ctx, centerX, centerY, radius, value, max) {
    // Clear canvas
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // Draw background arc
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, Math.PI, 2 * Math.PI);
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 20;
    ctx.stroke();

    // Draw value arc
    const angle = (value / max) * Math.PI;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, Math.PI, Math.PI + angle);
    ctx.strokeStyle = this.themes[this.currentTheme].primary;
    ctx.lineWidth = 20;
    ctx.stroke();

    // Draw center text
    ctx.fillStyle = this.themes[this.currentTheme].text;
    ctx.font = 'bold 24px Inter';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${Math.round((value / max) * 100)}%`, centerX, centerY);
  }

  updateGauge(containerId, value, max = 100) {
    const container = document.getElementById(containerId);
    const canvas = container?.querySelector('canvas');

    if (canvas) {
      const ctx = canvas.getContext('2d');
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const radius = 80;

      this.drawGauge(ctx, centerX, centerY, radius, value, max);
    }
  }

  // Performance monitoring
  createPerformanceMonitor(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const monitorHTML = `
      <div class="performance-monitor">
        <div class="monitor-header">
          <h3>Real-time Performance Monitor</h3>
          <div class="monitor-controls">
            <button class="btn btn-ghost" onclick="charts.pauseMonitoring()">Pause</button>
            <button class="btn btn-ghost" onclick="charts.resumeMonitoring()">Resume</button>
          </div>
        </div>
        <div class="monitor-metrics">
          <div class="metric-card">
            <div class="metric-header">
              <span class="metric-title">Response Time</span>
              <span class="metric-value" id="response-time">0ms</span>
            </div>
            <div class="metric-chart">
              <canvas id="response-time-chart"></canvas>
            </div>
          </div>
          <div class="metric-card">
            <div class="metric-header">
              <span class="metric-title">CPU Usage</span>
              <span class="metric-value" id="cpu-usage">0%</span>
            </div>
            <div class="metric-chart">
              <canvas id="cpu-usage-chart"></canvas>
            </div>
          </div>
          <div class="metric-card">
            <div class="metric-header">
              <span class="metric-title">Memory Usage</span>
              <span class="metric-value" id="memory-usage">0%</span>
            </div>
            <div class="metric-chart">
              <canvas id="memory-usage-chart"></canvas>
            </div>
          </div>
        </div>
      </div>
    `;

    container.innerHTML = monitorHTML;
    this.initializePerformanceCharts();
  }

  initializePerformanceCharts() {
    // Response time chart
    this.createResponseTimeChart();

    // CPU usage chart
    this.createCPUUsageChart();

    // Memory usage chart
    this.createMemoryUsageChart();
  }

  createResponseTimeChart() {
    const ctx = document.getElementById('response-time-chart');
    if (!ctx) return;

    const chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [{
          label: 'Response Time (ms)',
          data: [],
          borderColor: this.themes[this.currentTheme].success,
          backgroundColor: this.themes[this.currentTheme].success + '20',
          borderWidth: 2,
          tension: 0.4,
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          }
        },
        scales: {
          x: {
            display: false
          },
          y: {
            beginAtZero: true
          }
        }
      }
    });

    this.charts.set('response-time', chart);
    this.startPerformanceUpdates(chart, 'response-time', 50, 2000);
  }

  createCPUUsageChart() {
    const ctx = document.getElementById('cpu-usage-chart');
    if (!ctx) return;

    const chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [{
          label: 'CPU Usage (%)',
          data: [],
          borderColor: this.themes[this.currentTheme].warning,
          backgroundColor: this.themes[this.currentTheme].warning + '20',
          borderWidth: 2,
          tension: 0.4,
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          }
        },
        scales: {
          x: {
            display: false
          },
          y: {
            beginAtZero: true,
            max: 100
          }
        }
      }
    });

    this.charts.set('cpu-usage', chart);
    this.startPerformanceUpdates(chart, 'cpu-usage', 0, 100);
  }

  createMemoryUsageChart() {
    const ctx = document.getElementById('memory-usage-chart');
    if (!ctx) return;

    const chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [{
          label: 'Memory Usage (%)',
          data: [],
          borderColor: this.themes[this.currentTheme].primary,
          backgroundColor: this.themes[this.currentTheme].primary + '20',
          borderWidth: 2,
          tension: 0.4,
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          }
        },
        scales: {
          x: {
            display: false
          },
          y: {
            beginAtZero: true,
            max: 100
          }
        }
      }
    });

    this.charts.set('memory-usage', chart);
    this.startPerformanceUpdates(chart, 'memory-usage', 30, 100);
  }

  startPerformanceUpdates(chart, metricName, baseValue, variance) {
    let isPaused = false;

    const updateInterval = setInterval(() => {
      if (isPaused) return;

      const now = new Date();
      const label = now.toLocaleTimeString();
      const value = baseValue + (Math.random() - 0.5) * variance;

      chart.data.labels.push(label);
      chart.data.datasets[0].data.push(value);

      // Keep only last 20 points
      if (chart.data.labels.length > 20) {
        chart.data.labels.shift();
        chart.data.datasets[0].data.shift();
      }

      chart.update('none');

      // Update metric value display
      const valueElement = document.getElementById(metricName.replace('-', ''));
      if (valueElement) {
        const suffix = metricName.includes('time') ? 'ms' : '%';
        valueElement.textContent = `${Math.round(value)}${suffix}`;
      }
    }, 1000);

    // Store interval reference for pausing
    chart.updateInterval = updateInterval;

    // Expose pause/resume methods
    chart.pause = () => { isPaused = true; };
    chart.resume = () => { isPaused = false; };
  }

  pauseMonitoring() {
    this.charts.forEach(chart => {
      if (chart.pause) {
        chart.pause();
      }
    });
  }

  resumeMonitoring() {
    this.charts.forEach(chart => {
      if (chart.resume) {
        chart.resume();
      }
    });
  }

  // Export functionality
  exportChart(chartName, format = 'png') {
    const chart = this.charts.get(chartName);
    if (!chart) return;

    const url = chart.toBase64Image(format);
    const link = document.createElement('a');
    link.download = `${chartName}.${format}`;
    link.href = url;
    link.click();
  }

  // Get chart statistics
  getChartStats(chartName) {
    const chart = this.charts.get(chartName);
    if (!chart) return null;

    const data = chart.data.datasets[0].data;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const avg = data.reduce((a, b) => a + b) / data.length;

    return {
      min,
      max,
      avg,
      count: data.length,
      latest: data[data.length - 1]
    };
  }
}

// Initialize charts when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.charts = new AdvancedCharts();
});