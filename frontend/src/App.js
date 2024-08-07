import './App.css';
import { useState } from 'react';
import axios from 'axios';

function App() {
  const [summaryFile, setSummaryFile] = useState(null);
  const [summary, setSummary] = useState(null);
  const [contextFile, setContextFile] = useState(null);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState(null);
  const [query, setQuery] = useState('');
  const [documents, setDocuments] = useState([]);
  const [closestDoc, setClosestDoc] = useState(null);

  const handleSummaryFileChange = (e) => {
    setSummaryFile(e.target.files[0]);
  };

  const handleContextFileChange = (e) => {
    setContextFile(e.target.files[0]);
  };

  const handleQuestionChange = (e) => {
    setQuestion(e.target.value);
  };

  const handleQueryChange = (e) => {
    setQuery(e.target.value);
  };

  const handleDocumentsChange = (e) => {
    const files = Array.from(e.target.files);
    const promises = files.map(file => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsText(file);
      });
    });

    Promise.all(promises).then(texts => setDocuments(texts));
  };

  const handleSummarizeClick = () => {
    const formData = new FormData();
    formData.append('file', summaryFile);

    axios.post('http://localhost:8000/summarize/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
      .then(res => setSummary(res.data.summary))
      .catch(err => console.error('Error:', err));
  };

  const handleQuestionClick = () => {
    const formData = new FormData();
    formData.append('file', contextFile);

    axios.post('http://localhost:8000/qa/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      params: {
        question: question
      }
    })
      .then(res => setAnswer(res.data.answer))
      .catch(err => console.error('Error:', err));
  };

  const handleSearchClick = () => {
    axios.post('http://localhost:8000/search/', {
      query: query,
      documents: documents
    })
      .then(res => setClosestDoc(res.data))
      .catch(err => console.error('Error:', err));
  };

  return (
    <div className="App">
      <header className="App-header">
        <h2>Text Summarization, Question Answering, and Smart Search</h2>

        <div className="section">
          <h3>Text Summarization</h3>
          <input type="file" accept=".txt" onChange={handleSummaryFileChange} />
          <button className="button" onClick={handleSummarizeClick}>Summarize</button>
          {summary && (
            <div className="result">
              <h3>Summary:</h3>
              <p>{summary}</p>
            </div>
          )}
        </div>

        <div className="section">
          <h3>Question Answering</h3>
          <input type="file" accept=".txt" onChange={handleContextFileChange} />
          <input
            className="input"
            type="text"
            placeholder="Ask a question"
            value={question}
            onChange={handleQuestionChange}
          />
          <button className="button" onClick={handleQuestionClick}>Ask</button>
          {answer && (
            <div className="result">
              <h3>Answer:</h3>
              <p>{answer}</p>
            </div>
          )}
        </div>

        <div className="section">
          <h3>Smart Search</h3>
          <input
            type="file"
            accept=".txt"
            multiple
            onChange={handleDocumentsChange}
          />
          <input
            className="input"
            type="text"
            placeholder="Enter your query"
            value={query}
            onChange={handleQueryChange}
          />
          <button className="button" onClick={handleSearchClick}>Search</button>
          {closestDoc && (
            <div className="result">
              <h3>Closest Document:</h3>
              <p>{closestDoc.document}</p>
              <p>Similarity: {closestDoc.similarity}</p>
            </div>
          )}
        </div>
      </header>
    </div>
  );
}

export default App;
