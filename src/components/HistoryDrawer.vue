<template>
  <a-drawer
    :open="isOpen"
    title="История операций"
    placement="right"
    :width="drawerWidth"
    @close="$emit('close')"
    class="history-drawer"
  >
    <template #extra>
      <a-button @click="showClearConfirm" :disabled="history.length === 0" danger>
        <template #icon><DeleteOutlined /></template>
        Очистить историю
      </a-button>
    </template>

    <a-empty v-if="!history || history.length === 0" description="История операций пуста" />

    <a-table
      v-else
      :columns="historyTableColumns"
      :data-source="history"
      row-key="id"
      size="small"
      :pagination="false"
      :scroll="{ x: 800 }"
      class="history-table"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'timestamp'">
          {{ formatTimestamp(record.timestamp) }}
        </template>
        <template v-if="column.key === 'type'">
          <a-tag :color="getTagColor(record.type)">{{ translateType(record.type) }}</a-tag>
        </template>
        <template v-if="column.key === 'inputText' || column.key === 'outputText'">
          <div class="text-cell" @click="showTextModal(record[column.dataIndex], column.title as string)">
            {{ truncateText(record[column.dataIndex]) }}
            <span v-if="record[column.dataIndex] && record[column.dataIndex].length > 50" class="expand-indicator">...</span>
          </div>
        </template>
        <template v-if="column.key === 'inputKey'">
          <span v-if="record.inputKey">{{ record.inputKey }}</span>
          <span v-else>-</span>
        </template>
         <template v-if="column.key === 'crackedKey'">
          <span v-if="record.crackedKey">{{ record.crackedKey }}</span>
          <span v-else>-</span>
        </template>
        <template v-if="column.key === 'status'">
          <a-tooltip v-if="record.error" :title="record.error">
            <a-tag color="red">Ошибка</a-tag>
          </a-tooltip>
          <a-tag v-else color="green">Успех</a-tag>
        </template>
        <template v-if="column.key === 'actions'">
          <a-button type="link" size="small" @click="restoreState(record)">
            <template #icon><RetweetOutlined /></template>
            Восстановить
          </a-button>
        </template>
      </template>
    </a-table>

    <a-modal
      :open="isTextModalVisible"
      :title="modalTextTitle"
      @cancel="closeTextModal"
      :footer="null"
      width="80%"
      class="text-modal"
    >
      <a-typography-paragraph copyable class="modal-text-content">
        {{ modalTextContent }}
      </a-typography-paragraph>
    </a-modal>

  </a-drawer>
</template>

<script lang="ts">
import { defineComponent, ref, PropType, computed } from 'vue';
import { Modal } from 'ant-design-vue';
import { HistoryEntry } from '../App.vue';
import { DeleteOutlined, RetweetOutlined, ExclamationCircleOutlined } from '@ant-design/icons-vue';
import { h } from 'vue';

const historyTableColumns = [
  { title: 'Время', dataIndex: 'timestamp', key: 'timestamp', width: 150, fixed: 'left' as const, sorter: (a: HistoryEntry, b: HistoryEntry) => a.timestamp - b.timestamp },
  { title: 'Тип', dataIndex: 'type', key: 'type', width: 120, filters: [
      { text: 'Шифрование', value: 'encrypt' },
      { text: 'Дешифрование', value: 'decrypt' },
      { text: 'Взлом', value: 'crack' },
    ],
    onFilter: (value: string, record: HistoryEntry) => record.type.indexOf(value) === 0,
  },
  { title: 'Статус', dataIndex: 'status', key: 'status', width: 100, filters: [
      { text: 'Успех', value: 'success' },
      { text: 'Ошибка', value: 'error' },
    ],
    onFilter: (value: string, record: HistoryEntry) => {
        if (value === 'success') return !record.error;
        if (value === 'error') return !!record.error;
        return false;
    }
  },
  { title: 'Исходный текст', dataIndex: 'inputText', key: 'inputText', width: 200 },
  { title: 'Ключ (ввод)', dataIndex: 'inputKey', key: 'inputKey', width: 120 },
  { title: 'Результат', dataIndex: 'outputText', key: 'outputText', width: 200 },
  { title: 'Ключ (взлом)', dataIndex: 'crackedKey', key: 'crackedKey', width: 120 },
  { title: 'Действия', key: 'actions', width: 150, fixed: 'right' as const },
];


