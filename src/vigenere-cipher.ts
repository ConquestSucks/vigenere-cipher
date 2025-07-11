export const ALPHABET = 'абвгдежзийклмнопрстуфхцчшщъыьэюя';
const N = ALPHABET.length;

// Паттерн для проверки, что строка содержит только кириллические буквы (включая ёЁ) и пробелы
const CYRILLIC_OR_SPACE_PATTERN = /^[а-яА-ЯёЁ\s]+$/;

// Функция для проверки на кириллические символы и пробелы
function checkCyrillicAndSpaces(text: string, fieldName: string): void {
  if (text.length > 0 && !CYRILLIC_OR_SPACE_PATTERN.test(text)) {
    throw new Error(`Поле "${fieldName}" может содержать только русские буквы. Другие символы (цифры, знаки препинания и т.д.) не допускаются.`);
  }
}

export interface CipherStepDetail {
  step: number;                 // Порядковый номер символа в тексте (1-based)
  originalChar: string;         // Исходный символ текста
  originalCharIndex: number;    // Индекс исходного символа в алфавите
  keyChar: string;              // Соответствующий символ ключа
  keyCharIndex: number;         // Индекс символа ключа в алфавите
  processedChar: string;        // Результирующий символ (шифротекст или открытый текст)
  processedCharIndex: number;   // Индекс результирующего символа в алфавите
  operationType: 'encrypt' | 'decrypt'; // Тип операции
  formula: string;              // Примененная формула (например, "(Po + Ko) % N = Co")
}

// Результат операции шифрования/дешифрования
export interface CipherResult {
  processedText: string;        // Обработанный текст (сгруппированный по 5 символов)
  details: CipherStepDetail[];  // Массив деталей по каждому шагу
}

export function preprocess(input: string): string {
  // Предполагается, что input уже прошел checkCyrillicAndSpaces
  let text = input.toLowerCase();
  // Сначала «Ё» → «е»
  text = text.replace(/ё/g, 'е');
  // Удаляем все пробелы
  text = text.replace(/\s+/g, '');
  // Убираем всё, что не [а-я] (соответствует ALPHABET после предыдущих преобразований)
  text = text.replace(/[^а-я]/g, '');
  return text;
}

export function validateText(text: string) {
  if (!text || text.length === 0) {
    throw new Error('Текст не должен быть пустым.');
  }
}

export function validateKey(key: string) {
  if (!key || key.length === 0) { 
    throw new Error('Ключ не должен быть пустым.');
  }
}

export function groupByFive(text: string): string {
  return text.replace(/(.{5})(?=.)/g, '$1 ');
}

export function encryptVigenere(rawPlain: string, rawKey: string): CipherResult {
  checkCyrillicAndSpaces(rawKey, "ключ");

  const plaintext = preprocess(rawPlain);
  validateText(plaintext);

  const key = preprocess(rawKey);
  validateKey(key);

  let cipher = '';
  const details: CipherStepDetail[] = [];

  for (let i = 0; i < plaintext.length; i++) {
    const originalChar = plaintext[i];
    const originalCharIndex = ALPHABET.indexOf(originalChar);
    const currentKeyChar = key[i % key.length];
    const keyCharIndex = ALPHABET.indexOf(currentKeyChar);
    
    const processedCharIndex = (originalCharIndex + keyCharIndex) % N;
    const processedChar = ALPHABET[processedCharIndex];
    cipher += processedChar;

    details.push({
      step: i + 1,
      originalChar,
      originalCharIndex,
      keyChar: currentKeyChar,
      keyCharIndex,
      processedChar,
      processedCharIndex,
      operationType: 'encrypt',
      formula: `(${originalCharIndex} + ${keyCharIndex}) % ${N} = ${processedCharIndex}`,
    });
  }
  return {
    processedText: groupByFive(cipher),
    details,
  };
}

export function decryptVigenere(rawCipher: string, rawKey: string): CipherResult {
  checkCyrillicAndSpaces(rawKey, "ключ");

  const ciphertext = preprocess(rawCipher);
  validateText(ciphertext);

  const key = preprocess(rawKey);
  validateKey(key);

  let text = '';
  const details: CipherStepDetail[] = [];

  for (let i = 0; i < ciphertext.length; i++) {
    const originalChar = ciphertext[i]; // Здесь originalChar - это символ шифртекста
    const originalCharIndex = ALPHABET.indexOf(originalChar);
    const currentKeyChar = key[i % key.length];
    const keyCharIndex = ALPHABET.indexOf(currentKeyChar);

    const processedCharIndex = (originalCharIndex - keyCharIndex + N) % N;
    const processedChar = ALPHABET[processedCharIndex]; // Здесь processedChar - это символ расшифрованного текста
    text += processedChar;

    details.push({
      step: i + 1,
      originalChar,
      originalCharIndex,
      keyChar: currentKeyChar,
      keyCharIndex,
      processedChar,
      processedCharIndex,
      operationType: 'decrypt',
      formula: `(${originalCharIndex} - ${keyCharIndex} + ${N}) % ${N} = ${processedCharIndex}`,
    });
  }
  return {
    processedText: groupByFive(text),
    details,
  };
}

// Новая функция для подсчета частот символов в тексте
export function calculateCharacterFrequencies(text: string): Record<string, number> {
  const cleanText = preprocess(text); // Используем ту же предобработку
  const frequencies: Record<string, number> = {};
  const textLength = cleanText.length;

  if (textLength === 0) {
    // Если текст пуст после очистки, возвращаем нулевые частоты для всех букв алфавита
    for (const char of ALPHABET) {
      frequencies[char] = 0;
    }
    return frequencies;
  }

  const counts: Record<string, number> = {};
  for (const char of ALPHABET) {
    counts[char] = 0; // Инициализируем счетчики для всех букв алфавита
  }

  for (let i = 0; i < textLength; i++) {
    const char = cleanText[i];
    if (ALPHABET.includes(char)) {
      counts[char]++;
    }
  }

  for (const char of ALPHABET) {
    frequencies[char] = counts[char] / textLength;
  }

  return frequencies;
} 