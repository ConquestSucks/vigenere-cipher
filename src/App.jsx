import './App.css';
import { useState } from 'react';
import {
  cleanText,
  groupify,
  vigenereEncrypt,
  vigenereDecrypt,
  breakVigenere,
} from './utils/vigenere';

function App() {
  const [text, setText] = useState('');
  const [key, setKey] = useState('');
  const [output, setOutput] = useState('');
  const [predictedKey, setPredictedKey] = useState('');
  const [error, setError] = useState('');

  const handleEncrypt = () => {
    const plain = cleanText(text);
    const plainKey = cleanText(key);
    if (!plain || !plainKey) return setError('Введите текст и ключ.');

    const encrypted = vigenereEncrypt(plain, plainKey);
    setOutput(groupify(encrypted));
    setPredictedKey('');
    setError('');
  };

  const handleDecrypt = () => {
    const cipher = cleanText(text);
    const plainKey = cleanText(key);
    if (!cipher || !plainKey) return setError('Введите текст и ключ.');

    const decrypted = vigenereDecrypt(cipher, plainKey);
    setOutput(groupify(decrypted));
    setPredictedKey('');
    setError('');
  };

  const handlePredict = () => {
    const cipher = cleanText(text);
    if (!cipher || cipher.length < 10)
      return setError('Введите зашифрованный текст (минимум 10 символов).');

    const { key: foundKey, plaintext } = breakVigenere(cipher);
    if (!foundKey) return setError('Не удалось взломать текст.');

    setOutput(groupify(plaintext));
    setPredictedKey(foundKey);
    setError('');
  };

  return (
    <div className='container'>
      <h1>Vigenère Cipher</h1>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <div className='inputs'>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Введите текст"
          rows={4}
        />
        <input
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="Введите ключ"
        />
      </div>
      <div>
        <button onClick={handleEncrypt}>Зашифровать</button>
        <button onClick={handleDecrypt}>Расшифровать</button>
        <button onClick={handlePredict}>Взломать</button>
      </div>
      <div>
        <h3>Результат:</h3>
        <textarea
          value={output}
          readOnly
          rows={4}
        />
        {predictedKey && (
          <p>
            <strong>Найденный ключ:</strong> {predictedKey}
          </p>
        )}
      </div>
    </div>
  );
}

export default App;
