<template>
  <a-card title="Входные данные" :bordered="false" class="themed-card" style="height: 100%;">
    <a-space direction="vertical" style="width: 100%;">
      <a-typography-text strong>Текст для обработки:</a-typography-text>
      <a-upload
        :show-upload-list="false"
        :before-upload="handleFileLoad"
        accept=".txt,.text,text/plain"
      >
        <a-button style="margin-bottom: 8px;">
          <template #icon><UploadOutlined /></template>
          Загрузить текст из файла (.txt)
        </a-button>
      </a-upload>
      <a-textarea
        :value="textValue"
        @update:value="$emit('update:textValue', $event)"
        placeholder="Введите текст здесь или загрузите из файла"
        :rows="6"
        allow-clear
        class="hide-scrollbar"
      />

      <a-typography-text strong>Ключ (для шифрования/дешифрования):</a-typography-text>
      <a-input
        :value="keyValue"
        @update:value="$emit('update:keyValue', $event)"
        placeholder="Введите ключ"
        allow-clear
        class="hide-scrollbar"
      />
    </a-space>

    <a-flex :gap="'small'" :wrap="'wrap'" style="margin-top: 24px;">
      <a-button type="primary" @click="$emit('encrypt')" :loading="isLoading">Зашифровать</a-button>
      <a-button @click="$emit('decrypt')" :loading="isLoading">Расшифровать</a-button>
      <a-button danger @click="$emit('crack')" :loading="isLoading">Взломать</a-button>
      <a-button @click="$emit('clear-all-inputs')" style="margin-left: auto;">Очистить все</a-button>
    </a-flex>
  </a-card>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue';
import { UploadOutlined } from '@ant-design/icons-vue';
import { message } from 'ant-design-vue';

export default defineComponent({
  name: 'InputSection',
  components: {
    UploadOutlined,
  },
  props: {
    textValue: {
      type: String as PropType<string>,
      required: true,
    },
    keyValue: {
      type: String as PropType<string>,
      required: true,
    },
    isLoading: {
      type: Boolean as PropType<boolean>,
      default: false,
    },
  },
  emits: ['update:textValue', 'update:keyValue', 'encrypt', 'decrypt', 'crack', 'text-loaded', 'clear-all-inputs'],
  setup(props, { emit }) {
    const handleFileLoad = (file: File) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const fileContent = e.target?.result as string;
          emit('text-loaded', fileContent);
          message.success(`Файл '${file.name}' успешно загружен.`);
        } catch (error) {
          console.error('Ошибка чтения файла:', error);
          message.error('Не удалось прочитать содержимое файла.');
        }
      };
      reader.onerror = () => {
        console.error('Ошибка FileReader:', reader.error);
        message.error('Произошла ошибка при чтении файла.');
      };
      reader.readAsText(file, 'UTF-8');
      return false;
    };

    return {
      handleFileLoad,
    };
  },
});
</script>

<style scoped>
.themed-card {
  transition: box-shadow 0.3s ease, background-color 0.3s ease;
}

[data-theme='light'] .themed-card {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.09);
}

[data-theme='dark'] .themed-card {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.45); 
  
}


.hide-scrollbar::-webkit-scrollbar {
  display: none; /* Safari and Chrome */
}

.hide-scrollbar {
  -ms-overflow-style: none;  /* IE 10+ */
  scrollbar-width: none;  /* Firefox */
}

:deep(.ant-input).hide-scrollbar {
    -ms-overflow-style: none;  /* IE 10+ */
    scrollbar-width: none;  /* Firefox */
}
:deep(.ant-input).hide-scrollbar::-webkit-scrollbar {
    display: none; /* Safari and Chrome */
}

:deep(textarea.ant-input).hide-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
}
:deep(textarea.ant-input).hide-scrollbar::-webkit-scrollbar {
    display: none;
}
</style> 