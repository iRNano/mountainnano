import type { RouteObject } from 'react-router-dom';
import { LandingPage } from '../pages/LandingPage';
import { DemoEntryPage } from '../pages/DemoEntryPage';
import { VisualizationPage } from '../pages/VisualizationPage';

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <LandingPage />,
  },
  {
    path: '/demo',
    element: <DemoEntryPage />,
  },
  {
    path: '/visualization',
    element: <VisualizationPage />,
  },
];

