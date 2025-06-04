
'use client';

import React, { useEffect, useRef } from 'react';
import Highcharts from 'highcharts';
// If you need specific modules, import them here, e.g.:
// import AccessibilityModule from 'highcharts/modules/accessibility';
// AccessibilityModule(Highcharts);

interface ChartDataItem {
  name: string; // maps to 'label' from user's data structure
  value: number;
  fill?: string; // from original testDistributionData, not directly used by Highcharts color logic here
}

interface HighchartsPieProps {
  data: ChartDataItem[];
  chartWidth?: number;
  chartHeight?: number;
}

const HighchartsPieChart: React.FC<HighchartsPieProps> = ({
  data,
  chartWidth = 280, // Adjusted for typical card content areas
  chartHeight = 280, // Adjusted
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<Highcharts.Chart | null>(null);

  useEffect(() => {
    if (chartContainerRef.current && data && data.length > 0) {
      const total = data.reduce((sum, d) => sum + d.value, 0);
      if (total === 0) {
          if (chartInstanceRef.current) {
            chartInstanceRef.current.destroy();
            chartInstanceRef.current = null;
          }
           chartContainerRef.current.innerHTML = '<div class="text-center text-muted-foreground p-4">No data for Test Distribution chart.</div>';
          return;
      }

      const passedEntry = data.find((d) => d.name === "Passed");
      const passedPercentage = Math.round(
        ((passedEntry ? passedEntry.value : 0) / total) * 100
      );

      const seriesData = [
        {
          name: "Tests",
          type: 'pie', // Explicitly set chart type for series
          data: data
            .filter((d) => d.value > 0)
            .map((d) => {
              let color;
              switch (d.name) { // Use d.name (which maps to label)
                case "Passed":
                  color = "var(--success-color)";
                  break;
                case "Failed":
                  color = "var(--danger-color)";
                  break;
                case "Skipped":
                  color = "var(--warning-color)";
                  break;
                case "Timed Out": // Assuming 'Timed Out' is like 'Failed'
                  color = "var(--danger-color)";
                  break;  
                case "Pending":
                  color = "var(--primary-color)"; // Or a specific pending color
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

      const chartOptions: Highcharts.Options = {
        chart: {
          type: 'pie',
          width: chartWidth,
          height: chartHeight - 40, 
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
          backgroundColor: 'rgba(10,10,10,0.92)', // Kept as per user's spec, override with CSS if needed
          borderColor: 'rgba(10,10,10,0.92)',   // Kept as per user's spec
          style: { color: '#f5f5f5' }           // Kept as per user's spec
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
        series: seriesData as Highcharts.SeriesOptionsType[], // Cast to satisfy Highcharts types
        credits: { enabled: false }
      };
      
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
      }
      chartInstanceRef.current = Highcharts.chart(chartContainerRef.current, chartOptions);
    } else if (chartContainerRef.current) {
        chartContainerRef.current.innerHTML = '<div class="text-center text-muted-foreground p-4">No data available for chart.</div>';
    }

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
    };
  }, [data, chartWidth, chartHeight]);

  return (
    <div ref={chartContainerRef} style={{ width: `${chartWidth}px`, height: `${chartHeight -40}px`, margin: '0 auto' }} />
  );
};

export default HighchartsPieChart;
