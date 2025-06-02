<template>
  <a-layout-footer style="text-align: center; padding: 12px 24px;">
    <a-typography-text type="secondary">
      Разработано с ❤️. Связь с создателем: 
      <a-typography-link href="https://t.me/cowfucker" target="_blank">@cowfucker</a-typography-link>
    </a-typography-text>
    <br/>
    <a-typography-text type="secondary" :style="{ fontSize: '12px' }">©2025 VigenereApp</a-typography-text>
  </a-layout-footer>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'AppFooter',
});
</script> 