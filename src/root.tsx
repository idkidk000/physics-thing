import App from '@/app';
import { CanvasProvider } from '@/hooks/canvas';
import { ConfigProvider } from '@/hooks/config';
import { EventProvider } from '@/hooks/event';
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
          <App />
        </CanvasProvider>
      </ConfigProvider>
    </EventProvider>
  </StrictMode>
);
