<template>
  <a-config-provider :theme="antdConfigTheme">
    <a-layout class="layout">
      <AppHeader 
        @toggle-theme="toggleTheme" 
        :current-theme="currentTheme" 
        @show-history="openHistoryDrawer"
      />

      <a-layout-content style="padding: 24px;">
        <SampleTextsList 
          :sample-texts="sampleTexts"
          :sample-texts-error="sampleTextsError"
          @select-text="setTextFromSample"
          style="margin-bottom: 16px;" 
        />
        <a-row :gutter="[24, 24]">
          <a-col :xs="24" :lg="12">
            <InputSection 
              v-model:textValue="text" 
              v-model:keyValue="key" 
              :is-loading="isLoading"
              @encrypt="encryptText"
              @decrypt="decryptText"
              @crack="crackCipher"
              @text-loaded="handleTextLoadedFromFile"
              @clear-all-inputs="clearAllData"
            />
          </a-col>

          <a-col :xs="24" :lg="12">
            <OutputSection 
              :result="result"
              :cracked-key="crackedKey"
              :error-message="errorMessage"
              :is-crack-loading="isCrackLoading"
              :crack-progress-message="crackProgressMessage"
              :crack-log="crackLog"
              :cipher-operation-log="cipherOperationLog"
              :input-freq-chart-data="inputFreqChartData"
              :output-freq-chart-data="outputFreqChartData"
              @clear-error="clearErrorOnly"
            />
          </a-col>
        </a-row>
      </a-layout-content>

      <AppFooter />
      <HistoryDrawer 
        :is-open="isHistoryDrawerOpen"
        :history="operationHistory"
        @close="closeHistoryDrawer"
        @clear-history="clearOperationHistory"
        @restore-state="restoreStateFromHistory"
      />
    </a-layout>
  </a-config-provider>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, computed, watchEffect } from 'vue';
import { theme as antdTheme } from 'ant-design-vue';

import { encryptVigenere, decryptVigenere, CipherStepDetail, ALPHABET as CipherAlphabet, calculateCharacterFrequencies } from './vigenere-cipher';
import { kasiskiAttack, frequency as standardFrequencies } from './vigenere';

import AppHeader from './components/AppHeader.vue';
import InputSection from './components/InputSection.vue';
import OutputSection from './components/OutputSection.vue';
import AppFooter from './components/AppFooter.vue';
import SampleTextsList from './components/SampleTextsList.vue';
import HistoryDrawer from './components/HistoryDrawer.vue';
import { ChartData } from 'chart.js';


export type ChartDataType = ChartData<'bar', (number | null)[], string>;

interface SampleTextEntry {
  name: string;
  text: string;
}


type ThemeMode = 'light' | 'dark';


export interface HistoryEntry {
  id: string;
  type: 'encrypt' | 'decrypt' | 'crack';
  timestamp: number;
  inputText: string; 
  inputKey?: string;
  outputText: string; 
  crackedKey?: string;
  error?: string;
 
  crackLog?: string[]; 
  cipherOperationLog?: CipherStepDetail[]; 
  inputFreqChartData?: ChartDataType; 
  outputFreqChartData?: ChartDataType; 
  
  isInputTextTruncated?: boolean;
  isOutputTextTruncated?: boolean;
}

const MAX_TEXT_LENGTH_IN_HISTORY = 2000; // Максимальная длина текста для сохранения в истории

