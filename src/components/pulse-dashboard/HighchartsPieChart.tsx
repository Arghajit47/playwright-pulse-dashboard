
'use client';

import React, { useEffect, useRef } from 'react';
import Highcharts from 'highcharts';
// If you need specific modules, import them here, e.g.:
// import AccessibilityModule from 'highcharts/modules/accessibility';
// AccessibilityModule(Highcharts);

interface ChartDataItem {
  name: string;
  value: number;
  fill?: string; 
}

interface HighchartsPieProps {
  data: ChartDataItem[];
  chartWidth?: number;
  chartHeight?: number;
}

const HighchartsPieChart: React.FC<HighchartsPieProps> = ({
  data,
  chartWidth = 280,
  chartHeight = 280,
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<Highcharts.Chart | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const total = data.reduce((sum, d) => sum + d.value, 0);
    const shouldDisplayChart = data.length > 0 && total > 0;

    if (!shouldDisplayChart) {
      // If chart exists, destroy it before showing "no data" message
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
      const message = data.length === 0 ? "No data available for chart." : "No data for Test Distribution chart.";
      chartContainerRef.current.innerHTML = `<div class="text-center text-muted-foreground p-4">${message}</div>`;
      return; 
    }

    // If we are going to display a chart, ensure any "no data" message is cleared
    if (chartContainerRef.current.firstChild && chartContainerRef.current.firstChild.textContent?.includes("No data")) {
        chartContainerRef.current.innerHTML = '';
    }
    
    const passedEntry = data.find((d) => d.name === "Passed");
    const passedPercentage = Math.round(
      ((passedEntry ? passedEntry.value : 0) / total) * 100
    );

    const seriesData = [
      {
        name: "Tests",
        type: 'pie' as const,
        data: data
          .filter((d) => d.value > 0)
          .map((d) => {
            let color;
            switch (d.name) {
              case "Passed":
                color = "var(--success-color)";
                break;
              case "Failed":
                color = "var(--danger-color)";
                break;
              case "Skipped":
                color = "var(--warning-color)";
                break;
              case "Timed Out":
                color = "var(--danger-color)";
                break;  
              case "Pending":
                color = "var(--primary-color)";
                break;
              default:
                color = "#CCCCCC"; 
            }
            return { name: d.name, y: d.value, color: color };
          }),
        size: "100%",
        innerSize: "55%",
        dataLabels: { enabled: false },
        showInLegend: true,
      },
    ];

    const centerTitleFontSize = Math.max(12, Math.min(chartWidth, chartHeight) / 12) + "px";
    const centerSubtitleFontSize = Math.max(10, Math.min(chartWidth, chartHeight) / 18) + "px";
    const numericChartHeight = chartHeight - 40; 

    const chartOptions: Highcharts.Options = {
      chart: {
        type: 'pie',
        width: chartWidth,
        height: numericChartHeight, 
        backgroundColor: 'transparent',
        plotShadow: false,
        spacingBottom: 40 
      },
      title: {
        text: `${passedPercentage}%`,
        align: 'center',
        verticalAlign: 'middle',
        y: 5,
        style: { fontSize: centerTitleFontSize, fontWeight: 'bold', color: 'var(--primary-color)' }
      },
      subtitle: {
        text: 'Passed',
        align: 'center',
        verticalAlign: 'middle',
        y: 25,
        style: { fontSize: centerSubtitleFontSize, color: 'var(--text-color-secondary)' }
      },
      tooltip: {
        pointFormat: '{series.name}: <b>{point.percentage:.1f}%</b> ({point.y})',
        backgroundColor: 'rgba(10,10,10,0.92)',
        borderColor: 'rgba(10,10,10,0.92)',
        style: { color: '#f5f5f5' }
      },
      legend: {
        layout: 'horizontal',
        align: 'center',
        verticalAlign: 'bottom',
        itemStyle: { color: 'var(--text-color)', fontWeight: 'normal', fontSize: '12px' }
      },
      plotOptions: {
        pie: {
          allowPointSelect: true,
          cursor: 'pointer',
          borderWidth: 3,
          borderColor: 'var(--card-background-color)', 
          states: {
            hover: {
              // Default Highcharts halo
            }
          }
        }
      },
      series: seriesData as Highcharts.SeriesOptionsType[],
      credits: { enabled: false }
    };
    
    if (chartInstanceRef.current) {
      // Chart exists, update it
      chartInstanceRef.current.update(chartOptions, true, true); // true for redraw, true for oneToOne
    } else {
      // Chart doesn't exist, create it
      try {
        chartInstanceRef.current = Highcharts.chart(chartContainerRef.current, chartOptions);
      } catch (e) {
        console.error("Highcharts rendering error:", e);
        if (chartContainerRef.current) {
          chartContainerRef.current.innerHTML = '<div class="text-center text-muted-foreground p-4">Error rendering chart. Check console.</div>';
        }
      }
    }

    // Cleanup function for when the component unmounts or dependencies change causing a re-render
    // This was the original cleanup. It should be fine as useEffect will run this before the next effect execution.
    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
    };
  }, [data, chartWidth, chartHeight]); // Dependencies for re-rendering

  // The container div style ensures it has dimensions for Highcharts to render into.
  return (
    <div ref={chartContainerRef} style={{ width: `${chartWidth}px`, height: `${chartHeight - 40}px`, margin: '0 auto' }} />
  );
};

export default HighchartsPieChart;
