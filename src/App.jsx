import './App.css';
import { useState } from 'react';
import { ALPHABET_RU, validateInput, vigenereEncrypt, vigenereDecrypt, TryToFindRightKey, groupText } from './utils/vigenere';

function App() {
  const [text, setText] = useState('');
  const [key, setKey] = useState('');
  const [encrypted, setEncrypted] = useState('');
  const [decrypted, setDecrypted] = useState('');
  const [predictKey, setPredictKey] = useState('');
  const [error, setError] = useState('');

  const handleEncrypt = () => {
    try {
      validateInput(text, key, ALPHABET_RU);
      setEncrypted(vigenereEncrypt(text, key));
      setDecrypted('');
      setError('');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDecrypt = () => {
    try {
      validateInput(text, key, ALPHABET_RU);
      setDecrypted(vigenereDecrypt(encrypted, key));
      setError('');
    } catch (err) {
      setError(err.message);
    }
  };

  const handlePredict = async () => {
    try {
      setPredictKey('');
      const key = await TryToFindRightKey(encrypted, ALPHABET_RU);
      setPredictKey(key);
      setError('');
    } catch (err) {
      setError('Error during predict: ' + err.message);
    }
  };

  return (
    <div>
      <h1>Vigenère Cipher</h1>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <div>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Text"
          style={{ width: '300px' }}
        />
      </div>
      <div>
        <input
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="Key"
          style={{ width: '300px' }}
        />
      </div>
      <div>
        <button onClick={handleEncrypt}>Encrypt</button>
        <button onClick={handleDecrypt}>Decrypt</button>
        <button onClick={handlePredict}>Predict key</button>
      </div>
      <div>
        <p>Encrypted: {groupText(encrypted)}</p>
        <p>Decrypted: {groupText(decrypted)}</p>
        <p>Predict key: {predictKey}</p>
      </div>
    </div>
  );
}

export default App;
