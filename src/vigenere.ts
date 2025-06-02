
export const ALPHABET = 'абвгдежзийклмнопрстуфхцчшщъыьэюя';
const M = ALPHABET.length;

const rawFreq: Record<string, number> = {
  а: 6.2, б: 1.4, в: 3.8, г: 1.3, д: 2.5, е: 7.2,
  ж: 0.7, з: 1.6, и: 6.2, й: 1.0, к: 2.8, л: 3.5,
  м: 2.6, н: 5.3, о: 9.0, п: 2.3, р: 4.0, с: 4.5,
  т: 5.3, у: 2.1, ф: 0.2, х: 0.9, ц: 0.3, ч: 1.2,
  ш: 0.6, щ: 0.3, ъ: 1.4, ы: 1.6, ь: 1.4, э: 0.3,
  ю: 0.6, я: 1.8,
};

const sumRaw = Object.values(rawFreq).reduce((a, b) => a + b, 0);
export const frequency: Record<string, number> = {};
for (const ch of ALPHABET) {
  frequency[ch] = rawFreq[ch] / sumRaw;
}

export function preprocess(input: string): string {
  let s = input.toLowerCase().replace(/ё/g, 'е');
  s = s.replace(/[^а-я]+/g, '');
  return s;
}

function validateText(text: string) {
  if (!text || text.length < 1) {
    throw new Error('Текст пуст или не содержит букв а–я.');
  }
}

function averageIOC(clean: string, keyLen: number): number {
  const parts: string[] = Array.from({ length: keyLen }, () => '');
  for (let i = 0; i < clean.length; i++) {
    parts[i % keyLen] += clean[i];
  }
  const iocs = parts.map(part => {
    const freqMap: Record<string, number> = {};
    for (const c of part) {
      freqMap[c] = (freqMap[c] || 0) + 1;
    }
    const L = part.length;
    if (L < 2) return 0;
    let sum = 0;
    for (const cnt of Object.values(freqMap)) {
      sum += cnt * (cnt - 1);
    }
    return sum / (L * (L - 1));
  });
  return iocs.reduce((a, b) => a + b, 0) / keyLen;
}

export function findRepeats(message: string, seqLens: number[] = [3, 4, 5]): Record<string, number[]> {
  validateText(message);
  const sequences: Record<string, number[]> = {};
  const n = message.length;

  for (const seqLength of seqLens) {
    if (seqLength > n) continue;
    const positionsForGram: Record<string, number[]> = {};
    for (let i = 0; i <= n - seqLength; i++) {
      const gram = message.substr(i, seqLength);
      if (!positionsForGram[gram]) positionsForGram[gram] = [];
      positionsForGram[gram].push(i);
    }
    for (const gram in positionsForGram) {
      const pos = positionsForGram[gram];
      if (pos.length < 2) continue;
      for (let i = 0; i < pos.length; i++) {
        for (let j = i + 1; j < pos.length; j++) {
          const dist = pos[j] - pos[i];
          if (!sequences[gram]) sequences[gram] = [];
          sequences[gram].push(dist);
        }
      }
    }
  }

  return sequences;
}

export function findKeyLength(
  sequences: Record<string, number[]>,
  maxLen = 20,
  threshold = 0.5
): number[] {
  const allDistances: number[] = [];
  for (const dists of Object.values(sequences)) {
    allDistances.push(...dists);
  }
  if (allDistances.length === 0) {
    return []; 
  }

  const scores: Record<number, number> = {};
  for (let candidate = 2; candidate <= maxLen; candidate++) {
    let countDiv = 0;
    for (const d of allDistances) {
      if (d % candidate === 0) countDiv++;
    }
    scores[candidate] = countDiv / allDistances.length;
  }

  const filtered = Object.entries(scores)
    .filter(([, ratio]) => ratio >= threshold)
    .sort((a, b) => b[1] - a[1])
    .map(([len]) => Number(len));
  return filtered;
}

