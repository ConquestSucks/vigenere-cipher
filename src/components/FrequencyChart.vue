<template>
  <Bar :data="chartData" :options="chartOptions" />
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue';
import { Bar } from 'vue-chartjs';
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale,
  ChartData,
  ChartOptions,
} from 'chart.js';

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale);

export default defineComponent({
  name: 'FrequencyChart',
  components: {
    Bar,
  },
  props: {
    chartData: {
      type: Object as PropType<ChartData<'bar', (number | null)[], string>>,
      required: true,
    },
    chartOptions: {
      type: Object as PropType<ChartOptions<'bar'>>,
      default: () => ({
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function (value) {
                return (Number(value) * 100).toFixed(1) + '%';
              },
            },
            title: {
                display: true,
                text: 'Частота'
            }
          },
          x: {
            title: {
                display: true,
                text: 'Буква'
            }
          }
        },
        plugins: {
          legend: {
            position: 'top' as const,
          },
          tooltip: {
            callbacks: {
              label: function (context) {
                let label = context.dataset.label || '';
                if (label) {
                  label += ': ';
                }
                if (context.parsed.y !== null) {
                  label += (context.parsed.y * 100).toFixed(2) + '%';
                }
                return label;
              },
            },
          },
        },
      }),
    },
  },
});
</script> 