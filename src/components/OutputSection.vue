<template>
  <a-card title="Результат" :bordered="false" class="themed-card" style="height: 100%;">
    <a-space direction="vertical" style="width: 100%;">
      <a-alert 
        v-if="errorMessage" 
        :message="errorMessage" 
        type="error" 
        show-icon 
        closable 
        @close="$emit('clear-error')" 
      />

      <div v-if="isCrackLoading && crackProgressMessage" class="progress-container">
        <a-spin size="small" />
        <a-typography-text type="secondary" style="margin-left: 8px;">{{ crackProgressMessage }}</a-typography-text>
      </div>
      
      <a-typography-text strong>Обработанный текст:</a-typography-text>
      <a-textarea
        :value="result"
        readonly
        placeholder="Результат появится здесь"
        :rows="result && result.length > 100 ? 8 : 6" 
        class="result-textarea"
      />

      <div v-if="crackedKey && !isCrackLoading">
        <a-typography-text strong>Предполагаемый ключ (при взломе):</a-typography-text>
        <a-input
          :value="crackedKey"
          readonly
          class="cracked-key-input"
        />
      </div>

      <a-collapse v-if="crackLog && crackLog.length > 0 && !isCrackLoading" class="log-collapse">
        <a-collapse-panel key="1" header="Детали процесса взлома">
          <div class="log-content">
            <div v-for="(logEntry, index) in crackLog" :key="index" class="log-entry">
              {{ logEntry }}
            </div>
          </div>
        </a-collapse-panel>
      </a-collapse>

      <div v-if="cipherOperationLog && cipherOperationLog.length > 0 && !isCrackLoading" class="details-container">
        <a-typography-title :level="5" class="details-title">Детализация операции:</a-typography-title>
        <a-table
          :columns="cipherTableColumns"
          :data-source="cipherOperationLog"
          :pagination="tablePaginationConfig"
          row-key="step"
          :key="`cipher-log-table-${cipherLogPageSize}`"
          size="small"
          bordered
          class="details-table"
        >
          <template #bodyCell="{ column, text, record }">
            <template v-if="column.key === 'originalChar' || column.key === 'keyChar' || column.key === 'processedChar'">
              <span>{{ text }} <sub>({{ record[column.key + 'Index'] }})</sub></span>
            </template>
             <template v-else-if="column.key === 'formula'">
              <span style="font-family: monospace; font-size: 0.9em;">{{ text }}</span>
            </template>
          </template>
        </a-table>
      </div>

      <div v-if="(inputFreqChartData || outputFreqChartData) && !isCrackLoading" class="charts-container">
        <a-typography-title :level="5" class="details-title">Частотный анализ:</a-typography-title>
        <a-tabs default-active-key="1" size="small">
          <a-tab-pane key="1" tab="Исходный текст" v-if="inputFreqChartData">
            <div class="chart-wrapper">
              <FrequencyChart :chart-data="inputFreqChartData" :chart-options="chartOptions" />
            </div>
          </a-tab-pane>
          <a-tab-pane key="2" tab="Обработанный текст" v-if="outputFreqChartData">
            <div class="chart-wrapper">
              <FrequencyChart :chart-data="outputFreqChartData" :chart-options="chartOptions" />
            </div>
          </a-tab-pane>
        </a-tabs>
      </div>

    </a-space>
  </a-card>
</template>

<script lang="ts">
import { defineComponent, PropType, ref, computed } from 'vue';
import { CipherStepDetail } from '../vigenere-cipher';
import FrequencyChart from './FrequencyChart.vue'; 
import { ChartOptions } from 'chart.js';
import { ChartDataType } from '../App.vue'; 

const cipherTableColumns = [
  { title: 'Шаг', dataIndex: 'step', key: 'step', width: 60, sorter: (a: CipherStepDetail, b: CipherStepDetail) => a.step - b.step, fixed: 'left' as const },
  { title: 'Исход. (Po/Co)', dataIndex: 'originalChar', key: 'originalChar', width: 120 },
  { title: 'Ключ (K)', dataIndex: 'keyChar', key: 'keyChar', width: 100 },
  { title: 'Формула', dataIndex: 'formula', key: 'formula', width: 220 },
  { title: 'Итог (Co/Po)', dataIndex: 'processedChar', key: 'processedChar', width: 120 },
];

