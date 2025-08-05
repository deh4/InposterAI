/**
 * InposterAI Dashboard Client
 * Handles data fetching, chart rendering, and real-time updates
 */

class DashboardClient {
  constructor() {
    this.baseUrl = window.location.origin;
    this.ws = null;
    this.charts = {};
    this.refreshInterval = null;
    
    this.init();
  }

  async init() {
    console.log('🚀 Initializing InposterAI Dashboard...');
    
    this.setupEventListeners();
    this.connectWebSocket();
    await this.loadInitialData();
    this.startPeriodicRefresh();
    
    console.log('✅ Dashboard initialized successfully');
  }

  setupEventListeners() {
    // Timeframe changes
    document.getElementById('trendsTimeframe').addEventListener('change', (e) => {
      this.loadTrends(e.target.value);
    });

    // View type changes
    document.getElementById('contentViewType').addEventListener('change', (e) => {
      this.loadContentInsights(e.target.value);
    });

    // Button actions
    document.getElementById('refreshModels').addEventListener('click', () => {
      this.loadModelPerformance();
    });

    document.getElementById('exportData').addEventListener('click', () => {
      this.exportData();
    });

    document.getElementById('openExtension').addEventListener('click', () => {
      // Try to open extension settings (browser-specific)
      alert('Please click the InposterAI extension icon in your browser toolbar to access settings');
    });

    document.getElementById('viewDocs').addEventListener('click', () => {
      window.open('https://github.com/yourusername/ai-content-detector-extension/wiki', '_blank');
    });

    document.getElementById('reportIssue').addEventListener('click', () => {
      window.open('https://github.com/yourusername/ai-content-detector-extension/issues', '_blank');
    });
  }

