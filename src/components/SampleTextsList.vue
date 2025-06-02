<template>
  <div>
    <a-button @click="showDrawer" class="themed-button-outline sample-texts-button">
      <template #icon><MenuOutlined /></template>
      Выбрать пример текста
    </a-button>
    <a-drawer
      title="Примеры текстов для анализа"
      :placement="'left'"
      :open="drawerVisible"
      @close="closeDrawer"
      class="themed-drawer sample-texts-drawer"
      :width="drawerWidth"
    >
      <div v-if="sampleTextsError" class="error-message">
        <a-alert :message="sampleTextsError" type="error" show-icon />
      </div>
      <a-list 
        v-else-if="sampleTexts && sampleTexts.length > 0" 
        item-layout="horizontal" 
        :data-source="sampleTexts"
        class="sample-list"
      >
        <template #renderItem="{ item }">
          <a-list-item class="sample-list-item" @click="handleSelect(item.text)">
            <a-list-item-meta>
              <template #title>
                <a href="#">{{ item.name }}</a>
              </template>
              <template #description>
                <span class="sample-text-description">{{ item.description || item.text.substring(0, 100) + (item.text.length > 100 ? '...' : '') }}</span>
              </template>
            </a-list-item-meta>
          </a-list-item>
        </template>
      </a-list>
      <a-empty v-else description="Нет доступных примеров текстов или они еще не загружены." class="empty-message"/>
    </a-drawer>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, PropType, computed } from 'vue';
import { MenuOutlined } from '@ant-design/icons-vue';

interface SampleTextEntry {
  name: string;
  text: string;
  description?: string;
}

export default defineComponent({
  name: 'SampleTextsList',
  components: {
    MenuOutlined,
  },
  props: {
    sampleTexts: {
      type: Array as PropType<SampleTextEntry[]>,
      required: true,
    },
    sampleTextsError: {
      type: String as PropType<string | null>,
      default: null,
    },
  },
  emits: ['select-text'],
  setup(props, { emit }) {
    const drawerVisible = ref(false);

    const drawerWidth = computed(() => {
      return window.innerWidth < 768 ? '90%' : '420px'; 
    });

    const showDrawer = () => {
      drawerVisible.value = true;
    };

    const closeDrawer = () => {
      drawerVisible.value = false;
    };

    const handleSelect = (text: string) => {
      emit('select-text', text);
      closeDrawer();
    };

    return {
      drawerVisible,
      showDrawer,
      closeDrawer,
      handleSelect,
      drawerWidth,
    };
  },
});
</script>

<style scoped>
.sample-texts-button {

}

.sample-texts-drawer :deep(.ant-drawer-body) {
  padding-top: 16px;
  padding-bottom: 16px;
  overflow-y: auto; 
}

.sample-list {
  
}

.sample-list-item {
  cursor: pointer;
  padding: 10px 16px;
  transition: background-color 0.3s ease;
  border-radius: 4px;
}

.sample-list-item .ant-list-item-meta-title a {
  display: block;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  color: var(--ant-primary-color);
  transition: color 0.3s ease;
  font-weight: 500;
}

.sample-list-item .ant-list-item-meta-description,
.sample-text-description { 
  font-size: 0.85em;
  color: var(--ant-text-color-secondary);
  white-space: normal; 
  word-break: break-word; 
  display: -webkit-box;
  -webkit-line-clamp: 2; 
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.4;
  transition: color 0.3s ease;
}

.error-message,
.empty-message {
  padding: 20px; 
  text-align: center;
}

/* Светлая тема */
[data-theme='light'] .sample-list-item:hover {
  background-color: #e6f7ff;
}
/* Темная тема */
[data-theme='dark'] .sample-list-item .ant-list-item-meta-title a {
   color: var(--ant-primary-color-hover);
}
[data-theme='dark'] .sample-list-item:hover {
  background-color: rgba(255, 255, 255, 0.08);
}


[data-theme='light'] .themed-button-outline {
  
}
[data-theme='dark'] .themed-button-outline {
  
}
</style>