export default defineComponent({
  name: 'OutputSection',
  components: {
    FrequencyChart, 
  },
  props: {
    result: {
      type: String as PropType<string>,
      required: true,
    },
    crackedKey: {
      type: String as PropType<string>,
      required: true,
    },
    errorMessage: {
      type: String as PropType<string>,
      required: true,
    },
    isCrackLoading: {
      type: Boolean as PropType<boolean>,
      default: false,
    },
    crackProgressMessage: {
      type: String as PropType<string | null>,
      default: null,
    },
    crackLog: {
      type: Array as PropType<string[]>,
      default: () => [],
    },
    cipherOperationLog: {
      type: Array as PropType<CipherStepDetail[]>,
      default: () => [],
    },
    inputFreqChartData: { 
      type: Object as PropType<ChartDataType | null>,
      default: null,
    },
    outputFreqChartData: { 
      type: Object as PropType<ChartDataType | null>,
      default: null,
    },
  },
  emits: ['clear-error'],
  setup(props) {
    const chartOptions = ref<ChartOptions<'bar'>>({
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
          title: { display: true, text: 'Частота' },
        },
        x: { title: { display: true, text: 'Буква' } },
      },
      plugins: {
        legend: { position: 'top' as const },
        tooltip: {
          callbacks: {
            label: function (context) {
              let label = context.dataset.label || '';
              if (label) { label += ': '; }
              if (context.parsed.y !== null) {
                label += (context.parsed.y * 100).toFixed(2) + '%';
              }
              return label;
            },
          },
        },
      },
    });

    const cipherLogCurrentPage = ref(1);
    const cipherLogPageSize = ref(5);

    const basePaginationOptions = computed(() => ({
      hideOnSinglePage: false,
      size: 'small' as const,
      showSizeChanger: false,
      pageSizeOptions: [5, 10, 15, 20, 50, 100],
      showTotal: (total: number, range: [number, number]) => `${range[0]}-${range[1]} из ${total} шагов`,
      onChange: (page: number, newPageSize?: number) => {
        cipherLogCurrentPage.value = page;
        if (newPageSize && cipherLogPageSize.value !== newPageSize) {
          cipherLogPageSize.value = newPageSize;
        }
      },
      onShowSizeChange: (current: number, size: number) => {
        cipherLogCurrentPage.value = 1;
        cipherLogPageSize.value = size;
      },
    }));

    const tablePaginationConfig = computed(() => ({
      ...basePaginationOptions.value,
      current: cipherLogCurrentPage.value,
      pageSize: cipherLogPageSize.value,
      total: props.cipherOperationLog.length,
    }));

    return {
      cipherTableColumns,
      chartOptions,
      tablePaginationConfig,
      cipherLogPageSize,
    };
  }
});
</script>

<style scoped>
.themed-card {
  transition: box-shadow 0.3s ease, background-color 0.3s ease;
}

.progress-container {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
  padding: 8px;
  border-radius: 4px;
  transition: background-color 0.3s ease;
}

.log-collapse, .details-container, .charts-container {
  margin-top: 16px;
}

.details-title {
  margin-bottom: 8px !important; 
}

.log-content {
  max-height: 150px; 
  overflow-y: auto;
  padding: 8px;
  border-radius: 4px;
  font-family: monospace;
  font-size: 0.85em;
  line-height: 1.5;
}

.log-entry {
  padding: 2px 0;
  white-space: pre-wrap;
  word-break: break-all;
}

.details-table :deep(th),
.details-table :deep(td) {
  transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease;
}

.details-table :deep(sub) {
  font-size: 0.7em;
  opacity: 0.7;
}

.chart-wrapper {
  height: 300px; 
  position: relative; 
  margin-top: 8px;
}


[data-theme='light'] .progress-container {
  background-color: #e6f7ff;
}
[data-theme='light'] .log-content {
  background-color: #f0f2f5;
  border: 1px solid #d9d9d9;
}
[data-theme='light'] .log-entry {
  color: #595959;
}

[data-theme='dark'] .progress-container {
  background-color: rgba(24, 144, 255, 0.1);
}
[data-theme='dark'] .log-content {
  background-color: rgba(255, 255, 255, 0.04);
  border: 1px solid #303030;
}
[data-theme='dark'] .log-entry {
  color: #a6a6a6;
}

[data-theme='light'] .details-table :deep(th) {
  background-color: #fafafa !important;
}
[data-theme='light'] .details-table :deep(td) {
  background-color: #ffffff !important;
}

[data-theme='dark'] .details-table :deep(th) {
  background-color: #2a2a2a !important;
  border-bottom-color: #424242 !important;
}
[data-theme='dark'] .details-table :deep(td) {
  background-color: #1e1e1e !important;
  border-color: #424242 !important;
}
[data-theme='dark'] .details-table :deep(.ant-table-cell-row-hover) {
    background-color: #252525 !important;
}

[data-theme='light'] .themed-card {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.09);
}

[data-theme='dark'] .themed-card {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.45);
}

.result-textarea textarea,
.cracked-key-input .ant-input {
  cursor: default !important;
  transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease; 
}

[data-theme='light'] .result-textarea textarea,
[data-theme='light'] .cracked-key-input .ant-input {
  background-color: #f5f5f5;
  color: rgba(0, 0, 0, 0.65);
  border-color: #d9d9d9;
}

[data-theme='dark'] .result-textarea textarea,
[data-theme='dark'] .cracked-key-input .ant-input {
  background-color: rgba(255, 255, 255, 0.09);
  color: rgba(255, 255, 255, 0.65);
  border-color: #434343;
}
</style> 