  connectWebSocket() {
    const wsUrl = `ws://${window.location.host}`;
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log('🔌 WebSocket connected');
      this.updateConnectionStatus('connected', 'Real-time updates active');
    };

    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      this.handleWebSocketMessage(message);
    };

    this.ws.onclose = () => {
      console.log('🔌 WebSocket disconnected');
      this.updateConnectionStatus('error', 'Connection lost');
      
      // Attempt to reconnect after 5 seconds
      setTimeout(() => {
        this.connectWebSocket();
      }, 5000);
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.updateConnectionStatus('error', 'Connection error');
    };
  }

  handleWebSocketMessage(message) {
    switch (message.type) {
      case 'connected':
        console.log('📡 Real-time updates enabled');
        break;
      
      case 'analysis':
        this.showNotification('📊 New analysis recorded');
        this.refreshOverview();
        this.refreshCharts();
        break;
      
      case 'feedback':
        this.showNotification('👍 New feedback received');
        this.refreshOverview();
        this.loadAccuracyMetrics();
        break;
      
      default:
        console.log('📨 Unknown message type:', message.type);
    }
  }

  async loadInitialData() {
    try {
      console.log('🔄 Loading initial dashboard data...');
      await Promise.all([
        this.loadOverview(),
        this.loadTrends('7d'),
        this.loadModelPerformance(),
        this.loadAccuracyMetrics(),
        this.loadContentInsights('length'),
        this.loadRecentAnalyses()
      ]);
      console.log('✅ All initial data loaded successfully');
    } catch (error) {
      console.error('❌ Failed to load initial data:', error);
      this.updateConnectionStatus('error', 'Failed to load data');
    }
  }

  async loadOverview() {
    try {
      const response = await fetch(`${this.baseUrl}/api/analytics/overview`);
      const data = await response.json();
      
      this.updateOverviewCards(data);
      this.updateLastUpdated();
    } catch (error) {
      console.error('Failed to load overview:', error);
    }
  }

  async loadTrends(period = '7d') {
    try {
      const response = await fetch(`${this.baseUrl}/api/analytics/trends?period=${period}`);
      const data = await response.json();
      
      this.renderTrendsChart(data);
    } catch (error) {
      console.error('Failed to load trends:', error);
    }
  }

  async loadModelPerformance() {
    try {
      const response = await fetch(`${this.baseUrl}/api/analytics/models`);
      const data = await response.json();
      
      this.renderModelsChart(data);
    } catch (error) {
      console.error('Failed to load model performance:', error);
    }
  }

  async loadAccuracyMetrics() {
    try {
      const response = await fetch(`${this.baseUrl}/api/analytics/accuracy`);
      const data = await response.json();
      
      this.renderAccuracyChart(data);
    } catch (error) {
      console.error('Failed to load accuracy metrics:', error);
    }
  }

  async loadContentInsights(viewType = 'length') {
    try {
      const response = await fetch(`${this.baseUrl}/api/analytics/content`);
      const data = await response.json();
      
      this.renderContentChart(data, viewType);
    } catch (error) {
      console.error('Failed to load content insights:', error);
    }
  }

  async loadRecentAnalyses() {
    try {
      // For now, we'll simulate recent analyses since we don't have a specific endpoint
      const recentContainer = document.getElementById('recentAnalyses');
      recentContainer.innerHTML = '<div class="loading-state">Loading recent analyses...</div>';
      
      // In a real implementation, you'd fetch from /api/analytics/recent
      setTimeout(() => {
        recentContainer.innerHTML = `
          <div class="analysis-item">
            <div class="analysis-info">
              <a href="#" class="analysis-url">example.com/article-1</a>
              <div class="analysis-meta">2 minutes ago • Blog post • 1,250 words</div>
            </div>
            <div class="analysis-result">
              <div class="likelihood-score low">23%</div>
              <div class="confidence-score">89% confidence</div>
            </div>
          </div>
          <div class="analysis-item">
            <div class="analysis-info">
              <a href="#" class="analysis-url">medium.com/tech-article</a>
              <div class="analysis-meta">15 minutes ago • Technical • 2,100 words</div>
            </div>
            <div class="analysis-result">
              <div class="likelihood-score high">87%</div>
              <div class="confidence-score">72% confidence</div>
            </div>
          </div>
          <div class="analysis-item">
            <div class="analysis-info">
              <a href="#" class="analysis-url">reddit.com/r/programming</a>
              <div class="analysis-meta">1 hour ago • Social • 450 words</div>
            </div>
            <div class="analysis-result">
              <div class="likelihood-score medium">45%</div>
              <div class="confidence-score">63% confidence</div>
            </div>
          </div>
        `;
      }, 1000);
    } catch (error) {
      console.error('Failed to load recent analyses:', error);
    }
  }

  updateOverviewCards(data) {
    document.getElementById('totalAnalyses').textContent = data.totalAnalyses || '--';
    document.getElementById('todayAnalyses').textContent = data.todayAnalyses || '--';
    document.getElementById('aiDetectionRate').textContent = `${data.aiDetectionRate || '--'}%`;
    document.getElementById('humanDetectionRate').textContent = `${data.humanDetectionRate || '--'}%`;
    document.getElementById('averageConfidence').textContent = `${data.averageConfidence || '--'}%`;
    document.getElementById('averageLikelihood').textContent = `${data.averageLikelihood || '--'}%`;
    document.getElementById('feedbackRate').textContent = `${data.feedbackRate || '--'}%`;
    document.getElementById('positiveFeedback').textContent = `${data.positiveFeedback || '--'}%`;
  }

  renderTrendsChart(data) {
    try {
      console.log('📈 Rendering trends chart with data:', data);
      const ctx = document.getElementById('trendsChart').getContext('2d');
      
      if (this.charts.trends) {
        this.charts.trends.destroy();
      }

      const chartData = data.data || [];
      const labels = chartData.map(d => this.formatDate(d.date));
      const counts = chartData.map(d => d.count || 0);
      const avgLikelihood = chartData.map(d => d.avg_likelihood || 0);

      this.charts.trends = new Chart(ctx, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [
            {
              label: 'Analyses Count',
              data: counts,
              borderColor: '#2563eb',
              backgroundColor: 'rgba(37, 99, 235, 0.1)',
              tension: 0.4,
              yAxisID: 'y'
            },
            {
              label: 'Avg AI Likelihood',
              data: avgLikelihood,
              borderColor: '#dc2626',
              backgroundColor: 'rgba(220, 38, 38, 0.1)',
              tension: 0.4,
              yAxisID: 'y1'
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: {
            mode: 'index',
            intersect: false,
          },
          scales: {
            x: {
              display: true,
              title: {
                display: true,
                text: 'Date'
              }
            },
            y: {
              type: 'linear',
              display: true,
              position: 'left',
              title: {
                display: true,
                text: 'Number of Analyses'
              }
            },
            y1: {
              type: 'linear',
              display: true,
              position: 'right',
              title: {
                display: true,
                text: 'AI Likelihood (%)'
              },
              grid: {
                drawOnChartArea: false,
              },
            }
          },
          plugins: {
            legend: {
              position: 'top',
            }
          }
        }
      });
      console.log('✅ Trends chart rendered successfully');
    } catch (error) {
      console.error('❌ Failed to render trends chart:', error);
    }
  }

  renderModelsChart(data) {
    try {
      console.log('⚡ Rendering models chart with data:', data);
      const ctx = document.getElementById('modelsChart').getContext('2d');
      
      if (this.charts.models) {
        this.charts.models.destroy();
      }

      // Use the correct data structure from the API
      const models = data.modelStats || [];
      const labels = models.map(m => m.model_name);
      const usageCounts = models.map(m => m.total_analyses);
      const responseTimes = models.map(m => Math.round(m.avg_response_time || 0));

      this.charts.models = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [
            {
              label: 'Usage Count',
              data: usageCounts,
              backgroundColor: '#059669',
              yAxisID: 'y'
            },
            {
              label: 'Avg Response Time (ms)',
              data: responseTimes,
              backgroundColor: '#d97706',
              yAxisID: 'y1'
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              type: 'linear',
              display: true,
              position: 'left',
              title: {
                display: true,
                text: 'Usage Count'
              }
            },
            y1: {
              type: 'linear',
              display: true,
              position: 'right',
              title: {
                display: true,
                text: 'Response Time (ms)'
              },
              grid: {
                drawOnChartArea: false,
              },
            }
          },
          plugins: {
            legend: {
              position: 'top',
            }
          }
        }
      });
      console.log('✅ Models chart rendered successfully');
    } catch (error) {
      console.error('❌ Failed to render models chart:', error);
    }
  }

  renderAccuracyChart(data) {
    const ctx = document.getElementById('accuracyChart').getContext('2d');
    
    if (this.charts.accuracy) {
      this.charts.accuracy.destroy();
    }

    const calibration = data.calibration || [];
    const labels = calibration.map(c => c.confidence_bucket);
    const counts = calibration.map(c => c.count);
    const accuracy = calibration.map(c => 
      c.count > 0 ? (c.correct_predictions / c.count) * 100 : 0
    );

    this.charts.accuracy = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Sample Count',
            data: counts,
            backgroundColor: '#64748b',
            yAxisID: 'y'
          },
          {
            label: 'Actual Accuracy (%)',
            data: accuracy,
            backgroundColor: '#2563eb',
            yAxisID: 'y1'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            title: {
              display: true,
              text: 'Sample Count'
            }
          },
          y1: {
            type: 'linear',
            display: true,
            position: 'right',
            title: {
              display: true,
              text: 'Accuracy (%)'
            },
            min: 0,
            max: 100,
            grid: {
              drawOnChartArea: false,
            },
          }
        },
        plugins: {
          legend: {
            position: 'top',
          }
        }
      }
    });
  }

  renderContentChart(data, viewType) {
    const ctx = document.getElementById('contentChart').getContext('2d');
    
    if (this.charts.content) {
      this.charts.content.destroy();
    }

    let chartData, labels, values;

    if (viewType === 'length') {
      chartData = data.contentLength || [];
      labels = chartData.map(d => d.content_category);
      values = chartData.map(d => d.count);
    } else {
      chartData = data.domains || [];
      labels = chartData.map(d => d.domain_category);
      values = chartData.map(d => d.count);
    }

    const colors = [
      '#2563eb', '#059669', '#d97706', '#dc2626', 
      '#7c3aed', '#0891b2', '#ea580c', '#be185d'
    ];

    this.charts.content = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: values,
          backgroundColor: colors.slice(0, labels.length),
          borderWidth: 2,
          borderColor: '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
          }
        }
      }
    });
  }

  async exportData() {
    try {
      const response = await fetch(`${this.baseUrl}/api/analytics/export?format=json`);
      const data = await response.text();
      
      const blob = new Blob([data], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `inposter-ai-analytics-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      this.showNotification('📥 Analytics data exported successfully');
    } catch (error) {
      console.error('Export failed:', error);
      this.showNotification('❌ Export failed');
    }
  }

  updateConnectionStatus(status, message) {
    const indicator = document.querySelector('.connection-status .status-indicator');
    const text = document.querySelector('.connection-status .status-text');
    
    indicator.className = `status-indicator ${status}`;
    text.textContent = message;
  }

  updateLastUpdated() {
    const element = document.getElementById('lastUpdated');
    element.textContent = `Last updated: ${new Date().toLocaleTimeString()}`;
  }

  showNotification(message) {
    const notification = document.getElementById('notification');
    const text = notification.querySelector('.notification-text');
    
    text.textContent = message;
    notification.classList.remove('hidden');
    
    setTimeout(() => {
      notification.classList.add('hidden');
    }, 3000);
  }

  formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  async refreshOverview() {
    await this.loadOverview();
  }

  async refreshCharts() {
    const currentTimeframe = document.getElementById('trendsTimeframe').value;
    const currentViewType = document.getElementById('contentViewType').value;
    
    await Promise.all([
      this.loadTrends(currentTimeframe),
      this.loadModelPerformance(),
      this.loadContentInsights(currentViewType)
    ]);
  }

  startPeriodicRefresh() {
    // Refresh overview every 30 seconds
    this.refreshInterval = setInterval(() => {
      this.refreshOverview();
    }, 30000);
  }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new DashboardClient();
}); 