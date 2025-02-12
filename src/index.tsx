import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import * as serviceWorker from './serviceWorker';

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('root')
);

// Register service worker for PWA functionality
serviceWorker.register({
  onSuccess: (registration) => {
    console.log('PWA registration successful');
  },
  onUpdate: (registration) => {
    console.log('New content is available; please refresh.');
  },
});
