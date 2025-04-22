export const ALPHABET_RU = 'абвгдежзийклмнопрстуфхцчшщьъыэюя';

const RUSSIAN_LETTER_FREQ: Record<string, number> = {
    'а': 0.062, 'б': 0.014, 'в': 0.038, 'г': 0.013, 'д': 0.025,
    'е': 0.072, 'ж': 0.007, 'з': 0.016, 'и': 0.062, 'й': 0.010,
    'к': 0.028, 'л': 0.035, 'м': 0.026, 'н': 0.053, 'о': 0.090,
    'п': 0.023, 'р': 0.040, 'с': 0.045, 'т': 0.053, 'у': 0.021,
    'ф': 0.002, 'х': 0.009, 'ц': 0.003, 'ч': 0.012, 'ш': 0.006,
    'щ': 0.003, 'ъ': 0.007, 'ы': 0.016, 'ь': 0.007, 'э': 0.003, 'ю': 0.006, 'я': 0.018
};

const normalize = (text: string, alphabet: string): string =>
    text.toLowerCase()
        .replace(/ё/g, 'е')
        .replace(/[^а-я]/g, '')
        .split('')
        .filter(c => alphabet.includes(c))
        .join('');

const charIndex = (char: string, alphabet: string) => {
    const idx = alphabet.indexOf(char);
    if (idx === -1) throw new Error(`Invalid character: '${char}'`);
    return idx;
};

function vigenere(text: string, key: string, encrypt = true, alphabet = ALPHABET_RU): string {
    text = normalize(text, alphabet);
    key = normalize(key, alphabet);

    return text.split('').map((char, i) => {
        const shift = charIndex(key[i % key.length], alphabet);
        const textIdx = charIndex(char, alphabet);
        const newIndex = encrypt
            ? (textIdx + shift) % alphabet.length
            : (textIdx - shift + alphabet.length) % alphabet.length;
        return alphabet[newIndex];
    }).join('');
}

export const vigenereEncrypt = (text: string, key: string) => vigenere(text, key, true);
export const vigenereDecrypt = (text: string, key: string) => vigenere(text, key, false);

function getFrequencies(text: string, alphabet: string): Record<string, number> {
    const freq: Record<string, number> = {};
    for (const char of text) {
        if (alphabet.includes(char)) {
            freq[char] = (freq[char] || 0) + 1;
        }
    }

    const total = text.length;
    for (const char in freq) {
        freq[char] /= total;
    }

    return freq;
}

function splitTextByKeyLength(text: string, keyLength: number): string[] {
    return Array.from({ length: keyLength }, (_, i) =>
        text.split('').filter((_, j) => j % keyLength === i).join('')
    );
}

function indexOfCoincidence(text: string, alphabet: string): number {
    const freq = getFrequencies(text, alphabet);
    const n = text.length;

    const sum = Object.values(freq).reduce((acc, f) => acc + f * (n * f - 1), 0);
    return sum / (n - 1);
}

function findKeyLength(text: string, alphabet: string): number {
    if (text.length < 30) return 1;

    const distances: { keyLength: number; averageIC: number }[] = [];
    const maxKeyLength = 20;

    for (let keyLength = 1; keyLength <= maxKeyLength; keyLength++) {
        const substrings = splitTextByKeyLength(text, keyLength);
        const icValues: number[] = substrings.map(substring =>
            indexOfCoincidence(substring, alphabet)
        );
        const averageIC = icValues.reduce((acc, value) => acc + value, 0) / icValues.length;

        distances.push({ keyLength, averageIC });
    }

    console.log('Key length candidates:', distances);

    distances.sort((a, b) => {
        const weightA = a.averageIC / a.keyLength;
        const weightB = b.averageIC / b.keyLength;
        return weightB - weightA;
    });

    return distances[0].keyLength;
}

export function TryToFindRightKey(text: string, alphabet: string): string {
    text = normalize(text, alphabet);
    const keyLength = findKeyLength(text, alphabet);
    const substrings = splitTextByKeyLength(text, keyLength);

    return substrings.map(sub => {
        const freqs = getFrequencies(sub, alphabet);
        let bestShift = 0, minDiff = Infinity;

        for (let shift = 0; shift < alphabet.length; shift++) {
            const diff = alphabet.split('').reduce((acc, char, i) => {
                const shifted = alphabet[(i + shift) % alphabet.length];
                const fi = freqs[char] || 0;
                const pi = RUSSIAN_LETTER_FREQ[shifted] || 0;
                return acc + Math.pow(fi - pi, 2);
            }, 0);

            if (diff < minDiff) {
                minDiff = diff;
                bestShift = shift;
            }
        }

        return alphabet[bestShift];
    }).join('');
}

export const groupText = (text: string): string =>
    text.match(/.{1,5}/g)?.join(' ') || '';

export const validateInput = (text: string, key: string): void => {
    if (!text.trim() || !key.trim()) {
        throw new Error('Text and key cannot be empty.');
    }
};
