// Русский алфавит без буквы "ё"
const alphabet = "абвгдежзийклмнопрстуфхцчшщъыьэюя";

// Частотный анализ русского языка (в процентах)
const freqs: Record<string, number> = {
  "а": 7.64, "б": 2.01, "в": 4.38, "г": 1.72, "д": 3.09, "е": 8.95,
  "ж": 1.01, "з": 1.48, "и": 7.09, "й": 1.21, "к": 3.30, "л": 4.96,
  "м": 3.17, "н": 6.78, "о": 11.18, "п": 2.47, "р": 4.23, "с": 4.97,
  "т": 6.09, "у": 2.22, "ф": 0.21, "х": 0.95, "ц": 0.39, "ч": 1.40,
  "ш": 0.72, "щ": 0.30, "ъ": 0.02, "ы": 2.36, "ь": 1.84, "э": 0.36,
  "ю": 0.47, "я": 1.96
};

// Константы для криптоанализа
const MAX_KEY_LENGTH = 32; // Максимально допустимая длина ключа при переборе
const MIN_FACTOR = 2;      // Минимальный делитель для метода Казиского
const EPSILON = 0.0001;    // Малое число для избежания деления на ноль при хи-квадрате

// Очистка текста: приведение к нижнему регистру, замена "ё" на "е", удаление всех небукв
export function cleanText(text: string): string {
  return text
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^а-я]/g, '');
}

// Разбиение текста на группы по 5 символов — для удобства визуального восприятия
export function groupify(text: string): string {
  return text.replace(/(.{5})/g, '$1 ').trim();
}

// Шифрование по Виженеру
export function vigenereEncrypt(plain: string, key: string): string {
  let result = "";
  const keyLength = key.length;

  for (let i = 0; i < plain.length; i++) {
    const plainIndex = alphabet.indexOf(plain[i]);                 // Индекс текущей буквы текста
    const keyIndex = alphabet.indexOf(key[i % keyLength]);         // Индекс соответствующей буквы ключа (с повтором по циклу)

    if (plainIndex === -1 || keyIndex === -1) continue;            // Если символ не найден в алфавите — пропускаем

    const cipherIndex = (plainIndex + keyIndex) % alphabet.length; // Циклический сдвиг вперёд (по модулю длины алфавита)
    result += alphabet[cipherIndex];                               // Добавляем зашифрованную букву
  }

  return result;
}

// Расшифровка текста, зашифрованного по Виженеру
export function vigenereDecrypt(cipher: string, key: string): string {
  let result = "";
  const keyLength = key.length;

  for (let i = 0; i < cipher.length; i++) {
    const cipherIndex = alphabet.indexOf(cipher[i]);               // Индекс буквы из зашифрованного текста
    const keyIndex = alphabet.indexOf(key[i % keyLength]);         // Индекс буквы ключа (повторяется по кругу)

    if (cipherIndex === -1 || keyIndex === -1) continue;

    let plainIndex = cipherIndex - keyIndex;                       // Смещение назад (в отличие от шифрования)
    if (plainIndex < 0) plainIndex += alphabet.length;             // Циклический сдвиг назад

    result += alphabet[plainIndex];                                // Добавляем расшифрованную букву
  }

  return result;
}

// Взлом шифра Виженера методом Казиского + частотный анализ методом хи-квадрат
export function breakVigenere(cipher: string): { key: string, plaintext: string } {
  const cipherLength = cipher.length;
  const seen: Record<string, number> = {}; // Запоминаем триграммы и их позиции
  const distances: number[] = [];          // Расстояния между одинаковыми триграммами

  // 1. Поиск повторяющихся триграмм и расстояний между ними
  for (let i = 0; i < cipherLength - 2; i++) {
    const trigram = cipher.slice(i, i + 3); // Берём последовательность из 3 символов
    if (seen[trigram] !== undefined) {
      distances.push(i - seen[trigram]);    // Вычисляем расстояние между повторами
    }
    seen[trigram] = i;                      // Сохраняем позицию триграммы
  }

  // 2. Оценка длины ключа через делители расстояний
  let keyLength = 0;
  if (distances.length > 0) {
    const factorCounts: Record<number, number> = {}; // Счётчик частоты делителей

    // Проходим по всем расстояниям и находим их делители
    for (const distance of distances) {
      for (let factor = MIN_FACTOR; factor <= MAX_KEY_LENGTH; factor++) {
        if (distance % factor === 0) {
          factorCounts[factor] = (factorCounts[factor] || 0) + 1;
        }
      }
    }

    // Находим самый часто встречающийся делитель — предполагаемая длина ключа
    let maxCount = 0;
    for (const [lengthStr, count] of Object.entries(factorCounts)) {
      const length = parseInt(lengthStr);
      if (count > maxCount) {
        maxCount = count;
        keyLength = length;
      }
    }
  }

  // Если ничего не нашли — возвращаем пустой результат
  if (keyLength === 0) return { key: "", plaintext: "" };

  // 3. Поиск ключа по частотному анализу методом хи-квадрат
  let foundKey = "";

  // Проходим по каждой позиции ключа
  for (let offset = 0; offset < keyLength; offset++) {
    const letterCounts = new Array(alphabet.length).fill(0); // Счётчик букв в текущей группе
    let groupLength = 0;

    // Извлекаем каждый символ, относящийся к текущей позиции ключа
    for (let i = offset; i < cipherLength; i += keyLength) {
      const index = alphabet.indexOf(cipher[i]);
      if (index !== -1) {
        letterCounts[index]++;
        groupLength++;
      }
    }

    let bestChi = Infinity; // Лучшее значение хи-квадрат
    let bestShift = 0;      // Лучшее смещение — соответствует букве ключа

    // Перебираем возможные сдвиги (т.е. предполагаемые буквы ключа)
    for (let shift = 0; shift < alphabet.length; shift++) {
      let chi = 0;

      // Сравниваем наблюдаемые и ожидаемые частоты
      for (let j = 0; j < alphabet.length; j++) {
        const observed = letterCounts[(j + shift) % alphabet.length];
        const expected = (freqs[alphabet[j]] ?? 0) * groupLength / 100;

        chi += ((observed - expected) ** 2) / (expected || EPSILON); // Вычисление хи-квадрат
      }

      if (chi < bestChi) {
        bestChi = chi;
        bestShift = shift;
      }
    }

    foundKey += alphabet[bestShift]; // Добавляем найденную букву ключа
  }

  // Расшифровываем текст с найденным ключом
  return {
    key: foundKey,
    plaintext: vigenereDecrypt(cipher, foundKey)
  };
}