export default defineComponent({
  name: 'App',
  components: {
    AppHeader,
    InputSection,
    OutputSection,
    AppFooter,
    SampleTextsList,
    HistoryDrawer,
  },
  setup() {
    const text = ref('');
    const key = ref('');
    const result = ref<string>('');
    const crackedKey = ref('');
    const errorMessage = ref('');
    const isLoading = ref(false);
    const isCrackLoading = ref(false);
    const crackProgressMessage = ref<string | null>(null);
    const crackLog = ref<string[]>([]);
    const cipherOperationLog = ref<CipherStepDetail[]>([]);
    const inputFreqChartData = ref<ChartDataType | null>(null);
    const outputFreqChartData = ref<ChartDataType | null>(null);
    
    const sampleTexts = ref<SampleTextEntry[]>([]);
    const sampleTextsError = ref<string|null>(null);

    const currentTheme = ref<ThemeMode>('light');

    // --- Управление темой --- 
    watchEffect(() => {
      document.documentElement.setAttribute('data-theme', currentTheme.value);
    });

    const saveThemeToLocalStorage = () => {
      localStorage.setItem('appTheme', currentTheme.value);
    };

    const toggleTheme = () => {
      currentTheme.value = currentTheme.value === 'light' ? 'dark' : 'light';
      saveThemeToLocalStorage();
    };

    // --- Состояние для истории --- 
    const operationHistory = ref<HistoryEntry[]>([]);
    const MAX_HISTORY_ITEMS = 20; 
    const isHistoryDrawerOpen = ref(false); // Состояние для открытия/закрытия HistoryDrawer

    const saveHistoryToLocalStorage = () => {
      try {
        // Создаем копию истории только с необходимыми для localStorage данными
        const historyToSave = operationHistory.value.map(entry => {
          let storableInputText = entry.inputText;
          let isInputTextTruncated = false;
          if (storableInputText.length > MAX_TEXT_LENGTH_IN_HISTORY) {
            storableInputText = storableInputText.substring(0, MAX_TEXT_LENGTH_IN_HISTORY) + '... (обрезано)';
            isInputTextTruncated = true;
          }

          let storableOutputText = entry.outputText;
          let isOutputTextTruncated = false;
          if (storableOutputText.length > MAX_TEXT_LENGTH_IN_HISTORY) {
            storableOutputText = storableOutputText.substring(0, MAX_TEXT_LENGTH_IN_HISTORY) + '... (обрезано)';
            isOutputTextTruncated = true;
          }
          
          // Исключаем большие поля
          const { crackLog, cipherOperationLog, inputFreqChartData, outputFreqChartData, ...rest } = entry;
          return { 
            ...rest,
            inputText: storableInputText,
            outputText: storableOutputText,
            isInputTextTruncated: isInputTextTruncated || undefined, 
            isOutputTextTruncated: isOutputTextTruncated || undefined, 
            // crackLog, cipherOperationLog, inputFreqChartData, outputFreqChartData НЕ СОХРАНЯЮТСЯ
          };
        });
        localStorage.setItem('operationHistory', JSON.stringify(historyToSave));
      } catch (e) {
        console.error("Ошибка сохранения истории в localStorage (возможно, превышена квота):", e);
        
        errorMessage.value = "Ошибка сохранения истории: хранилище переполнено. Попробуйте очистить историю операций.";
      }
    };

    const createFrequencyChartData = (textFrequencies: Record<string, number>, label: string, color: string): ChartDataType => {
      const labels = CipherAlphabet.split('');
      const data = labels.map(char => textFrequencies[char] || 0);
      const standardData = labels.map(char => standardFrequencies[char] || 0);

      return {
        labels,
        datasets: [
          {
            label: `${label} (Этот текст)`,
            backgroundColor: color,
            borderColor: color,
            borderWidth: 1,
            data,
          },
          {
            label: 'Эталонные частоты',
            backgroundColor: 'rgba(150, 150, 150, 0.4)',
            borderColor: 'rgba(150, 150, 150, 1)',
            borderWidth: 1,
            data: standardData,
          },
        ],
      };
    };

    const updateFrequencyCharts = (inputTextVal: string, resultTextVal: string) => {
      if (inputTextVal && inputTextVal.length <= MAX_TEXT_LENGTH_IN_HISTORY * 2) { 
        const inputTextFreq = calculateCharacterFrequencies(inputTextVal);
        inputFreqChartData.value = createFrequencyChartData(inputTextFreq, 'Исходный текст', '#1890ff');
      } else {
        inputFreqChartData.value = null;
      }


      if (resultTextVal && resultTextVal.length <= MAX_TEXT_LENGTH_IN_HISTORY * 2) {
        const outputTextFreq = calculateCharacterFrequencies(resultTextVal);
        outputFreqChartData.value = createFrequencyChartData(outputTextFreq, 'Обработанный текст', '#52c41a');
      } else {
        outputFreqChartData.value = null;
      }
    };

    const clearFrequencyCharts = () => {
        inputFreqChartData.value = null;
        outputFreqChartData.value = null;
    };

    // Новая функция для очистки всех данных
    const clearAllData = () => {
      text.value = '';
      key.value = '';
      result.value = '';
      crackedKey.value = '';
      errorMessage.value = '';
      crackProgressMessage.value = null;
      crackLog.value = [];
      cipherOperationLog.value = [];
      clearFrequencyCharts();
    };

    const addHistoryEntry = (entryData: Omit<HistoryEntry, 'id' | 'timestamp' | 'isInputTextTruncated' | 'isOutputTextTruncated'>) => {
      // Runtime entry содержит все данные, включая потенциально большие логи
      const newEntry: HistoryEntry = {
        ...entryData,
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        // Здесь мы сохраняем полные логи и данные графиков в runtime history
        // Они будут отфильтрованы при вызове saveHistoryToLocalStorage
        crackLog: crackLog.value.length > 0 ? [...crackLog.value] : undefined,
        cipherOperationLog: cipherOperationLog.value.length > 0 ? [...cipherOperationLog.value] : undefined,
        inputFreqChartData: inputFreqChartData.value ? {...inputFreqChartData.value} : undefined,
        outputFreqChartData: outputFreqChartData.value ? {...outputFreqChartData.value} : undefined,
      };
      operationHistory.value.unshift(newEntry);
      if (operationHistory.value.length > MAX_HISTORY_ITEMS) {
        operationHistory.value.pop();
      }
      saveHistoryToLocalStorage(); 
    };

    const openHistoryDrawer = () => {
      isHistoryDrawerOpen.value = true;
    };
    const closeHistoryDrawer = () => {
      isHistoryDrawerOpen.value = false;
    };
    const clearOperationHistory = () => {
      operationHistory.value = [];
      saveHistoryToLocalStorage();
    };

    const restoreStateFromHistory = (entry: HistoryEntry) => {
      text.value = entry.inputText; // Восстанавливаем текст (может быть обрезанным, если из localStorage)
      key.value = entry.inputKey || '';
      if (entry.error) {
        errorMessage.value = entry.error;
        result.value = '';
        crackedKey.value = '';
      } else {
        result.value = entry.outputText; // Восстанавливаем текст (может быть обрезанным)
        crackedKey.value = entry.crackedKey || '';
        errorMessage.value = '';
      }
      
      // Логи и графики не восстанавливаются из localStorage, поэтому просто очищаем их
      crackLog.value = []; 
      cipherOperationLog.value = []; 
      inputFreqChartData.value = null;
      outputFreqChartData.value = null;

      // Если тексты были обрезаны, можно показать уведомление
      if (entry.isInputTextTruncated || entry.isOutputTextTruncated) {
          
          console.warn("Восстановлены обрезанные тексты из истории. Полные логи/детали не доступны.");
      }
      // Если в runtime history есть полная запись (не из localStorage, а из текущей сессии)
      // то можно попытаться восстановить логи. Но это усложнит логику, пока оставим так.

      // Обновим графики, если тексты не пустые, после восстановления
      if (text.value || result.value) {
        updateFrequencyCharts(text.value, result.value);
      }


      crackProgressMessage.value = null; 
      closeHistoryDrawer();
    };

    const handleTextLoadedFromFile = (fileContent: string) => {
      text.value = fileContent;
      result.value = '';
      crackedKey.value = '';
      errorMessage.value = '';
      crackProgressMessage.value = null;
      crackLog.value = [];
      cipherOperationLog.value = [];
      clearFrequencyCharts();
    };

    onMounted(async () => {
      // Загрузка темы из localStorage
      const savedTheme = localStorage.getItem('appTheme') as ThemeMode | null;
      if (savedTheme) {
        currentTheme.value = savedTheme;
      }
      // Важно: Установить data-theme при начальной загрузке, если тема была сохранена
      // watchEffect выше справится с этим, когда currentTheme.value установится

      // Загрузка истории из localStorage
      const savedHistory = localStorage.getItem('operationHistory');
      if (savedHistory) {
        try {
          // Загруженные из localStorage записи уже не содержат полных логов/графиков
          operationHistory.value = JSON.parse(savedHistory);
        } catch (e) {
          console.error("Ошибка парсинга истории из localStorage:", e);
          localStorage.removeItem('operationHistory');
        }
      }
      
      try {
        const response = await fetch('/sample-texts.json');
        if (!response.ok) {
          throw new Error(`Ошибка загрузки примеров: ${response.statusText}`);
        }
        sampleTexts.value = await response.json();
      } catch (e: any) {
        console.error("Не удалось загрузить примеры текстов:", e);
        sampleTextsError.value = e.message || 'Не удалось загрузить примеры текстов.';
      }
    });

    // Динамическая конфигурация для a-config-provider
    const antdConfigTheme = computed(() => ({
      algorithm: currentTheme.value === 'dark' ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
      token: {
        colorPrimary: '#1890ff', // Основной цвет можно оставить или адаптировать
        // Можно добавить специфичные для темы токены, если нужно
      },
    }));
    // --- Конец управления темой ---

    const clearErrorOnly = () => {
      errorMessage.value = '';
    };

    const handleAction = async (
      actionType: 'encrypt' | 'decrypt' | 'crack',
      actionFn: () => Promise<void> | void // actionFn может быть async для crack
    ) => {
      if (errorMessage.value) clearErrorOnly();
      if (crackProgressMessage.value) crackProgressMessage.value = null;
      clearFrequencyCharts(); // Очищаем графики перед любым действием
      
      // Очистка логов перед действием
      crackLog.value = [];
      cipherOperationLog.value = [];

      // Устанавливаем соответствующий флаг загрузки
      if (actionType === 'crack') {
        isCrackLoading.value = true;
      } else {
        isLoading.value = true;
      }
      
      let actionError: string | undefined = undefined;
      let currentInputText = text.value;
      let currentKey = key.value;
      let currentOutputText = '';
      let currentCrackedKey: string | undefined = undefined;
      
      try {
        await actionFn();
        currentOutputText = result.value;
        if (actionType === 'crack') {
          currentCrackedKey = crackedKey.value;
        }
        // Обновляем графики с полными текстами
        updateFrequencyCharts(currentInputText, currentOutputText);

      } catch (e: any) {
        errorMessage.value = e.message || 'Произошла неизвестная ошибка.';
        result.value = '';
        crackedKey.value = '';
        actionError = errorMessage.value;
        clearFrequencyCharts(); 
      } finally {
        if (actionType === 'crack') {
          isCrackLoading.value = false;
        } else {
          isLoading.value = false;
        }
        // addHistoryEntry теперь ожидает данные без полей is...Truncated
        // и сама разберется с тем, что сохранять в localStorage (включая логику обрезки)
        // Runtime history (operationHistory.value) будет содержать полные данные этой сессии
        addHistoryEntry({
          type: actionType,
          inputText: currentInputText, // Сохраняем полный текст в runtime-историю
          inputKey: actionType !== 'crack' ? currentKey : undefined,
          outputText: actionError ? '' : currentOutputText, // Сохраняем полный текст в runtime-историю
          crackedKey: actionType === 'crack' && !actionError ? currentCrackedKey : undefined,
          error: actionError,
          // crackLog, cipherOperationLog, etc., будут добавлены в newEntry внутри addHistoryEntry из текущих refs
        });
      }
    };

    const encryptText = () => {
      handleAction('encrypt', () => {
        const cipherResult = encryptVigenere(text.value, key.value);
        result.value = cipherResult.processedText;
        cipherOperationLog.value = cipherResult.details; // Сохраняем полный лог в ref
        crackedKey.value = '';
      });
    };

    const decryptText = () => {
      handleAction('decrypt', () => {
        const cipherResult = decryptVigenere(text.value, key.value);
        result.value = cipherResult.processedText;
        cipherOperationLog.value = cipherResult.details; // Сохраняем полный лог в ref
        crackedKey.value = '';
      });
    };

    const crackCipher = async () => {
      await handleAction('crack', async () => {
        if (!text.value) {
          throw new Error('Текст для взлома не может быть пустым.');
        }
        result.value = '';
        crackedKey.value = '';
        
        const initialMessage = 'Инициализация процесса взлома...';
        crackProgressMessage.value = initialMessage;
        crackLog.value.push(initialMessage);

        try {
          const foundKey = await kasiskiAttack(text.value, (progressMsg) => {
            crackProgressMessage.value = progressMsg;
            crackLog.value.push(progressMsg);
          });
          crackedKey.value = foundKey;
          const decryptedResult = decryptVigenere(text.value, foundKey);
          result.value = decryptedResult.processedText;
          cipherOperationLog.value = decryptedResult.details; // Сохраняем полный лог в ref
          const finalMessage = 'Взлом успешно завершен. Ключ: ' + foundKey;
          crackProgressMessage.value = finalMessage;
          crackLog.value.push(finalMessage);
        } catch (e) {
            const errorMsgText = `Ошибка в процессе взлома: ${(e as Error).message}`;
            if (crackLog.value[crackLog.value.length -1] !== errorMsgText) {
                 crackLog.value.push(errorMsgText);
            }
            throw e;
        }
      });
    };

    const setTextFromSample = (newText: string) => {
      text.value = newText;
      result.value = '';
      crackedKey.value = '';
      errorMessage.value = '';
      crackProgressMessage.value = null;
      crackLog.value = [];
      cipherOperationLog.value = [];
      clearFrequencyCharts();
    };

    return {
      text,
      key,
      result,
      crackedKey,
      errorMessage,
      isLoading,
      isCrackLoading,
      crackProgressMessage,
      crackLog,
      cipherOperationLog,
      inputFreqChartData, // Передаем в template
      outputFreqChartData, // Передаем в template
      sampleTexts,
      sampleTextsError,
      encryptText,
      decryptText,
      crackCipher,
      clearErrorOnly,
      setTextFromSample,
      handleTextLoadedFromFile,
      clearAllData, // Возвращаем новую функцию
      // Для темы
      currentTheme, 
      toggleTheme,
      antdConfigTheme,
      // Для истории
      operationHistory,
      isHistoryDrawerOpen,
      openHistoryDrawer,
      closeHistoryDrawer,
      clearOperationHistory,
      restoreStateFromHistory,
    };
  },
});
</script>

<style>
body {
  margin: 0;
  transition: background-color 0.3s ease, color 0.3s ease; 
}

body,
:root:not([data-theme='dark']) body {
  background-color: #f0f2f5; /* Фон для всей страницы - светлый */
  color: rgba(0, 0, 0, 0.85); /* Основной цвет текста - светлый */
}

.layout {
  min-height: 100vh;
  
}

/* Темная тема */
[data-theme='dark'] body {
  background-color: #141414; /* Темный фон для body */
  color: rgba(255, 255, 255, 0.85); /* Светлый текст для body */
}

</style> 