export async function findKey(
  message: string,
  keyLen: number,
  onProgress?: (charIndex: number, totalChars: number, currentKeyProgress: string) => Promise<void>
): Promise<string> {
  validateText(message);
  let key = '';
  const n = message.length;

  for (let pos = 0; pos < keyLen; pos++) {
    const positionalCounts: Record<string, Record<string, number>> = {};
    const scores: Record<string, number> = {};

    for (const kLetter of ALPHABET) {
      positionalCounts[kLetter] = {};
      scores[kLetter] = 0;
      for (const pLetter of ALPHABET) {
        positionalCounts[kLetter][pLetter] = 0;
      }
    }

    for (let i = pos; i < n; i += keyLen) {
      const c = message[i];
      const row = ALPHABET.indexOf(c);
      if (row < 0) continue;
      for (const kLetter of ALPHABET) {
        const col = ALPHABET.indexOf(kLetter);
        const plain = ALPHABET[(row - col + M) % M];
        positionalCounts[kLetter][plain] += 1;
      }
    }

    for (const kLetter of ALPHABET) {
      for (const pLetter of ALPHABET) {
        scores[kLetter] += positionalCounts[kLetter][pLetter] * frequency[pLetter];
      }
    }

    const best = Object.keys(scores).reduce((a, b) => (scores[a] > scores[b] ? a : b));
    key += best;
    if (onProgress) {
      await onProgress(pos, keyLen, key); 
    }
  }

  return key;
}

export async function kasiskiAttack(
  messageRaw: string,
  onProgress?: (message: string) => void
): Promise<string> {
  const reportProgress = async (message: string) => {
    if (onProgress) {
      onProgress(message);
    }
    await new Promise(resolve => setTimeout(resolve, 150));
  };

  await reportProgress('Шаг 1/4: Предобработка текста...');
  if (typeof messageRaw !== 'string') {
    console.error('kasiskiAttack: messageRaw не является строкой перед preprocess:', messageRaw);
    throw new Error('Внутренняя ошибка: тип входных данных для анализа некорректен.');
  }
  const clean = preprocess(messageRaw);
  try {
    validateText(clean);
  } catch (e: any) {
    await reportProgress(`Ошибка предобработки: ${e.message}`);
    throw e;
  }

  await reportProgress('Шаг 2/4: Поиск повторений n-грамм (3,4,5 символов)...');
  const repeats = findRepeats(clean, [3, 4, 5]);

  await reportProgress('Шаг 3/4: Определение возможных длин ключа...');
  const candidates = findKeyLength(repeats, 20, 0.5);

  let chosenLen: number | null = null;
  if (candidates.length > 0) {
    await reportProgress(`Шаг 3.1/4: Найдено ${candidates.length} кандидат(ов) длины ключа. Уточнение по индексу совпадений...`);
    let bestIoc = -1;
    for (let i = 0; i < candidates.length; i++) {
      const L = candidates[i];
      await reportProgress(`Шаг 3.1.${i + 1}/4: Проверка длины ${L} (кандидат ${i + 1}/${candidates.length})...`);
      const ioc = averageIOC(clean, L);
      if (ioc > bestIoc) {
        bestIoc = ioc;
        chosenLen = L;
      }
    }
  } else {
    await reportProgress('Шаг 3.1/4: Кандидаты по n-граммам не найдены. Поиск длины по индексу совпадений (перебор длин 2-20)...');
    let bestIoc = -1;
    const maxLenToTry = Math.min(20, Math.max(1, Math.floor(clean.length / 2) - 1));
    if (clean.length < 4) {
      await reportProgress('Текст слишком короткий для надежного определения длины ключа перебором IOC. Попытка с длиной 1.');
      chosenLen = 1;
    } else if (maxLenToTry < 2 && clean.length >= 4) {
      await reportProgress('Не удалось определить диапазон длин для перебора IOC. Попытка с длиной 1.');
      chosenLen = 1;
    } else {
      for (let L = 2; L <= maxLenToTry; L++) {
        await reportProgress(`Шаг 3.1.${L - 1}/4: Проверка длины ${L} (перебор ${L - 1}/${maxLenToTry - 1})...`);
        const ioc = averageIOC(clean, L);
        if (ioc > bestIoc) {
          bestIoc = ioc;
          chosenLen = L;
        }
      }
    }
  }

  if (chosenLen === null) {
    await reportProgress('Ошибка: Не удалось определить длину ключа. Попробуйте более длинный текст.');
    throw new Error('Не удалось определить длину ключа. Попробуйте более длинный текст.');
  }
  await reportProgress(`Шаг 3.2/4: Выбрана предполагаемая длина ключа: ${chosenLen}.`);

  await reportProgress('Шаг 4/4: Подбор символов ключа...');
  const finalKey = await findKey(clean, chosenLen, async (charIndex, totalChars, currentKeyProgress) => {
    await reportProgress(`Шаг 4/4: Подбор символов ключа (${charIndex + 1}/${totalChars}): ${currentKeyProgress.padEnd(totalChars, '○')}`);
  });

  await reportProgress('Процесс взлома завершен. Найден ключ: ' + finalKey);
  return finalKey;
}