export default defineComponent({
  name: 'HistoryDrawer',
  components: {
    DeleteOutlined,
    RetweetOutlined,
  },
  props: {
    isOpen: {
      type: Boolean,
      required: true,
    },
    history: {
      type: Array as PropType<HistoryEntry[]>,
      required: true,
    },
  },
  emits: ['close', 'clear-history', 'restore-state'],
  setup(props, { emit }) {
    const isTextModalVisible = ref(false);
    const modalTextContent = ref('');
    const modalTextTitle = ref('');

    const drawerWidth = computed(() => {
      return window.innerWidth > 768 ? '60%' : '95%';
    });

    const formatTimestamp = (timestamp: number) => {
      return new Date(timestamp).toLocaleString('ru-RU', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      });
    };

    const translateType = (type: 'encrypt' | 'decrypt' | 'crack') => {
      const map = {
        encrypt: 'Шифрование',
        decrypt: 'Дешифрование',
        crack: 'Взлом',
      };
      return map[type] || type;
    };

    const getTagColor = (type: 'encrypt' | 'decrypt' | 'crack') => {
      const map = {
        encrypt: 'blue',
        decrypt: 'green',
        crack: 'orange',
      };
      return map[type] || 'default';
    };

    const truncateText = (text: string | undefined, maxLength = 50) => {
      if (!text) return '-';
      if (text.length <= maxLength) return text;
      return text.substring(0, maxLength);
    };

    const showTextModal = (text: string, title: string) => {
      modalTextContent.value = text;
      modalTextTitle.value = title;
      isTextModalVisible.value = true;
    };

    const closeTextModal = () => {
      isTextModalVisible.value = false;
      modalTextContent.value = '';
      modalTextTitle.value = '';
    };
    
    const showClearConfirm = () => {
      Modal.confirm({
        title: 'Вы уверены, что хотите очистить историю операций?',
        icon: h(ExclamationCircleOutlined),
        content: 'Это действие необратимо.',
        okText: 'Да, очистить',
        okType: 'danger',
        cancelText: 'Отмена',
        onOk() {
          emit('clear-history');
        },
      });
    };

    const restoreState = (entry: HistoryEntry) => {
      emit('restore-state', entry);
    };

    return {
      historyTableColumns,
      formatTimestamp,
      translateType,
      getTagColor,
      truncateText,
      isTextModalVisible,
      modalTextContent,
      modalTextTitle,
      showTextModal,
      closeTextModal,
      restoreState,
      showClearConfirm,
      drawerWidth,
    };
  },
});
</script>

<style scoped>
.history-drawer :deep(.ant-drawer-body) {
  padding: 16px;
  overflow-y: auto;
}
.history-drawer :deep(.ant-drawer-header-title) {
    flex-grow: 1; 
}
.history-drawer :deep(.ant-drawer-extra) {
    margin-inline-start: auto; 
}

.history-table :deep(th),
.history-table :deep(td) {
  transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease;
}

.text-cell {
  cursor: pointer;
  max-width: 200px; 
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis; 
  display: inline-block; 
}

.expand-indicator {
  color: #1890ff; 
  margin-left: 4px;
}

.modal-text-content {
  white-space: pre-wrap; 
  word-break: break-word; 
  max-height: 70vh;
  overflow-y: auto;
  font-family: monospace;
  font-size: 0.9em;
  background-color: var(--code-bg-color, #f5f5f5); 
  padding: 10px;
  border-radius: 4px;
  border: 1px solid var(--border-color-base, #d9d9d9);
}


[data-theme='dark'] .history-table :deep(th) {
  background-color: #2a2a2a !important;
  border-bottom-color: #424242 !important;
}
[data-theme='dark'] .history-table :deep(td) {
  background-color: #1e1e1e !important;
  border-color: #424242 !important;
}
[data-theme='dark'] .history-table :deep(.ant-table-cell-row-hover) {
    background-color: #252525 !important;
}

[data-theme='dark'] .modal-text-content {
    background-color: rgba(255, 255, 255, 0.08);
    border-color: #434343;
    color: rgba(255, 255, 255, 0.85);
}
</style> 