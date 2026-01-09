import App from '@/app';
import { Sidebar } from '@/components/sidebar';
import { CanvasProvider } from '@/hooks/canvas';
import { ConfigProvider } from '@/hooks/config';
import { EventProvider } from '@/hooks/event';
import { SimulationProvider } from '@/hooks/simulation';
import '@/styles.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

const root = document.getElementById('root');
if (!root) throw new Error('could not find root node');

createRoot(root).render(
  <StrictMode>
    <EventProvider>
      <ConfigProvider>
        <CanvasProvider>
          <SimulationProvider>
            <Sidebar />
            <App />
          </SimulationProvider>
        </CanvasProvider>
      </ConfigProvider>
    </EventProvider>
  </StrictMode>
);
