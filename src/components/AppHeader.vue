<template>
  <a-layout-header 
    class="app-header"
    style="padding: 0 24px; display: flex; justify-content: space-between; align-items: center;"
  >
    <a-typography-title :level="3" style="color: #1890ff; margin: 0; line-height: normal;">
      Шифр Виженера: Шифрование и Криптоанализ
    </a-typography-title>
    
    <a-dropdown :trigger="['click']">
      <template #overlay>
        <a-menu @click="handleMenuClick">
          <a-menu-item key="themeSwitcher" style="cursor: default;">
            <div style="display: flex; align-items: center; justify-content: space-between;">
              <span style="margin-right: 8px;">Тема</span>
              <a-switch
                :checked="currentTheme === 'dark'"
                @change="onThemeSwitchChange"
              >
                <template #checkedChildren><component :is="icons['MoonOutlined']" /></template>
                <template #unCheckedChildren><component :is="icons['SunOutlined']" /></template>
              </a-switch>
            </div>
          </a-menu-item>
          <a-menu-item key="showHistory">
             <template #icon><component :is="icons['HistoryOutlined']" /></template>
            История операций
          </a-menu-item>
        </a-menu>
      </template>
      <a-button type="text" style="font-size: 20px; height: auto; padding: 0 8px;">
        <component :is="icons['MenuOutlined']" />
      </a-button>
    </a-dropdown>
  </a-layout-header>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue';
import * as AntIcons from '@ant-design/icons-vue';
import { Switch as ASwitch } from 'ant-design-vue';

type ThemeMode = 'light' | 'dark';

interface MenuClickEventArgs {
  key: string;
}

export default defineComponent({
  name: 'AppHeader',
  components: {
    ASwitch,
  },
  props: {
    currentTheme: {
      type: String as PropType<ThemeMode>,
      required: true,
    },
  },
  emits: ['toggle-theme', 'show-history'],
  setup(props, { emit }) {
    const icons = AntIcons;

    const handleMenuClick = (e: MenuClickEventArgs) => {
      if (e.key === 'showHistory') {
        emit('show-history');
      }
    };

    const onThemeSwitchChange = () => {
      emit('toggle-theme');
    };

    return {
      icons,
      handleMenuClick,
      onThemeSwitchChange,
    };
  },
});
</script>

<style scoped>
.app-header {
  transition: background-color 0.3s ease, border-color 0.3s ease;
}

[data-theme='light'] .app-header {
  background-color: #ffffff; 
  border-bottom: 1px solid #f0f0f0;
}

[data-theme='dark'] .app-header {
  background-color: #141414;
  border-bottom: 1px solid #303030;
}
</style> 