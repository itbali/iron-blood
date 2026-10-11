import { createRoot } from 'react-dom/client';
import './ui/styles.css';
import { App } from './ui/App';
import { ServicesProvider, createServices } from './ui/services';

const services = createServices();

createRoot(document.getElementById('root')!).render(
  <ServicesProvider value={services}>
    <App />
  </ServicesProvider>,
);
