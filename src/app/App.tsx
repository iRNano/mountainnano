import React from 'react';
import { useRoutes } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { routes } from './routes';

const App: React.FC = () => {
  const element = useRoutes(routes);

  return <AppLayout>{element}</AppLayout>;
};

export default App;

